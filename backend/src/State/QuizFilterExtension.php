<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Quiz;
use App\Entity\User;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\AsDecorator;

#[AsDecorator(decorates: 'api_platform.doctrine.orm.state.collection_provider')]
final class QuizFilterExtension implements ProviderInterface
{
    public function __construct(
        private readonly ProviderInterface $inner,
        private readonly Security $security,
    ) {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $result = $this->inner->provide($operation, $uriVariables, $context);

        if ($operation->getClass() !== Quiz::class) {
            return $result;
        }

        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return [];
        }

        // Vérifier si l'utilisateur est un professeur ou un étudiant
        $isTeacher = in_array('ROLE_TEACHER', $user->getRoles(), true);

        // Si c'est une collection
        if (is_array($result)) {
            if ($isTeacher) {
                // Les professeurs voient uniquement leurs propres quiz
                return array_filter($result, function ($quiz) use ($user) {
                    return $quiz instanceof Quiz && $quiz->getTeacher() === $user;
                });
            } else {
                // Les étudiants voient tous les quiz (associés aux cours qu'ils peuvent voir)
                return array_filter($result, function ($quiz) {
                    return $quiz instanceof Quiz;
                });
            }
        }

        // Pour un quiz individuel
        if ($result instanceof Quiz) {
            if ($isTeacher) {
                // Les professeurs peuvent voir uniquement leurs propres quiz
                if ($result->getTeacher() !== $user) {
                    return null;
                }
            }
            // Les étudiants peuvent voir tous les quiz
            return $result;
        }

        return $result;
    }
}
