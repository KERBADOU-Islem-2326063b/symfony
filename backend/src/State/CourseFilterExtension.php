<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Course;
use App\Entity\User;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\AsDecorator;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

#[AsDecorator(decorates: 'api_platform.doctrine.orm.state.collection_provider')]
final class CourseFilterExtension implements ProviderInterface
{
    public function __construct(
        private readonly ProviderInterface $inner,
        private readonly Security $security,
    ) {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $result = $this->inner->provide($operation, $uriVariables, $context);

        if ($operation->getClass() !== Course::class) {
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
                // Les professeurs voient uniquement leurs propres cours
                return array_filter($result, function ($course) use ($user) {
                    return $course instanceof Course && $course->getTeacher() === $user;
                });
            } else {
                // Les étudiants voient tous les cours disponibles
                return array_filter($result, function ($course) {
                    return $course instanceof Course;
                });
            }
        }

        // Pour un cours individuel
        if ($result instanceof Course) {
            if ($isTeacher) {
                // Les professeurs peuvent voir uniquement leurs propres cours
                if ($result->getTeacher() !== $user) {
                    return null;
                }
            }
            // Les étudiants peuvent voir tous les cours
            return $result;
        }

        return $result;
    }
}
