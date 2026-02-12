## Plateforme de cours & QCM

Ce projet est composé de deux parties :

- **backend** : API Symfony (API Platform) pour gérer les utilisateurs, les cours, les QCM, les tentatives, etc.
- **frontend** : application React qui consomme l’API et propose l’interface web.

### Gestion des fichiers de cours

- Quand un professeur crée un cours, le **fichier (PDF ou MP4) est stocké localement sur le disque** du backend (dossier de type `var/uploads` via le paramètre `files_directory`).
- L’API enregistre **seulement le nom du fichier** dans la base de données.
- Si tu lances le projet sur une autre machine / un autre environnement, la base de données peut contenir des cours dont **le fichier physique n’existe plus** → dans ce cas, c’est **normal** si la visualisation du fichier échoue pour ces anciens cours.
- Les **nouveaux cours créés** dans l’instance courante auront bien leur fichier disponible pour la visualisation.

### Fonctionnement global

- **Côté professeur**
  - Sur la page d’accueil après connexion, tu peux **uploader un cours** (nom + fichier PDF/MP4).
  - Tu vois la liste de **tes cours** : visualiser le fichier, générer un QCM, renommer ou supprimer un cours.
  - Quand tu supprimes un cours, les QCM associés (questions, réponses, tentatives) sont également nettoyés.

- **Côté étudiant**
  - Tu vois les **cours disponibles** et peux **visualiser** le fichier associé.
  - Si un QCM existe pour un cours, tu peux le **passer**, puis consulter tes résultats et l’historique de tes tentatives.

Le backend expose les routes API (notamment `/api/courses`, `/api/quizzes`, `/api/quiz_attempts`, etc.) et le frontend se charge d’appeler ces endpoints et d’afficher les écrans adaptés en fonction du rôle connecté.

