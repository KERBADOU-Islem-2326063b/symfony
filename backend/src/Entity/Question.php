<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use App\Repository\QuestionRepository;
use App\State\UserPasswordHasher;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

#[ORM\Entity(repositoryClass: QuestionRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Post(),
        new Get(),
        new Put(),
        new Patch(),
        new Delete(),
    ],
    normalizationContext: ['groups' => 'question:read'],
    denormalizationContext: ['groups' => 'question:write'],
)]
class Question
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    /**
     * @var Collection<int, Response>
     */
    #[ORM\OneToMany(targetEntity: Response::class, mappedBy: 'question', cascade: ['persist'])]
    #[Groups(['question:read', 'question:write', 'quiz:read', 'quiz:write', 'questionAttempt:read', 'quizAttempt:read'])]
    private Collection $possible_responses;

    #[ORM\Column(length: 255)]
    #[Groups(['question:read', 'question:write', 'quiz:read', 'quiz:write', 'questionAttempt:read', 'quizAttempt:read'])]
    private ?string $content = null;

    #[ORM\ManyToOne(inversedBy: 'questions')]
    #[Groups(['question:read', 'question:write'])]
    private ?Quiz $quiz = null;

    public function __construct()
    {
        $this->possible_responses = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    /**
     * @return Collection<int, Response>
     */
    public function getPossibleResponses(): Collection
    {
        return $this->possible_responses;
    }

    public function addPossibleResponse(Response $possibleResponse): static
    {
        if (!$this->possible_responses->contains($possibleResponse)) {
            $this->possible_responses->add($possibleResponse);
            $possibleResponse->setQuestion($this);
        }

        return $this;
    }

    public function removePossibleResponse(Response $possibleResponse): static
    {
        if ($this->possible_responses->removeElement($possibleResponse)) {
            // set the owning side to null (unless already changed)
            if ($possibleResponse->getQuestion() === $this) {
                $possibleResponse->setQuestion(null);
            }
        }

        return $this;
    }

    public function getContent(): ?string
    {
        return $this->content;
    }

    public function setContent(string $content): static
    {
        $this->content = $content;

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
}
