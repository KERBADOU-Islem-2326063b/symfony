<?php

namespace App\Controller;

use App\Entity\Course;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

final class CourseUploadController extends AbstractController
{
    const string PATH_TO_SAVE_FILES = __DIR__.'/../../var/uploads';

    const array ALLOWED_MIME_TYPES = [
        'application/pdf' => 'pdf',
        'video/mp4' => 'mp4',
    ];


    public function __invoke(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $name = $request->request->get('name');
        $file = $request->files->get('file');

        if (!$name || !$file) {
            return new JsonResponse(
                ['error' => 'name and file are required'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $mimeType = $file->getMimeType();

        if (!array_key_exists($mimeType, self::ALLOWED_MIME_TYPES)) {
            return new JsonResponse(
                ['error' => 'only PDF or MP4 allowed'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $extension = self::ALLOWED_MIME_TYPES[$mimeType];
        $uniqueId = bin2hex(random_bytes(8));
        $filename = 'course_' .$uniqueId. '.'.$extension;

        $file->move(
            $this->getParameter('files_directory'),
            $filename
        );

        $course = new Course();
        $course->setName($name);
        $course->setFileName($filename);

        $em->persist($course);
        $em->flush();

        return new JsonResponse([
            'id' => $course->getId(),
            'name' => $course->getName(),
            'file' => $filename,
        ], Response::HTTP_CREATED);
    }
}
