import Header from "../../components/Header";
import { useState, useEffect } from "react";
import React from "react";
import { getRoles, getUser, getUserId } from "../../services/auth.state";
import { API_URL } from "../../services/auth.service";
import {
  fetchCourses,
  uploadCourse,
  deleteCourse,
  updateCourseName,
  generateQuizForCourse,
  loadFullQuiz,
  submitQuizAnswers,
  loadQuizAttempts,
  computeScoreFromQuestionAttempts,
  formatDate,
  getCourseViewUrl,
  extractIdFromResource,
  normalizeApiCollection,
} from "../../services/course.service";
import { FaChevronLeft, FaChevronRight, FaFileAlt } from "react-icons/fa";

function Carousel({ items, renderItem, icon }) {
  const [start, setStart] = useState(0);
  const visibleCount = 3;
  const max = items.length;

  if (max === 0) {
    return <div className="text-muted">Aucun élément disponible.</div>;
  }

  const prev = () => setStart((s) => (s - 1 + max) % max);
  const next = () => setStart((s) => (s + 1) % max);

  const getVisible = () => {
    const arr = [];
    for (let i = 0; i < Math.min(visibleCount, max); i++) {
      arr.push(items[(start + i) % max]);
    }
    return arr;
  };

  return (
    <div className="position-relative mb-4">
      <div className="d-flex align-items-center justify-content-end mb-2" style={{gap: 8}}>
        <button className="btn btn-light btn-sm" onClick={prev}><FaChevronLeft /></button>
        <button className="btn btn-light btn-sm" onClick={next}><FaChevronRight /></button>
      </div>
      <div className="d-flex flex-row justify-content-start" style={{gap: 24, overflow: 'hidden'}}>
        {getVisible().map((item, idx) => (
          <div
            key={
              item.id ??
              item.name ??
              (typeof item === "string" ? item : idx)
            }
          >
            {renderItem(item, icon, idx)}
          </div>
        ))}
      </div>
      <div className="progress mt-3" style={{height: 4}}>
        <div className="progress-bar bg-primary" style={{width: `${((start+1)/max)*100}%`}}></div>
      </div>
    </div>
  );
}

