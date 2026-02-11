import { API_URL } from "./auth.service";

const BASE_URL = API_URL.replace(/\/api$/, "");

/**
 * Extrait un ID depuis une ressource (IRI ou valeur scalaire)
 */
export const extractIdFromResource = (resource) => {
  if (!resource) return null;

  if (typeof resource === "number") {
    return String(resource);
  }
  if (typeof resource === "string") {
    if (/^\d+$/.test(resource)) {
      return resource;
    }
    const parts = resource.split("/");
    const last = parts[parts.length - 1];
    return last && /^\d+$/.test(last) ? last : null;
  }
  if (typeof resource === "object") {
    if (resource.id) return String(resource.id);
    if (resource["@id"]) {
      const parts = resource["@id"].split("/");
      const last = parts[parts.length - 1];
      return last && /^\d+$/.test(last) ? last : null;
    }
  }
  return null;
};

/**
 * Normalise les données d'une collection API Platform
 */
export const normalizeApiCollection = (data) => {
  if (Array.isArray(data["hydra:member"])) {
    return data["hydra:member"];
  }
  if (Array.isArray(data.member)) {
    return data.member;
  }
  if (Array.isArray(data)) {
    return data;
  }
  return [];
};

/**
 * Charge la liste des cours depuis l'API
 */
export const fetchCourses = async () => {
  try {
    const response = await fetch(`${API_URL}/courses`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error("Erreur lors du chargement des cours");
    }

    const data = await response.json();
    const coursesList = normalizeApiCollection(data);
    
    // Normaliser les quiz : si c'est un tableau, prendre le premier
    coursesList.forEach(course => {
      if (Array.isArray(course.quiz)) {
        course.quiz = course.quiz.length > 0 ? course.quiz[0] : null;
      }
    });
    
    // Si les quiz ne sont pas inclus, les charger séparément
    const needsQuizLoad = coursesList.length > 0 && coursesList.every(c => !c.quiz || (Array.isArray(c.quiz) && c.quiz.length === 0));
    if (needsQuizLoad) {
      const quizzesRes = await fetch(`${API_URL}/quizzes`, {
        credentials: 'include',
      });
      
      if (quizzesRes.ok) {
        const quizzesData = await quizzesRes.json();
        const quizzes = normalizeApiCollection(quizzesData);
        
        coursesList.forEach(course => {
          const courseId = course.id || extractIdFromResource(course);
          const courseQuiz = quizzes.find(q => {
            const quizCourseId = q.course?.id || extractIdFromResource(q.course);
            return quizCourseId == courseId;
          });
          if (courseQuiz) {
            course.quiz = courseQuiz;
          }
        });
      }
    }
    
    return { success: true, courses: coursesList };
  } catch (error) {
    return { success: false, error: "Erreur lors du chargement des cours" };
  }
};

/**
 * Upload un nouveau cours
 */
export const uploadCourse = async (name, file) => {
  if (!file || !name) {
    return { success: false, error: "Le nom et le fichier sont requis" };
  }

  try {
    const uploadFormData = new FormData();
    uploadFormData.append("name", name);
    uploadFormData.append("file", file);

    const response = await fetch(`${API_URL}/courses`, {
      method: "POST",
      credentials: 'include',
      body: uploadFormData,
    });

    if (response.ok) {
      const course = await response.json();
      return { success: true, course };
    } else {
      const errorData = await response.json();
      return { success: false, error: errorData.error || "Erreur lors de l'upload" };
    }
  } catch (error) {
    return { success: false, error: "Erreur lors de l'upload du cours" };
  }
};

/**
 * Génère un QCM pour un cours
 */
export const generateQuizForCourse = async (courseId, numberOfQuestions) => {
  if (!courseId) {
    return { success: false, error: "ID du cours requis" };
  }

  if (numberOfQuestions < 1 || numberOfQuestions > 50) {
    return { success: false, error: "Le nombre de questions doit être entre 1 et 50" };
  }

  try {
    const response = await fetch(`${API_URL}/courses/${courseId}/generate-quiz`, {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
        Accept: "application/ld+json",
      },
      body: JSON.stringify({
        numberOfQuestions: numberOfQuestions,
      }),
    });

    if (response.ok) {
      const quiz = await response.json();
      return { success: true, quiz };
    } else {
      const errorData = await response.json();
      return { success: false, error: errorData.error || "Erreur lors de la génération du QCM" };
    }
  } catch (error) {
    return { success: false, error: "Erreur lors de la génération du QCM" };
  }
};

/**
 * Charge un quiz complet avec ses questions et réponses
 */
