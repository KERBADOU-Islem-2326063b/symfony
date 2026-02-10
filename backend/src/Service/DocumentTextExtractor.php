<?php

namespace App\Service;

use PhpOffice\PhpWord\Element\Text;
use PhpOffice\PhpWord\Element\TextRun;
use PhpOffice\PhpWord\IOFactory;
use Smalot\PdfParser\Parser as PdfParser;

/**
 * Extraction de texte depuis un document (PDF, DOCX, TXT).
 */
class DocumentTextExtractor
{
    /**
     * @throws \RuntimeException si le fichier est introuvable ou non supporté.
     */
    public function extractText(string $absolutePath): string
    {
        if (!is_file($absolutePath)) {
            throw new \RuntimeException(sprintf('Fichier document introuvable : %s', $absolutePath));
        }

        $extension = strtolower(pathinfo($absolutePath, PATHINFO_EXTENSION));

        return match ($extension) {
            'txt'  => $this->extractFromTxt($absolutePath),
            'pdf'  => $this->extractFromPdf($absolutePath),
            'docx' => $this->extractFromDocx($absolutePath),
            default => throw new \RuntimeException(sprintf('Extension de document non supportée : %s', $extension)),
        };
    }

    private function extractFromTxt(string $path): string
    {
        $content = file_get_contents($path);

        return $content === false ? '' : $content;
    }

    private function extractFromPdf(string $path): string
    {
        $parser = new PdfParser();
        $pdf = $parser->parseFile($path);

        return trim($pdf->getText());
    }

    private function extractFromDocx(string $path): string
    {
        $phpWord = IOFactory::load($path);
        $texts = [];

        foreach ($phpWord->getSections() as $section) {
            foreach ($section->getElements() as $element) {
                $texts[] = $this->extractTextFromElement($element);
            }
        }

        $joined = trim(implode("\n", array_filter($texts)));

        return $joined;
    }

    /**
     * Extraction très simple des textes d'un élément PhpWord (paragraphes les plus courants).
     */
    private function extractTextFromElement(mixed $element): string
    {
        if ($element instanceof Text) {
            return $element->getText();
        }

        if ($element instanceof TextRun) {
            $parts = [];
            foreach ($element->getElements() as $child) {
                if ($child instanceof Text) {
                    $parts[] = $child->getText();
                }
            }

            return implode('', $parts);
        }

        // Pour les autres types d’éléments, on peut étendre plus tard si besoin.
        return '';
    }
}

