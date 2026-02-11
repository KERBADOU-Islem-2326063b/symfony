<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use App\Repository\QuizAttemptRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: QuizAttemptRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Post(),
        new Get(),
        new Put(),
        new Patch(),
        new Delete(),
    ],
    normalizationContext: ['groups' => 'quizAttempt:read'],
    denormalizationContext: ['groups' => 'quizAttempt:write'],
)]
class QuizAttempt
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'quizAttempts')]
    #[Groups(['quizAttempt:read', 'quizAttempt:write'])]
    private ?User $student = null;

    #[ORM\Column]
    #[Groups(['quizAttempt:read', 'quizAttempt:write'])]
    private ?\DateTime $endTimestamp = null;

    #[ORM\Column]
    #[Groups(['quizAttempt:read', 'quizAttempt:write'])]
    private ?\DateTime $beginTimestamp = null;

    #[ORM\ManyToOne(inversedBy: 'quizAttempts')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['quizAttempt:read', 'quizAttempt:write'])]
    private ?Quiz $quiz = null;

    /**
     * @var Collection<int, QuestionAttempt>
     */
    #[ORM\OneToMany(targetEntity: QuestionAttempt::class, mappedBy: 'quizAttempt')]
    #[Groups(['quizAttempt:read'])]
    private Collection $questionAttempts;

    public function __construct()
    {
        $this->questionAttempts = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getStudent(): ?User
    {
        return $this->student;
    }

    public function setStudent(?User $student): static
    {
        $this->student = $student;

        return $this;
    }

    public function getEndTimestamp(): ?\DateTime
    {
        return $this->endTimestamp;
    }

    public function setEndTimestamp(\DateTime $endTimestamp): static
    {
        $this->endTimestamp = $endTimestamp;

        return $this;
    }

    public function getBeginTimestamp(): ?\DateTime
    {
        return $this->beginTimestamp;
    }

    public function setBeginTimestamp(\DateTime $beginTimestamp): static
    {
        $this->beginTimestamp = $beginTimestamp;

        return $this;
    }

    public function getQuiz(): ?Quiz
    {
        return $this->quiz;
    }

    public function setQuiz(?Quiz $quiz): static
    {
        $this->quiz = $quiz;

        return $this;
    }

    /**
     * @return Collection<int, QuestionAttempt>
     */
    public function getQuestionAttempts(): Collection
    {
        return $this->questionAttempts;
    }

    public function addQuestionAttempt(QuestionAttempt $questionAttempt): static
    {
        if (!$this->questionAttempts->contains($questionAttempt)) {
            $this->questionAttempts->add($questionAttempt);
            $questionAttempt->setQuizAttempt($this);
        }

        return $this;
    }

    public function removeQuestionAttempt(QuestionAttempt $questionAttempt): static
    {
        if ($this->questionAttempts->removeElement($questionAttempt)) {
            // set the owning side to null (unless already changed)
            if ($questionAttempt->getQuizAttempt() === $this) {
                $questionAttempt->setQuizAttempt(null);
            }
        }

        return $this;
    }
}
