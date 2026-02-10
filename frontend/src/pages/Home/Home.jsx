import Header from "../../components/Header";
import { useState, useEffect } from "react";
import { getRoles, getUser, getUserId } from "../../services/auth.state";
import { API_URL } from "../../services/auth.service";
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
      // On se base sur le format du titre dans UploadController
      const match = quiz.title.match(/QCM généré à partir de (.+)$/i);
      if (match && match[1]) {
        const filename = match[1].trim();
        map[filename] = quiz;
      }
    });
    return map;
  };

  const computeScoreFromQuestionAttempts = (questionAttempts) => {
    if (!questionAttempts || questionAttempts.length === 0) return null;
    const total = questionAttempts.length;
    const correct = questionAttempts.filter((qa) => qa.answeredCorrectly).length;
    const noteSur20 = (correct / total) * 20;
    return `${noteSur20.toFixed(1)}/20`;
  };

  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString();
  };

  const extractIdFromResource = (resource) => {
    if (!resource) return null;
    if (typeof resource.id !== "undefined" && resource.id !== null) {
      return String(resource.id);
    }
    if (typeof resource["@id"] === "string") {
      const parts = resource["@id"].split("/");
      return parts[parts.length - 1] || null;
    }
    return null;
  };

  const loadHomeData = async () => {
    setDocumentsError("");
    setAttemptsError("");
    setLoadingDocuments(true);
    setLoadingAttempts(true);

    try {
      const [docsRes, quizzesRes, attemptsRes] = await Promise.all([
        fetch(`${BASE_URL}/uploads/documents`),
        fetch(`${API_URL}/quizzes`),
        fetch(`${API_URL}/quiz_attempts`),
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
      if (attemptsRes.ok) {
        let attemptsJson = {};
        try {
          attemptsJson = await attemptsRes.json();
        } catch (e) {
          attemptsJson = {};
        }
        const allAttempts = Array.isArray(attemptsJson["hydra:member"])
          ? attemptsJson["hydra:member"]
          : Array.isArray(attemptsJson.member)
          ? attemptsJson.member
          : Array.isArray(attemptsJson)
          ? attemptsJson
          : [];

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

        setQuizAttempts(attemptsWithScore);
        setLoadingAttempts(false);
      } else {
        setAttemptsError(
          "Impossible de charger les tentatives de QCM pour le moment."
        );
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
    console.log("[Home] handleSubmitQuiz activeQuiz:", activeQuiz);
    console.log("[Home] handleSubmitQuiz currentUserId:", currentUserId);

    if (!activeQuiz || !currentUserId) {
      setSubmitError(
        "Impossible d'envoyer le QCM : utilisateur non identifié ou QCM introuvable."
      );
      return;
    }

    const questions = activeQuiz.questions || [];
    if (questions.length === 0) {
      setSubmitError("Ce QCM ne contient aucune question.");
      return;
    }

    const beginDate = quizStart || new Date();
    const endDate = new Date();

    // Calcul du score côté frontend à partir des réponses choisies
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
      const isCorrect = selectedResponse ? !!selectedResponse.is_correct : false;
      if (isCorrect) correctCount += 1;

      questionPayloads.push({
        question: q,
        answeredCorrectly: isCorrect,
      });
    });

    const total = questions.length;
    const noteSur20 = total > 0 ? ((correctCount / total) * 20).toFixed(1) : "0.0";

    setSubmitLoading(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      // Création du QuizAttempt
      const quizIri =
        activeQuiz["@id"] || `/api/quizzes/${activeQuiz.id}`;

      const quizAttemptRes = await fetch(`${API_URL}/quiz_attempts`, {
        method: "POST",
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
        throw new Error(
          "Erreur lors de la création de la tentative de QCM."
        );
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

      setSubmitSuccess(
        `Vos réponses ont été enregistrées. Résultat : ${noteSur20}/20.`
      );
      setSubmitLoading(false);

      // On recharge la liste des tentatives pour mettre à jour le tableau
      loadHomeData();
    } catch (e) {
      setSubmitError(
        e.message ||
          "Erreur lors de l'envoi de vos réponses. Veuillez réessayer."
      );
      setSubmitLoading(false);
    }
  };

  return (
    <div className="bg-light min-vh-100">
      <Header />
      <div className="container my-5">
        <h4 className="mb-3">📄 Documents de cours</h4>
        {documentsError && (
          <div className="alert alert-danger">{documentsError}</div>
        )}
        {loadingDocuments ? (
          <div>Chargement des documents...</div>
        ) : (
          <Carousel
            items={documents}
            icon={<FaFileAlt size={48} className="text-secondary mb-2" />}
            renderItem={(d, icon) => (
              <div className="card shadow-sm text-center">
                <div className="card-body">
                  <h6>{d.name}</h6>
                  {icon}
                  <small>{(d.size / 1024).toFixed(1)} Ko</small>
                  <div className="mt-3 d-flex gap-2 justify-content-center">
                    {role === "ROLE_TEACHER" && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleGenerateQuiz(d)}
                        disabled={!!d.quiz || generatingFor === d.name}
                      >
                        {d.quiz
                          ? "QCM généré"
                          : generatingFor === d.name
                          ? "Génération en cours..."
                          : "Générer le QCM"}
                      </button>
                    )}
                    {role === "ROLE_STUDENT" && d.quiz && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleStartQuiz(d)}
                      >
                        Passer le QCM
                      </button>
                    )}
                  </div>
                  {role === "ROLE_STUDENT" && !d.quiz && (
                    <div className="mt-2">
                      <small className="text-muted">
                        QCM non disponible pour ce document.
                      </small>
                    </div>
                  )}
                </div>
              </div>
            )}
          />
        )}

        {activeQuiz && (
          <div className="mt-5">
            <h4 className="mb-3">
              QCM : {activeQuiz.title}{" "}
              {activeDocument ? `(${activeDocument.name})` : ""}
            </h4>
            {submitError && (
              <div className="alert alert-danger">{submitError}</div>
            )}
            {submitSuccess && (
              <div className="alert alert-success">{submitSuccess}</div>
            )}
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                {(activeQuiz.questions || []).map((q, index) => {
                  const qId = q.id || extractIdFromResource(q);
                  const responses =
                    q.possible_responses || q.possibleResponses || [];
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
