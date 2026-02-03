<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use App\Repository\QuestionAttemptRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: QuestionAttemptRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Post(),
        new Get(),
        new Put(),
        new Patch(),
        new Delete(),
    ],
    normalizationContext: ['groups' => 'questionAttempt:read'],
    denormalizationContext: ['groups' => 'questionAttempt:write'],
)]
class QuestionAttempt
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column]
    #[Groups(['questionAttempt:read', 'questionAttempt:write'])]
    private ?bool $answeredCorrectly = null;

    #[ORM\ManyToOne]
    #[Groups(['questionAttempt:read', 'questionAttempt:write'])]
    private ?Question $question = null;

    #[ORM\ManyToOne(inversedBy: 'questionAttempts')]
    #[Groups(['questionAttempt:read', 'questionAttempt:write', 'quizAttempt:read', 'quizAttempt:write'])]
    private ?QuizAttempt $quizAttempt = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function isAnsweredCorrectly(): ?bool
    {
        return $this->answeredCorrectly;
    }

    public function setAnsweredCorrectly(bool $answeredCorrectly): static
    {
        $this->answeredCorrectly = $answeredCorrectly;

        return $this;
    }

    public function getQuestion(): ?Question
    {
        return $this->question;
    }

    public function setQuestion(?Question $question): static
    {
        $this->question = $question;

        return $this;
    }

    public function getQuizAttempt(): ?QuizAttempt
    {
        return $this->quizAttempt;
    }

    public function setQuizAttempt(?QuizAttempt $quizAttempt): static
    {
        $this->quizAttempt = $quizAttempt;

        return $this;
    }
}
