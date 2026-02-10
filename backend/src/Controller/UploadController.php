<?php

namespace App\Controller;

use App\Entity\Quiz;
use App\Entity\Question;
use App\Entity\Response as QuizResponse;
use App\Service\DocumentTextExtractor;
use App\Service\MistralClient;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/uploads', name: 'uploads_')]
class UploadController extends AbstractController
{
    private const DOCUMENT_EXTENSIONS = ['pdf'];

    private string $uploadDir;

    public function __construct(
        KernelInterface $kernel,
        private readonly DocumentTextExtractor $documentTextExtractor,
        private readonly MistralClient $mistralClient,
        private readonly EntityManagerInterface $entityManager,
    ) {
        $this->uploadDir = $kernel->getProjectDir() . '/var/uploads';
    }

    #[Route('/documents', name: 'documents_list', methods: ['GET'])]
    public function listDocuments(): JsonResponse
    {
        $files = $this->listFilesByExtensions(self::DOCUMENT_EXTENSIONS);

        return $this->json([
            'count' => \count($files),
            'files' => $files,
        ]);
    }

    #[Route('/quiz/document/{filename}', name: 'quiz_from_document', methods: ['POST'])]
    public function generateQuizFromDocument(string $filename): JsonResponse
    {
        $filePath = $this->getFilePath($filename, self::DOCUMENT_EXTENSIONS);
        if ($filePath === null) {
            return $this->json(
                ['error' => 'Document introuvable ou extension non supportée.'],
                Response::HTTP_NOT_FOUND
            );
        }

        try {
            $text = $this->documentTextExtractor->extractText($filePath);
            $quizData = $this->mistralClient->generateQuizFromContent($text, $filename, 'document');
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
        $quizTitle = \is_string($quizData['title'] ?? null) && $quizData['title'] !== ''
            ? $quizData['title']
            : sprintf('QCM généré à partir de %s', $filename);
        $quiz->setTitle($quizTitle);

        $user = $this->getUser();
        if ($user !== null && $user instanceof \App\Entity\User) {
            $quiz->setTeacher($user);
        }

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

    /**
     * Retourne la liste des fichiers dans var/uploads filtrés par extensions.
     *
     * @param string[] $extensions
     *
     * @return array<int, array<string, string|int>>
     */
    private function listFilesByExtensions(array $extensions): array
    {
        $result = [];

        if (!is_dir($this->uploadDir)) {
            return $result;
        }

        $dirHandle = opendir($this->uploadDir);
        if ($dirHandle === false) {
            return $result;
        }

        while (($entry = readdir($dirHandle)) !== false) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }

            $fullPath = $this->uploadDir . DIRECTORY_SEPARATOR . $entry;
            if (!is_file($fullPath)) {
                continue;
            }

            $extension = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
            if (!\in_array($extension, $extensions, true)) {
                continue;
            }

            $result[] = [
                'name' => $entry,
                'extension' => $extension,
                'size' => filesize($fullPath) ?: 0,
            ];
        }

        closedir($dirHandle);

        return $result;
    }

    /**
     * Renvoie le chemin absolu du fichier si présent dans var/uploads et d'extension autorisée.
     *
     * @param string[] $allowedExtensions
     */
    private function getFilePath(string $filename, array $allowedExtensions): ?string
    {
        // On évite les chemins relatifs suspects
        if (str_contains($filename, '..') || str_contains($filename, DIRECTORY_SEPARATOR)) {
            return null;
        }

        $fullPath = $this->uploadDir . DIRECTORY_SEPARATOR . $filename;
        if (!is_file($fullPath)) {
            return null;
        }

        $extension = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
        if (!\in_array($extension, $allowedExtensions, true)) {
            return null;
        }

        return $fullPath;
    }
}

