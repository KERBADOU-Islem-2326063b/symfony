<?php

namespace App\Controller;

use App\Entity\Course;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class CourseViewController extends AbstractController
{
    public function __invoke(int $id, EntityManagerInterface $em): BinaryFileResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            throw new AccessDeniedHttpException('Authentication required');
        }

        $course = $em->getRepository(Course::class)->find($id);
        if (!$course) {
            throw new NotFoundHttpException('Course not found');
        }

        $filename = $course->getFileName();
        if (!$filename) {
            throw new NotFoundHttpException('File not found');
        }

        $path = $this->getParameter('files_directory').'/'.$filename;

        if (!file_exists($path)) {
            throw new NotFoundHttpException('File not found');
        }

        $response = new BinaryFileResponse($path);
        
        // Déterminer le type MIME
        $mimeType = mime_content_type($path);
        if ($mimeType) {
            $response->headers->set('Content-Type', $mimeType);
        }
        
        // Utiliser DISPOSITION_INLINE pour afficher dans le navigateur au lieu de télécharger
        $response->setContentDisposition(
            ResponseHeaderBag::DISPOSITION_INLINE,
            $filename
        );

        return $response;
    }
}
