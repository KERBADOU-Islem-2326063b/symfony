<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Quiz;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\AsDecorator;

#[AsDecorator(decorates: 'api_platform.doctrine.orm.state.item_provider')]
final class QuizProvider implements ProviderInterface
{
    public function __construct(
        private readonly ProviderInterface $inner,
        private readonly EntityManagerInterface $entityManager,
        private readonly Security $security,
    ) {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $result = $this->inner->provide($operation, $uriVariables, $context);

        // Si c'est un Quiz individuel, charger les questions et réponses avec un fetch join
        if ($result instanceof Quiz && $operation->getClass() === Quiz::class) {
            $quiz = $this->entityManager->getRepository(Quiz::class)
                ->createQueryBuilder('q')
                ->leftJoin('q.questions', 'questions')
                ->leftJoin('questions.possible_responses', 'responses')
                ->addSelect('questions')
                ->addSelect('responses')
                ->where('q.id = :id')
                ->setParameter('id', $result->getId())
                ->getQuery()
                ->getOneOrNullResult();

            return $quiz ?? $result;
        }

        return $result;
    }
}