function Home() {
  const [role, setRole] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [documentsError, setDocumentsError] = useState("");

  const [quizzesByFilename, setQuizzesByFilename] = useState({});
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(true);
  const [attemptsError, setAttemptsError] = useState("");

  const [generatingFor, setGeneratingFor] = useState(null);

  const [activeQuiz, setActiveQuiz] = useState(null);
  const [activeDocument, setActiveDocument] = useState(null);
  const [answers, setAnswers] = useState({});
  const [quizStart, setQuizStart] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [coursesError, setCoursesError] = useState("");
  const [uploadingCourse, setUploadingCourse] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [viewingCourse, setViewingCourse] = useState(null);
  const [generatingQuizForCourse, setGeneratingQuizForCourse] = useState(null);
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [allowMultipleChoices, setAllowMultipleChoices] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [expandedAttempts, setExpandedAttempts] = useState(new Set());

  const currentUser = getUser();
  const currentUserId = getUserId();
  const BASE_URL = API_URL.replace(/\/api$/, "");

  console.log("[Home] currentUser:", currentUser);
  console.log("[Home] currentUserId:", currentUserId);

  useEffect(() => {
    const roles = getRoles();
    setRole(
      roles.includes("ROLE_TEACHER")
        ? "ROLE_TEACHER"
        : roles.includes("ROLE_STUDENT")
        ? "ROLE_STUDENT"
        : null
    );

    loadHomeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildQuizzesByFilename = (quizzes) => {
    const map = {};
    quizzes.forEach((quiz) => {
      if (!quiz || !quiz.title) return;
      const match = quiz.title.match(/QCM généré à partir de (.+)$/i);
      if (match && match[1]) {
        const filename = match[1].trim();
        map[filename] = quiz;
      }
    });
    return map;
  };

  const loadHomeData = async () => {
    setDocumentsError("");
    setAttemptsError("");
    setLoadingDocuments(true);
    setLoadingAttempts(true);

    try {
      const [docsRes, quizzesRes, attemptsRes] = await Promise.all([
        fetch(`${BASE_URL}/uploads/documents`, { credentials: 'include' }),
        fetch(`${API_URL}/quizzes`, { credentials: 'include' }),
        fetch(`${API_URL}/quiz_attempts`, { credentials: 'include' }),
      ]);

      // Documents
      if (!docsRes.ok) {
        throw new Error("Erreur lors du chargement des documents.");
      }
      const docsJson = await docsRes.json();
      const rawDocs = docsJson.files || [];

      // Quizzes
      let quizzesJson = {};
      try {
        quizzesJson = await quizzesRes.json();
      } catch (e) {
        quizzesJson = {};
      }
      const quizzes = Array.isArray(quizzesJson["hydra:member"])
        ? quizzesJson["hydra:member"]
        : Array.isArray(quizzesJson.member)
        ? quizzesJson.member
        : Array.isArray(quizzesJson)
        ? quizzesJson
        : [];
      const mapByFilename = buildQuizzesByFilename(quizzes);
      setQuizzesByFilename(mapByFilename);

      const docsWithQuiz = rawDocs.map((doc) => ({
        ...doc,
        quiz: mapByFilename[doc.name] || null,
      }));
      setDocuments(docsWithQuiz);
      setLoadingDocuments(false);

      // Quiz attempts
      const attemptsResult = await loadQuizAttempts(currentUserId);
      if (attemptsResult.success) {
        setQuizAttempts(attemptsResult.attempts);
        setLoadingAttempts(false);
      } else {
        setAttemptsError(attemptsResult.error || "Impossible de charger les tentatives de QCM pour le moment.");
        setLoadingAttempts(false);
      }
    } catch (e) {
      setDocumentsError("Erreur lors du chargement des données.");
      setLoadingDocuments(false);
      setAttemptsError("Erreur lors du chargement des tentatives de QCM.");
      setLoadingAttempts(false);
    }
  };

  const handleGenerateQuiz = async (document) => {
    if (!document || !document.name) return;
    try {
      setGeneratingFor(document.name);
      const res = await fetch(
        `${BASE_URL}/uploads/quiz/document/${encodeURIComponent(
          document.name
        )}`,
        {
          method: "POST",
          credentials: 'include',
          headers: {
            "Content-Type": "application/json",
            Accept: "application/ld+json",
          },
          body: JSON.stringify(
            currentUserId
              ? { teacher: `/api/users/${currentUserId}` }
              : {}
          ),
        }
      );

      if (!res.ok) {
        throw new Error("Erreur lors de la génération du QCM.");
      }

      const quiz = await res.json();

      // On met à jour la carte du document correspondant
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.name === document.name ? { ...doc, quiz } : doc
        )
      );

      setQuizzesByFilename((prev) => ({
        ...prev,
        [document.name]: quiz,
      }));
    } catch (e) {
      alert(
        "Impossible de générer le QCM pour ce document. Détail : " +
          (e.message || "")
      );
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleStartQuiz = (document) => {
    if (!document || !document.quiz) {
      alert("Aucun QCM n'est disponible pour ce document.");
      return;
    }
    console.log("[Home] handleStartQuiz document:", document);
    console.log("[Home] handleStartQuiz quiz:", document.quiz);
    setActiveDocument(document);
    setActiveQuiz(document.quiz);
    setAnswers({});
    setSubmitError("");
    setSubmitSuccess("");
    setQuizStart(new Date());
    window.scrollTo({ top: document.body?.scrollHeight || 0, behavior: "smooth" });
  };

  const handleAnswerChange = (questionId, responseId, isMultipleChoice) => {
    setAnswers((prev) => {
      if (isMultipleChoice) {
        // Pour les questions multichoix, gérer un tableau de réponses
        const currentAnswers = prev[questionId] || [];
        const isSelected = Array.isArray(currentAnswers) && currentAnswers.includes(String(responseId));
        
        if (isSelected) {
          // Désélectionner la réponse
          return {
            ...prev,
            [questionId]: currentAnswers.filter(id => id !== String(responseId)),
          };
        } else {
          // Sélectionner la réponse
          return {
            ...prev,
            [questionId]: [...currentAnswers, String(responseId)],
          };
        }
      } else {
        // Pour les questions à choix unique, une seule réponse
        return {
          ...prev,
          [questionId]: String(responseId),
        };
      }
    });
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz || !currentUserId) {
      setSubmitError(
        "Impossible d'envoyer le QCM : utilisateur non identifié ou QCM introuvable."
      );
      return;
    }

    setSubmitLoading(true);
    setSubmitError("");
    setSubmitSuccess("");

    const result = await submitQuizAnswers(activeQuiz, answers, quizStart, currentUserId);

    if (result.success) {
      setSubmitSuccess(
        `Vos réponses ont été enregistrées. Résultat : ${result.score}/20.`
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      loadHomeData();
    } else {
      setSubmitError(result.error || "Erreur lors de l'envoi de vos réponses. Veuillez réessayer.");
    }

    setSubmitLoading(false);
  };

  const handleLoadCourses = async () => {
    if (!role) return;
    
    setLoadingCourses(true);
    setCoursesError("");

    const result = await fetchCourses();
    
    if (result.success) {
      let loadedCourses = result.courses || [];
      // Pour un professeur, ne garder que ses propres cours
      if (role === "ROLE_TEACHER" && currentUserId) {
        loadedCourses = loadedCourses.filter((course) => {
          const teacherId = extractIdFromResource(course.teacher);
          return teacherId && String(teacherId) === String(currentUserId);
        });
      }
      setCourses(loadedCourses);
    } else {
      setCoursesError(result.error || "Erreur lors du chargement des cours");
    }
    
    setLoadingCourses(false);
  };

  useEffect(() => {
    if (role) {
      handleLoadCourses();
    }
  }, [role]);

  const handleOpenQuizModal = (course) => {
    const courseId = course.id || course["@id"]?.split("/").pop();
    setGeneratingQuizForCourse(courseId);
    setNumberOfQuestions(10);
    setAllowMultipleChoices(false);
    setShowQuizModal(true);
  };

  const handleGenerateQuizForCourse = async () => {
    if (!generatingQuizForCourse) return;
    
    setGeneratingQuiz(true);
    setUploadError("");
    setUploadSuccess("");

    const result = await generateQuizForCourse(generatingQuizForCourse, numberOfQuestions, allowMultipleChoices);

    setGeneratingQuiz(false);

    if (result.success) {
      setUploadSuccess(`QCM généré avec succès ! ${result.quiz.questions?.length || 0} questions créées.`);
      setShowQuizModal(false);
      setGeneratingQuizForCourse(null);
      await handleLoadCourses();
    } else {
      setUploadError(result.error || "Erreur lors de la génération du QCM");
    }
  };

  const handleUploadCourse = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const file = formData.get("file");
    const name = formData.get("name");

    setUploadingCourse(true);
    setUploadError("");
    setUploadSuccess("");

    const result = await uploadCourse(name, file);

    if (result.success) {
      setUploadSuccess("Cours créé avec succès !");
      event.target.reset();
      await handleLoadCourses();
    } else {
      setUploadError(result.error || "Erreur lors de l'upload");
    }

    setUploadingCourse(false);
  };

  const handleDeleteCourse = async (course) => {
    if (!course) return;

    const courseId = course.id || extractIdFromResource(course);
    if (!courseId) {
      console.error("[handleDeleteCourse] Impossible d'extraire l'ID du cours:", course);
      return;
    }

    // Vérifier que le cours appartient bien au professeur connecté
    const teacherId = extractIdFromResource(course.teacher);
    if (teacherId && String(teacherId) !== String(currentUserId)) {
      alert("Vous ne pouvez supprimer que vos propres cours.");
      return;
    }

    if (!window.confirm(`Voulez-vous vraiment supprimer le cours "${course.name}" ?`)) {
      return;
    }

    setUploadError("");
    setUploadSuccess("");

    const result = await deleteCourse(courseId);
    if (result.success) {
      setUploadSuccess("Cours supprimé avec succès.");
      await handleLoadCourses();
    } else {
      setUploadError(result.error || "Erreur lors de la suppression du cours.");
    }
  };

  const handleRenameCourse = async (course) => {
    if (!course) return;

    const courseId = course.id || extractIdFromResource(course);
    if (!courseId) {
      console.error("[handleRenameCourse] Impossible d'extraire l'ID du cours:", course);
      return;
    }

    // Vérifier que le cours appartient bien au professeur connecté
    const teacherId = extractIdFromResource(course.teacher);
    if (teacherId && String(teacherId) !== String(currentUserId)) {
      alert("Vous ne pouvez modifier que vos propres cours.");
      return;
    }

    const newName = window.prompt("Nouveau nom du cours :", course.name || "");
    if (!newName || newName.trim() === "" || newName === course.name) {
      return;
    }

    setUploadError("");
    setUploadSuccess("");

    const result = await updateCourseName(courseId, newName.trim());
    if (result.success) {
      setUploadSuccess("Cours mis à jour avec succès.");
      await handleLoadCourses();
    } else {
      setUploadError(result.error || "Erreur lors de la mise à jour du cours.");
    }
  };

  const handleViewCourse = (course) => {
    if (!course) return;
    const courseId = course.id || extractIdFromResource(course);
    if (!courseId) {
      console.error("[handleViewCourse] Impossible d'extraire l'ID du cours:", course);
      return;
    }
    const viewUrl = getCourseViewUrl(courseId);
    console.log("[handleViewCourse] Opening viewer for course:", course.name, "URL:", viewUrl);
    setViewingCourse({ ...course, viewUrl });
  };

  const handleCloseViewer = () => {
    setViewingCourse(null);
  };

  return (
    <div className="bg-light min-vh-100">
      <style>{`
        .table-row-hover:hover {
          background-color: #f8f9fa !important;
        }
      `}</style>
      <Header />
      <div className="container my-5">
        {role === "ROLE_TEACHER" && (
          <>
            <h4 className="mb-3">📚 Mes cours</h4>
            {uploadError && (
              <div className="alert alert-danger">{uploadError}</div>
            )}
            {uploadSuccess && (
              <div className="alert alert-success">{uploadSuccess}</div>
            )}
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <h5 className="card-title">Ajouter un nouveau cours</h5>
                <form onSubmit={handleUploadCourse}>
                  <div className="mb-3">
                    <label htmlFor="courseName" className="form-label">
                      Nom du cours
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="courseName"
                      name="name"
                      required
                      placeholder="Ex: Introduction à la programmation"
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="courseFile" className="form-label">
                      Fichier (PDF ou MP4)
                    </label>
                    <input
                      type="file"
                      className="form-control"
                      id="courseFile"
                      name="file"
                      accept=".pdf,.mp4"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={uploadingCourse}
                  >
                    {uploadingCourse ? "Upload en cours..." : "Créer le cours"}
                  </button>
                </form>
              </div>
            </div>

            {loadingCourses ? (
              <div className="mb-4">Chargement de vos cours...</div>
            ) : coursesError ? (
              <div className="alert alert-warning mb-4">{coursesError}</div>
            ) : courses.length === 0 ? (
              <div className="alert alert-info mb-4">
                Vous n'avez pas encore de cours. Créez-en un ci-dessus.
              </div>
            ) : (
              <div className="card shadow-sm mb-5">
                <div className="card-body">
                  <h5 className="card-title">Liste de vos cours</h5>
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Fichier</th>
                          <th>QCM</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courses.map((course) => (
                          <tr key={course.id || course["@id"]}>
                            <td>{course.name}</td>
                            <td>
                              <small className="text-muted">
                                {course.fileName || "N/A"}
                              </small>
                            </td>
                            <td>
                              {course.quiz ? (
                                <span className="badge bg-success">QCM généré</span>
                              ) : (
                                <span className="badge bg-secondary">Aucun QCM</span>
                              )}
                            </td>
                            <td>
                              <div className="btn-group" role="group">
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handleViewCourse(course)}
                                >
                                  Visualiser
                                </button>
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleOpenQuizModal(course)}
                                  disabled={!!course.quiz}
                                >
                                  {course.quiz ? "QCM généré" : "Générer QCM"}
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => handleRenameCourse(course)}
                                >
                                  Modifier
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDeleteCourse(course)}
                                >
                                  Supprimer
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {viewingCourse && (
          <div
            className="modal show d-block"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050, position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={handleCloseViewer}
          >
            <div
              className="modal-dialog modal-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{viewingCourse.name}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={handleCloseViewer}
                  ></button>
                </div>
                <div className="modal-body" style={{ minHeight: "70vh" }}>
                  {!viewingCourse.fileName ? (
                    <div className="alert alert-warning">
                      Aucun fichier associé à ce cours.
                    </div>
                  ) : viewingCourse.fileName.endsWith(".pdf") ? (
                    <iframe
                      src={viewingCourse.viewUrl}
                      style={{ width: "100%", height: "70vh", border: "none" }}
                      title={viewingCourse.name}
                      onError={() => console.error("[Viewer] Erreur lors du chargement du PDF")}
                    />
                  ) : viewingCourse.fileName.endsWith(".mp4") ? (
                    <video
                      src={viewingCourse.viewUrl}
                      controls
                      style={{ width: "100%", maxHeight: "70vh" }}
                      onError={(e) => {
                        console.error("[Viewer] Erreur lors du chargement de la vidéo:", e);
                      }}
                    >
                      Votre navigateur ne supporte pas la lecture vidéo.
                    </video>
                  ) : (
                    <div className="alert alert-warning">
                      Type de fichier non supporté pour la visualisation: {viewingCourse.fileName}
                    </div>
                  )}
                  <div className="mt-2">
                    <small className="text-muted">
                      URL: {viewingCourse.viewUrl}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showQuizModal && (
          <div
            className="modal show d-block"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={() => {
              setShowQuizModal(false);
              setGeneratingQuizForCourse(null);
            }}
          >
            <div
              className="modal-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Générer un QCM</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowQuizModal(false);
                      setGeneratingQuizForCourse(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="numberOfQuestions" className="form-label">
                      Nombre de questions (entre 1 et 50)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="numberOfQuestions"
                      min="1"
                      max="50"
                      value={numberOfQuestions}
                      onChange={(e) => setNumberOfQuestions(parseInt(e.target.value) || 10)}
                      disabled={generatingQuiz}
                    />
                    <small className="form-text text-muted">
                      Le QCM sera généré avec {numberOfQuestions} question{numberOfQuestions > 1 ? 's' : ''}.
                    </small>
                  </div>
                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="allowMultipleChoices"
                        checked={allowMultipleChoices}
                        onChange={(e) => setAllowMultipleChoices(e.target.checked)}
                        disabled={generatingQuiz}
                      />
                      <label className="form-check-label" htmlFor="allowMultipleChoices">
                        Autoriser plusieurs réponses correctes par question (multichoix)
                      </label>
                    </div>
                    <small className="form-text text-muted">
                      Si activé, certaines questions pourront avoir plusieurs bonnes réponses.
                    </small>
                  </div>
                  {generatingQuiz && (
                    <div className="alert alert-info">
                      <div className="spinner-border spinner-border-sm me-2" role="status">
                        <span className="visually-hidden">Chargement...</span>
                      </div>
                      Génération du QCM en cours, veuillez patienter...
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowQuizModal(false);
                      setGeneratingQuizForCourse(null);
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleGenerateQuizForCourse}
                    disabled={generatingQuiz || !numberOfQuestions || numberOfQuestions < 1 || numberOfQuestions > 50}
                  >
                    {generatingQuiz ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Génération...
                      </>
                    ) : (
                      "Générer le QCM"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {role === "ROLE_STUDENT" && (
          <>
            <h4 className="mb-3">📚 Cours disponibles</h4>
            {loadingCourses ? (
              <div>Chargement des cours...</div>
            ) : coursesError ? (
              <div className="alert alert-warning">{coursesError}</div>
            ) : courses.length === 0 ? (
              <div className="alert alert-info">
                Aucun cours disponible pour le moment.
              </div>
            ) : (
              <div className="row">
                {courses.map((course) => (
                  <div key={course.id || course["@id"]} className="col-md-4 mb-3">
                    <div className="card shadow-sm">
                      <div className="card-body">
                        <h5 className="card-title">{course.name}</h5>
                        <p className="card-text">
                          <small className="text-muted">
                            {course.fileName || "N/A"}
                          </small>
                        </p>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleViewCourse(course)}
                          >
                            Visualiser
                          </button>
                          {course.quiz && (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={async () => {
                                const quizId = course.quiz.id || extractIdFromResource(course.quiz);
                                const result = await loadFullQuiz(quizId);
                                
                                if (result.success) {
                                  setActiveDocument(course);
                                  setActiveQuiz(result.quiz);
                                  setAnswers({});
                                  setSubmitError("");
                                  setSubmitSuccess("");
                                  setQuizStart(new Date());
                                  setTimeout(() => {
                                    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                                  }, 100);
                                } else {
                                  alert("Erreur lors du chargement du QCM: " + (result.error || "Erreur inconnue"));
                                }
                              }}
                            >
                              Passer le QCM
                            </button>
                          )}
                        </div>
                        {!course.quiz && (
                          <div className="mt-2">
                            <small className="text-muted">
                              QCM non disponible pour ce cours.
                            </small>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeQuiz && (
          <div className="mt-5">
            <h4 className="mb-3">
              QCM : {activeQuiz.title}{" "}
              {activeDocument ? `(${activeDocument.name})` : ""}
            </h4>
            {activeDocument && (
              <div className="mb-3">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleViewCourse(activeDocument)}
                >
                  Voir le cours
                </button>
              </div>
            )}
            {submitError && (
              <div className="alert alert-danger">{submitError}</div>
            )}
            {submitSuccess && (
              <div className="alert alert-success">{submitSuccess}</div>
            )}
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                {(!activeQuiz.questions || activeQuiz.questions.length === 0) && (
                  <div className="alert alert-warning">
                    Aucune question disponible dans ce QCM.
                  </div>
                )}
                {console.log("[Quiz Debug] activeQuiz:", activeQuiz)}
                {console.log("[Quiz Debug] questions:", activeQuiz.questions)}
                {(activeQuiz.questions || []).map((q, index) => {
                  const qId = q.id || extractIdFromResource(q);
                  // Symfony sérialise getPossibleResponses() comme "possibleResponses" (camelCase)
                  const responses =
                    q.possibleResponses || q.possible_responses || [];
                  
                  // Déterminer si c'est une question multichoix (plusieurs réponses correctes)
                  const correctResponses = responses.filter(r => 
                    r.is_correct === true || r.isCorrect === true
                  );
                  const isMultipleChoice = correctResponses.length > 1;
                  
                  // Debug pour la première question
                  if (index === 0) {
                    console.log("[Quiz] Question:", q);
                    console.log("[Quiz] Is multiple choice:", isMultipleChoice);
                    console.log("[Quiz] Correct responses count:", correctResponses.length);
                  }
                  
                  if (!responses || responses.length === 0) {
                    console.warn(`[Quiz] Question ${index + 1} n'a pas de réponses disponibles`);
                  }
                  
                  // Récupérer les réponses sélectionnées pour cette question
                  const selectedAnswers = answers[qId];
                  const isSelected = (rId) => {
                    if (isMultipleChoice) {
                      return Array.isArray(selectedAnswers) && selectedAnswers.includes(String(rId));
                    } else {
                      return String(selectedAnswers) === String(rId);
                    }
                  };
                  
                  return (
                    <div key={qId || index} className="mb-4 text-start">
                      <p className="fw-bold">
                        Question {index + 1}: {q.content}
                        {isMultipleChoice && (
                          <span className="badge bg-info ms-2">Plusieurs réponses possibles</span>
                        )}
                      </p>
                      <div>
                        {responses.map((r) => {
                          const rId = r.id || extractIdFromResource(r);
                          return (
                            <div className="form-check" key={rId}>
                              <input
                                className="form-check-input"
                                type={isMultipleChoice ? "checkbox" : "radio"}
                                name={isMultipleChoice ? `question-${qId}-${rId}` : `question-${qId}`}
                                id={`q${qId}-r${rId}`}
                                checked={isSelected(rId)}
                                onChange={() =>
                                  handleAnswerChange(qId, rId, isMultipleChoice)
                                }
                              />
                              <label
                                className="form-check-label"
                                htmlFor={`q${qId}-r${rId}`}
                              >
                                {r.content}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitQuiz}
                  disabled={submitLoading}
                >
                  {submitLoading ? "Envoi en cours..." : "Valider mes réponses"}
                </button>
              </div>
            </div>
          </div>
        )}

        <h4 className="mt-5 mb-3">📊 Résultats des QCM</h4>
        {attemptsError && (
          <div className="alert alert-danger">{attemptsError}</div>
        )}
        <div className="card shadow-sm">
          <table className="table mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: '30px' }}></th>
                <th>Étudiant</th>
                <th>QCM</th>
                <th>Date</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {loadingAttempts ? (
                <tr>
                  <td colSpan="5">Chargement des résultats...</td>
                </tr>
              ) : quizAttempts.length === 0 ? (
                <tr>
                  <td colSpan="5">Aucune tentative de QCM pour le moment.</td>
                </tr>
              ) : (
                quizAttempts.map((attempt) => {
                  const attemptId = attempt.id || extractIdFromResource(attempt);
                  const isExpanded = expandedAttempts.has(attemptId);
                  
                  // Extraire le titre du QCM - peut être un objet ou une IRI
                  let quizTitle = "QCM";
                  if (attempt.quiz) {
                    if (typeof attempt.quiz === 'object') {
                      quizTitle = attempt.quiz.title || attempt.quiz["@title"] || "QCM";
                    } else if (typeof attempt.quiz === 'string') {
                      // Si c'est une IRI, essayer de charger le quiz
                      quizTitle = "QCM";
                    }
                  }
                  
                  // Debug pour voir la structure
                  if (!quizTitle || quizTitle === "QCM") {
                    console.log("[QuizAttempt] attempt.quiz:", attempt.quiz);
                  }
                  
                  const date = formatDate(attempt.endTimestamp);
                  const score =
                    attempt._computedScore ||
                    computeScoreFromQuestionAttempts(
                      attempt.questionAttempts || []
                    ) ||
                    "-";
                  const studentLabel =
                    (currentUser && currentUser.email) || "Vous";
                  const questionAttempts = attempt.questionAttempts || [];

                  const toggleExpand = (e) => {
                    e.stopPropagation();
                    const newExpanded = new Set(expandedAttempts);
                    if (isExpanded) {
                      newExpanded.delete(attemptId);
                    } else {
                      newExpanded.add(attemptId);
                    }
                    setExpandedAttempts(newExpanded);
                  };

                  return (
                    <React.Fragment key={attemptId}>
                      <tr 
                        onClick={toggleExpand}
                        style={{ cursor: 'pointer' }}
                        className="table-row-hover"
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <span style={{ userSelect: 'none' }}>
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        </td>
                        <td>{studentLabel}</td>
                        <td>{quizTitle}</td>
                        <td>{date}</td>
                        <td>{score}</td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan="5" className="p-0">
                            <div className="p-3 bg-light">
                              <h6 className="mb-3">Détail des réponses</h6>
                              {questionAttempts.length === 0 ? (
                                <p className="text-muted">Aucun détail disponible.</p>
                              ) : (
                                <div className="row">
                                  {questionAttempts.map((qa, index) => {
                                    const question = qa.question || {};
                                    // Extraire le contenu de la question - peut être un objet ou une IRI
                                    let questionContent = "";
                                    if (question && typeof question === 'object') {
                                      questionContent = question.content || question["@content"] || "";
                                    }
                                    
                                    // Si le contenu est vide ou semble être juste "Question X", utiliser un placeholder
                                    if (!questionContent || questionContent.trim() === "" || questionContent.match(/^Question\s+\d+$/i)) {
                                      questionContent = `Question ${index + 1}`;
                                    }
                                    
                                    const isCorrect = qa.answeredCorrectly === true;
                                    const responses = question.possibleResponses || question.possible_responses || [];
                                    
                                    // Debug pour voir la structure
                                    if (index === 0) {
                                      console.log("[QuestionAttempt] question:", question);
                                      console.log("[QuestionAttempt] questionContent:", questionContent);
                                      console.log("[QuestionAttempt] responses:", responses);
                                      responses.forEach((r, i) => {
                                        console.log(`[QuestionAttempt] Response ${i}:`, r, "is_correct:", r.is_correct, "isCorrect:", r.isCorrect);
                                      });
                                    }

                                    return (
                                      <div key={qa.id || index} className="col-12 mb-3">
                                        <div className={`card ${isCorrect ? 'border-success' : 'border-danger'}`}>
                                          <div className="card-body">
                                            <div className="d-flex align-items-start mb-2">
                                              <span className={`badge ${isCorrect ? 'bg-success' : 'bg-danger'} me-2`}>
                                                {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                              </span>
                                              <strong className="flex-grow-1">Question {index + 1}: {questionContent}</strong>
                                            </div>
                                            {responses.length > 0 && (
                                              <div className="mt-2">
                                                <small className="text-muted">Bonne(s) réponse(s) :</small>
                                                <ul className="mb-0 mt-1">
                                                  {responses
                                                    .filter((response) => {
                                                      return response.is_correct === true || response.isCorrect === true;
                                                    })
                                                    .map((response, respIndex) => {
                                                      return (
                                                        <li key={response.id || respIndex} className="text-success fw-bold">
                                                          {response.content}
                                                        </li>
                                                      );
                                                    })}
                                                </ul>
                                                {responses.filter((r) => r.is_correct === true || r.isCorrect === true).length === 0 && (
                                                  <p className="text-muted mb-0">Aucune bonne réponse trouvée</p>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Home;
