<?php

namespace App\Controller;

use App\Service\DocumentTextExtractor;
use App\Service\MistralClient;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/uploads', name: 'uploads_')]
class UploadController extends AbstractController
{
    private const DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt'];

    private string $uploadDir;

    public function __construct(
        KernelInterface $kernel,
        private readonly DocumentTextExtractor $documentTextExtractor,
        private readonly MistralClient $mistralClient,
    ) {
        $this->uploadDir = $kernel->getProjectDir() . '/var/uploads';
    }

    #[Route('/documents', name: 'documents_list', methods: ['GET'])]
    public function listDocuments(): JsonResponse
    {
        $files = $this->listFilesByExtensions(self::DOCUMENT_EXTENSIONS);

        return $this->json([
            'count' => \count($files),
            'files' => $files,
        ]);
    }

    #[Route('/quiz/document/{filename}', name: 'quiz_from_document', methods: ['POST'])]
    public function generateQuizFromDocument(string $filename): JsonResponse
    {
        $filePath = $this->getFilePath($filename, self::DOCUMENT_EXTENSIONS);
        if ($filePath === null) {
            return $this->json(
                ['error' => 'Document introuvable ou extension non supportée.'],
                Response::HTTP_NOT_FOUND
            );
        }

        try {
            $text = $this->documentTextExtractor->extractText($filePath);
            $quiz = $this->mistralClient->generateQuizFromContent($text, $filename, 'document');
        } catch (\Throwable $e) {
            return $this->json(
                ['error' => 'Erreur lors de la génération du QCM', 'details' => $e->getMessage()],
                Response::HTTP_INTERNAL_SERVER_ERROR
            );
        }

        return $this->json($quiz);
    }

    /**
     * Retourne la liste des fichiers dans var/uploads filtrés par extensions.
     *
     * @param string[] $extensions
     *
     * @return array<int, array<string, string|int>>
     */
    private function listFilesByExtensions(array $extensions): array
    {
        $result = [];

        if (!is_dir($this->uploadDir)) {
            return $result;
        }

        $dirHandle = opendir($this->uploadDir);
        if ($dirHandle === false) {
            return $result;
        }

        while (($entry = readdir($dirHandle)) !== false) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }

            $fullPath = $this->uploadDir . DIRECTORY_SEPARATOR . $entry;
            if (!is_file($fullPath)) {
                continue;
            }

            $extension = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
            if (!\in_array($extension, $extensions, true)) {
                continue;
            }

            $result[] = [
                'name' => $entry,
                'extension' => $extension,
                'size' => filesize($fullPath) ?: 0,
            ];
        }

        closedir($dirHandle);

        return $result;
    }

    /**
     * Renvoie le chemin absolu du fichier si présent dans var/uploads et d'extension autorisée.
     *
     * @param string[] $allowedExtensions
     */
    private function getFilePath(string $filename, array $allowedExtensions): ?string
    {
        // On évite les chemins relatifs suspects
        if (str_contains($filename, '..') || str_contains($filename, DIRECTORY_SEPARATOR)) {
            return null;
        }

        $fullPath = $this->uploadDir . DIRECTORY_SEPARATOR . $filename;
        if (!is_file($fullPath)) {
            return null;
        }

        $extension = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
        if (!\in_array($extension, $allowedExtensions, true)) {
            return null;
        }

        return $fullPath;
    }
}

