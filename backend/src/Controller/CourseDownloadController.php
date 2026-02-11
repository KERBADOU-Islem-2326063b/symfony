<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;

final class CourseDownloadController extends AbstractController
{
    public function __invoke(string $filename): BinaryFileResponse
    {
        $path = $this->getParameter('files_directory').'/'.$filename;

        if (!file_exists($path)) {
            throw $this->createNotFoundException('Fichier non trouvé');
        }

        $response = new BinaryFileResponse($path);
        $response->setContentDisposition(ResponseHeaderBag::DISPOSITION_ATTACHMENT, $filename);

        return $response;
    }
}
