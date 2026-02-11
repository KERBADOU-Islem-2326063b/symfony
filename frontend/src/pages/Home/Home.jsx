import Header from "../../components/Header";
import { useState, useEffect } from "react";
import { getRoles, getUser, getUserId } from "../../services/auth.state";
import { API_URL } from "../../services/auth.service";
import {
  fetchCourses,
  uploadCourse,
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
  const [showQuizModal, setShowQuizModal] = useState(false);

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

  const handleAnswerChange = (questionId, responseId) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: responseId,
    }));
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
      setCourses(result.courses);
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
    setShowQuizModal(true);
  };

  const handleGenerateQuizForCourse = async () => {
    if (!generatingQuizForCourse) return;
    
    setUploadError("");
    setUploadSuccess("");

    const result = await generateQuizForCourse(generatingQuizForCourse, numberOfQuestions);

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

  const handleViewCourse = (course) => {
    if (!course || !course.id) return;
    const viewUrl = getCourseViewUrl(course.id);
    setViewingCourse({ ...course, viewUrl });
  };

  const handleCloseViewer = () => {
    setViewingCourse(null);
  };

  return (
    <div className="bg-light min-vh-100">
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
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
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
                  {viewingCourse.fileName?.endsWith(".pdf") ? (
                    <iframe
                      src={viewingCourse.viewUrl}
                      style={{ width: "100%", height: "70vh", border: "none" }}
                      title={viewingCourse.name}
                    />
                  ) : viewingCourse.fileName?.endsWith(".mp4") ? (
                    <video
                      src={viewingCourse.viewUrl}
                      controls
                      style={{ width: "100%", maxHeight: "70vh" }}
                    >
                      Votre navigateur ne supporte pas la lecture vidéo.
                    </video>
                  ) : (
                    <div className="alert alert-warning">
                      Type de fichier non supporté pour la visualisation
                    </div>
                  )}
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
                    />
                    <small className="form-text text-muted">
                      Le QCM sera généré avec {numberOfQuestions} question{numberOfQuestions > 1 ? 's' : ''}.
                    </small>
                  </div>
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
                    disabled={!numberOfQuestions || numberOfQuestions < 1 || numberOfQuestions > 50}
                  >
                    Générer le QCM
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
                  
                  // Debug pour la première question
                  if (index === 0) {
                    console.log("[Quiz] Question:", q);
                    console.log("[Quiz] Responses (possibleResponses):", q.possibleResponses);
                    console.log("[Quiz] Responses (possible_responses):", q.possible_responses);
                    console.log("[Quiz] All question keys:", Object.keys(q));
                  }
                  
                  if (!responses || responses.length === 0) {
                    console.warn(`[Quiz] Question ${index + 1} n'a pas de réponses disponibles`);
                  }
                  
                  return (
                    <div key={qId || index} className="mb-4 text-start">
                      <p className="fw-bold">
                        Question {index + 1}: {q.content}
                      </p>
                      <div>
                        {responses.map((r) => {
                          const rId = r.id || extractIdFromResource(r);
                          return (
                            <div className="form-check" key={rId}>
                              <input
                                className="form-check-input"
                                type="radio"
                                name={`question-${qId}`}
                                id={`q${qId}-r${rId}`}
                                checked={
                                  String(answers[qId]) === String(rId)
                                }
                                onChange={() =>
                                  handleAnswerChange(qId, rId)
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
                <th>Étudiant</th>
                <th>QCM</th>
                <th>Date</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {loadingAttempts ? (
                <tr>
                  <td colSpan="4">Chargement des résultats...</td>
                </tr>
              ) : quizAttempts.length === 0 ? (
                <tr>
                  <td colSpan="4">Aucune tentative de QCM pour le moment.</td>
                </tr>
              ) : (
                quizAttempts.map((attempt) => {
                  const quizTitle =
                    attempt.quiz && attempt.quiz.title
                      ? attempt.quiz.title
                      : "QCM";
                  const date = formatDate(attempt.endTimestamp);
                  const score =
                    attempt._computedScore ||
                    computeScoreFromQuestionAttempts(
                      attempt.questionAttempts || []
                    ) ||
                    "-";
                  const studentLabel =
                    (currentUser && currentUser.email) || "Vous";

                  return (
                    <tr key={attempt.id || attempt["@id"]}>
                      <td>{studentLabel}</td>
                      <td>{quizTitle}</td>
                      <td>{date}</td>
                      <td>{score}</td>
                    </tr>
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
