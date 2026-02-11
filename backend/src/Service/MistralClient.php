<?php

namespace App\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class MistralClient
{
    private const API_URL = 'https://api.mistral.ai/v1/chat/completions';
    private const TRANSCRIPTION_API_URL = 'https://api.mistral.ai/v1/audio/transcriptions';
    private const DEFAULT_MODEL = 'mistral-small-latest';
    private const TRANSCRIPTION_MODEL = 'voxtral-mini-latest';

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        #[Autowire(env: 'MISTRAL_API_KEY')]
        private readonly string $apiKey,
    ) {
    }

    /**
     * Transcrit un fichier audio/vidéo en texte.
     * 
     * @param string $audioFilePath Chemin absolu vers le fichier audio/vidéo
     * @return string Le texte transcrit
     * @throws \RuntimeException si la transcription échoue
     */
    public function transcribeAudio(string $audioFilePath): string
    {
        if (!file_exists($audioFilePath)) {
            throw new \RuntimeException(sprintf('Fichier audio introuvable : %s', $audioFilePath));
        }

        // Lire le fichier audio
        $audioContent = file_get_contents($audioFilePath);
        if ($audioContent === false) {
            throw new \RuntimeException(sprintf('Impossible de lire le fichier audio : %s', $audioFilePath));
        }

        try {
            // L'API Mistral nécessite multipart/form-data avec le fichier directement
            $response = $this->httpClient->request('POST', self::TRANSCRIPTION_API_URL, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiKey,
                ],
                'body' => [
                    'file' => fopen($audioFilePath, 'r'),
                    'model' => self::TRANSCRIPTION_MODEL,
                    'response_format' => 'text',
                ],
            ]);

            $transcription = $response->getContent();
            
            if (empty(trim($transcription))) {
                throw new \RuntimeException('La transcription est vide');
            }

            return trim($transcription);
        } catch (\Throwable $e) {
            throw new \RuntimeException(
                sprintf('Erreur lors de la transcription audio : %s', $e->getMessage()),
                0,
                $e
            );
        }
    }

    /**
     * Génère un QCM à partir d'un texte (transcription vidéo ou texte de document).
     *
     * @param int $numberOfQuestions Nombre de questions à générer (par défaut: entre 5 et 10)
     * @param bool $allowMultipleChoices Si true, certaines questions peuvent avoir plusieurs réponses correctes
     * @return array<mixed>
     */
    public function generateQuizFromContent(string $content, string $sourceName, string $sourceType, ?int $numberOfQuestions = null, bool $allowMultipleChoices = false): array
    {
        $prompt = $this->buildPrompt($content, $sourceName, $sourceType, $numberOfQuestions, $allowMultipleChoices);

        $response = $this->httpClient->request('POST', self::API_URL, [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ],
            'json' => [
                'model' => self::DEFAULT_MODEL,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Tu es un générateur de QCM en français. '
                            . 'Tu produis du JSON strict, sans texte autour.',
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt,
                    ],
                ],
                'temperature' => 0.4,
            ],
        ]);

        $data = $response->toArray(false);

        $rawContent = $data['choices'][0]['message']['content'] ?? '';

        // Nettoyage : certains modèles renvoient le JSON entouré de ``` ou ```json
        $normalized = trim($rawContent);
        if (str_starts_with($normalized, '```')) {
            // Supprime la première ligne de fence (``` ou ```json)
            $normalized = preg_replace('/^```[a-zA-Z0-9]*\s*/', '', $normalized);
            // Supprime le fence de fin éventuel
            $normalized = preg_replace('/```$/', '', trim($normalized));
        }

        // Tentative principale de décodage
        $decoded = json_decode($normalized, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }

        // Dernier recours : essayer d'extraire le premier bloc JSON { ... }
        if (preg_match('/\{.*\}/s', $normalized, $m)) {
            $fallback = json_decode($m[0], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($fallback)) {
                return $fallback;
            }
        }

        return [
            'raw' => $rawContent,
            'error' => 'Le modèle n\'a pas renvoyé un JSON valide. Vérifiez le contenu brut.',
        ];
    }

    private function buildPrompt(string $content, string $sourceName, string $sourceType, ?int $numberOfQuestions = null, bool $allowMultipleChoices = false): string
    {
        $questionsInstruction = $numberOfQuestions 
            ? sprintf('Produit exactement %d questions.', $numberOfQuestions)
            : 'Produit entre 5 et 10 questions.';
        
        $multipleChoicesInstruction = $allowMultipleChoices
            ? "\nIMPORTANT : Certaines questions peuvent avoir PLUSIEURS réponses correctes. Dans ce cas, utilise 'answer_indices' (tableau) au lieu de 'answer_index' (nombre). Exemple : {\"answer_indices\": [0, 2]} signifie que les choix A et C sont corrects."
            : "\nIMPORTANT : Chaque question a exactement UNE seule bonne réponse. Utilise 'answer_index' (un nombre) pour indiquer l'index de la bonne réponse.";
        
        $jsonStructure = $allowMultipleChoices
            ? <<<JSON
{
  "title": "Titre du QCM",
  "questions": [
    {
      "question": "Texte de la question",
      "choices": [
        "Choix A",
        "Choix B",
        "Choix C",
        "Choix D"
      ],
      "answer_index": 0,
      "answer_indices": [0],
      "explanation": "Explication courte de la bonne réponse"
    }
  ]
}
JSON
            : <<<JSON
{
  "title": "Titre du QCM",
  "questions": [
    {
      "question": "Texte de la question",
      "choices": [
        "Choix A",
        "Choix B",
        "Choix C",
        "Choix D"
      ],
      "answer_index": 0,
      "explanation": "Explication courte de la bonne réponse"
    }
  ]
}
JSON;
        
        return sprintf(
            <<<PROMPT
Génère un QCM en français basé sur le contenu suivant, provenant d'un(e) %s nommé(e) "%s".

CONTENU :
---
%s
---

Je veux le résultat au format JSON STRICT, sans aucun texte avant ou après, avec la structure suivante :
%s

%s

%s

IMPORTANT : Chaque question doit avoir au moins 4 choix de réponse (A, B, C, D minimum).
PROMPT,
            $sourceType,
            $sourceName,
            $content,
            $jsonStructure,
            $questionsInstruction,
            $multipleChoicesInstruction
        );
    }
}

