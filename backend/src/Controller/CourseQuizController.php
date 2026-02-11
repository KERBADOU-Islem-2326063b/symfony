<?php

namespace App\Controller;

use App\Entity\Course;
use App\Entity\Quiz;
use App\Entity\Question;
use App\Entity\Response as QuizResponse;
use App\Entity\User;
use App\Service\DocumentTextExtractor;
use App\Service\MistralClient;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Bundle\SecurityBundle\Security;

class CourseQuizController extends AbstractController
{
    public function __construct(
        private readonly KernelInterface $kernel,
        private readonly DocumentTextExtractor $documentTextExtractor,
        private readonly MistralClient $mistralClient,
        private readonly EntityManagerInterface $entityManager,
        private readonly Security $security,
    ) {
    }

    #[Route('/api/courses/{id}/generate-quiz', name: 'courses_generate_quiz', methods: ['POST'])]
    public function generateQuizFromCourse(int $id, Request $request): JsonResponse
    {
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return $this->json(
                ['error' => 'Authentication required'],
                Response::HTTP_UNAUTHORIZED
            );
        }

        $course = $this->entityManager->getRepository(Course::class)->find($id);
        if (!$course) {
            return $this->json(
                ['error' => 'Course not found'],
                Response::HTTP_NOT_FOUND
            );
        }

        // Vérifier que l'utilisateur est le propriétaire du cours
        if ($course->getTeacher() !== $user) {
            return $this->json(
                ['error' => 'You do not have permission to generate a quiz for this course'],
                Response::HTTP_FORBIDDEN
            );
        }

        try {
            $payload = json_decode((string) $request->getContent(), true, 512, \JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            $payload = [];
        }

        $numberOfQuestions = isset($payload['numberOfQuestions']) && is_numeric($payload['numberOfQuestions'])
            ? (int) $payload['numberOfQuestions']
            : null;

        // Valider le nombre de questions (entre 1 et 50)
        if ($numberOfQuestions !== null && ($numberOfQuestions < 1 || $numberOfQuestions > 50)) {
            return $this->json(
                ['error' => 'Number of questions must be between 1 and 50'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $filePath = $this->kernel->getProjectDir() . '/var/uploads/' . $course->getFileName();
        if (!file_exists($filePath)) {
            return $this->json(
                ['error' => 'Course file not found'],
                Response::HTTP_NOT_FOUND
            );
        }

        try {
            $text = $this->documentTextExtractor->extractText($filePath);
            $quizData = $this->mistralClient->generateQuizFromContent($text, $course->getName(), 'cours', $numberOfQuestions);
        } catch (\Throwable $e) {
            return $this->json(
                ['error' => 'Erreur lors de la génération du QCM', 'details' => $e->getMessage()],
                Response::HTTP_INTERNAL_SERVER_ERROR
            );
        }

        // Vérification basique de la structure renvoyée par Mistral
        if (!\is_array($quizData) || isset($quizData['error']) || !isset($quizData['questions']) || !\is_array($quizData['questions'])) {
            return $this->json(
                [
                    'error' => 'Réponse inattendue du modèle Mistral lors de la génération du QCM.',
                    'raw' => $quizData['raw'] ?? null,
                ],
                Response::HTTP_INTERNAL_SERVER_ERROR
            );
        }

        // Création du Quiz et de ses Questions/Réponses associées
        $quiz = new Quiz();
        $quizTitle = $quizData['title'] ?? sprintf('QCM pour %s', $course->getName());
        $quiz->setTitle($quizTitle);
        $quiz->setTeacher($user);
        $quiz->setCourse($course);
        // Ajouter le quiz à la collection du cours pour que la relation inverse soit correcte
        $course->addQuiz($quiz);

        foreach ($quizData['questions'] as $questionData) {
            if (!\is_array($questionData) || !isset($questionData['question'], $questionData['choices']) || !\is_array($questionData['choices'])) {
                continue;
            }

            $question = new Question();
            $question->setContent((string) $questionData['question']);
            $question->setQuiz($quiz);
            $quiz->addQuestion($question);

            $answerIndex = isset($questionData['answer_index']) ? (int) $questionData['answer_index'] : -1;

            foreach ($questionData['choices'] as $index => $choiceText) {
                if (!\is_string($choiceText) || $choiceText === '') {
                    continue;
                }

                $response = new QuizResponse();
                $response->setContent($choiceText);
                $response->setIsCorrect($index === $answerIndex);
                $response->setQuestion($question);
                $question->addPossibleResponse($response);

                $this->entityManager->persist($response);
            }

            $this->entityManager->persist($question);
        }

        $this->entityManager->persist($quiz);
        $this->entityManager->flush();

        return $this->json(
            $quiz,
            Response::HTTP_CREATED,
            [],
            ['groups' => ['quiz:read', 'question:read', 'response:read']]
        );
    }
}