export const loadFullQuiz = async (quizId) => {
  if (!quizId) {
    return { success: false, error: "ID du quiz requis" };
  }

  try {
    const response = await fetch(`${API_URL}/quizzes/${quizId}`, {
      credentials: 'include',
    });

    if (response.ok) {
      const quiz = await response.json();
      return { success: true, quiz };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || "Erreur lors du chargement du QCM" };
    }
  } catch (error) {
    return { success: false, error: "Erreur lors du chargement du QCM" };
  }
};

/**
 * Calcule le score à partir des tentatives de questions
 */
export const computeScoreFromQuestionAttempts = (questionAttempts) => {
  if (!questionAttempts || questionAttempts.length === 0) return null;
  const total = questionAttempts.length;
  const correct = questionAttempts.filter((qa) => qa.answeredCorrectly).length;
  const noteSur20 = (correct / total) * 20;
  return `${noteSur20.toFixed(1)}/20`;
};

/**
 * Formate une date
 */
export const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
};

/**
 * Construit l'URL de visualisation d'un cours
 */
export const getCourseViewUrl = (courseId) => {
  return `${BASE_URL}/courses/${courseId}/view`;
};

/**
 * Charge les tentatives de quiz
 */
export const loadQuizAttempts = async (currentUserId) => {
  try {
    const response = await fetch(`${API_URL}/quiz_attempts`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return { success: false, error: "Erreur lors du chargement des tentatives" };
    }

    const data = await response.json();
    const allAttempts = normalizeApiCollection(data);

    let filtered = allAttempts;
    if (currentUserId) {
      filtered = allAttempts.filter((attempt) => {
        const studentId = extractIdFromResource(attempt.student);
        return studentId === currentUserId;
      });
    }

    const attemptsWithScore = filtered.map((attempt) => ({
      ...attempt,
      _computedScore: computeScoreFromQuestionAttempts(
        attempt.questionAttempts || []
      ),
    }));

    return { success: true, attempts: attemptsWithScore };
  } catch (error) {
    return { success: false, error: "Erreur lors du chargement des tentatives" };
  }
};

/**
 * Soumet les réponses d'un quiz
 */
export const submitQuizAnswers = async (quiz, answers, quizStart, currentUserId) => {
  if (!quiz || !currentUserId) {
    return { success: false, error: "Quiz ou utilisateur manquant" };
  }

  const questions = quiz.questions || [];
  if (questions.length === 0) {
    return { success: false, error: "Ce QCM ne contient aucune question." };
  }

  const beginDate = quizStart || new Date();
  const endDate = new Date();

  // Calcul du score côté frontend
  let correctCount = 0;
  const questionPayloads = [];

  questions.forEach((q) => {
    const qId = q.id || extractIdFromResource(q);
    const selectedResponseId = answers[qId];
    const responses = q.possible_responses || q.possibleResponses || [];

    const selectedResponse = responses.find((r) => {
      const rId = r.id || extractIdFromResource(r);
      return String(rId) === String(selectedResponseId);
    });

    const isCorrectFlag =
      selectedResponse &&
      (selectedResponse.is_correct === true ||
        selectedResponse.isCorrect === true);

    const isCorrect = !!isCorrectFlag;
    if (isCorrect) correctCount += 1;

    questionPayloads.push({
      question: q,
      answeredCorrectly: isCorrect,
    });
  });

  const total = questions.length;
  const noteSur20 = total > 0 ? ((correctCount / total) * 20).toFixed(1) : "0.0";

  try {
    // Création du QuizAttempt
    const quizIri = quiz["@id"] || `/api/quizzes/${quiz.id}`;

    const quizAttemptRes = await fetch(`${API_URL}/quiz_attempts`, {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/ld+json",
        Accept: "application/ld+json",
      },
      body: JSON.stringify({
        student: `/api/users/${currentUserId}`,
        quiz: quizIri,
        beginTimestamp: beginDate.toISOString(),
        endTimestamp: endDate.toISOString(),
      }),
    });

    if (!quizAttemptRes.ok) {
      throw new Error("Erreur lors de la création de la tentative de QCM.");
    }

    const quizAttemptJson = await quizAttemptRes.json();
    const quizAttemptIri =
      quizAttemptJson["@id"] ||
      `/api/quiz_attempts/${quizAttemptJson.id}`;

    // Création des QuestionAttempt pour chaque question
    await Promise.all(
      questionPayloads.map((qp) => {
        const questionIri =
          qp.question["@id"] || `/api/questions/${qp.question.id}`;
        return fetch(`${API_URL}/question_attempts`, {
          method: "POST",
          credentials: 'include',
          headers: {
            "Content-Type": "application/ld+json",
            Accept: "application/ld+json",
          },
          body: JSON.stringify({
            answeredCorrectly: qp.answeredCorrectly,
            question: questionIri,
            quizAttempt: quizAttemptIri,
          }),
        });
      })
    );

    return { success: true, score: noteSur20 };
  } catch (error) {
    return { success: false, error: error.message || "Erreur lors de l'envoi des réponses" };
  }
};
