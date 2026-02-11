<?php

namespace App\Controller;

use App\Entity\Course;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Bundle\SecurityBundle\Security;

final class CourseUploadController extends AbstractController
{
    const string PATH_TO_SAVE_FILES = __DIR__.'/../../var/uploads';

    const array ALLOWED_MIME_TYPES = [
        'application/pdf' => 'pdf',
        'video/mp4' => 'mp4',
    ];

    public function __construct(
        private readonly Security $security,
    ) {
    }

    public function __invoke(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return new JsonResponse(
                ['error' => 'Authentication required'],
                Response::HTTP_UNAUTHORIZED
            );
        }

        $name = $request->request->get('name');
        $file = $request->files->get('file');

        if (!$name) {
            return new JsonResponse(
                ['error' => 'name is required'],
                Response::HTTP_BAD_REQUEST
            );
        }

        if (!$file) {
            return new JsonResponse(
                ['error' => 'file is required'],
                Response::HTTP_BAD_REQUEST
            );
        }

        // Vérifier que le fichier est valide et obtenir les détails de l'erreur
        if (!$file->isValid()) {
            $errorCode = $file->getError();
            $errorMessages = [
                UPLOAD_ERR_INI_SIZE => 'The uploaded file exceeds the upload_max_filesize directive in php.ini',
                UPLOAD_ERR_FORM_SIZE => 'The uploaded file exceeds the MAX_FILE_SIZE directive',
                UPLOAD_ERR_PARTIAL => 'The uploaded file was only partially uploaded',
                UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                UPLOAD_ERR_EXTENSION => 'A PHP extension stopped the file upload',
            ];
            
            $errorMessage = $errorMessages[$errorCode] ?? 'Unknown upload error (code: ' . $errorCode . ')';
            
            // Debug: retourner plus d'informations
            return new JsonResponse(
                [
                    'error' => 'Invalid file upload: ' . $errorMessage,
                    'debug' => [
                        'error_code' => $errorCode,
                        'client_original_name' => $file->getClientOriginalName(),
                        'client_mime_type' => $file->getClientMimeType(),
                        'client_original_extension' => $file->getClientOriginalExtension(),
                        'size' => $file->getSize(),
                        'pathname' => $file->getPathname(),
                        'is_file' => file_exists($file->getPathname()),
                    ]
                ],
                Response::HTTP_BAD_REQUEST
            );
        }

        // Obtenir le type MIME du fichier uploadé
        $mimeType = null;
        try {
            if ($file->getPathname() && file_exists($file->getPathname())) {
                $mimeType = $file->getMimeType();
            }
        } catch (\Exception $e) {
            // Ignorer l'erreur et essayer une autre méthode
        }

        // Si getMimeType() a échoué, essayer avec getClientMimeType()
        if (!$mimeType) {
            $mimeType = $file->getClientMimeType();
        }

        // Vérifier aussi l'extension du fichier original comme fallback
        $originalExtension = strtolower($file->getClientOriginalExtension());
        $extensionMap = [
            'pdf' => 'application/pdf',
            'mp4' => 'video/mp4',
        ];

        // Si le MIME type n'est pas dans la liste autorisée, vérifier l'extension
        if (!$mimeType || !array_key_exists($mimeType, self::ALLOWED_MIME_TYPES)) {
            if (isset($extensionMap[$originalExtension])) {
                $mimeType = $extensionMap[$originalExtension];
            } else {
                return new JsonResponse(
                    ['error' => 'only PDF or MP4 allowed. Received: ' . ($mimeType ?? 'unknown') . ' / extension: ' . $originalExtension],
                    Response::HTTP_BAD_REQUEST
                );
            }
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
        $course->setTeacher($user);

        $em->persist($course);
        $em->flush();

        return new JsonResponse([
            'id' => $course->getId(),
            'name' => $course->getName(),
            'file' => $filename,
        ], Response::HTTP_CREATED);
    }
}
