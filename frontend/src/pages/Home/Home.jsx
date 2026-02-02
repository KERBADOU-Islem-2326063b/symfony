import { useNavigate } from "react-router-dom";
import { logout } from "../../services/auth.state";

const role = localStorage.getItem("role") || "student";

const videos = [
  { id: 1, title: "Introduction à Symfony", teacher: "Pr. Martin", duration: "45 min" },
  { id: 2, title: "Security Bundle", teacher: "Pr. Dubois", duration: "60 min" },
  { id: 3, title: "API Platform", teacher: "Pr. Bernard", duration: "50 min" }
];

const documents = [
  { id: 1, title: "Guide Symfony 7", pages: 120 },
  { id: 2, title: "Architecture MVC", pages: 85 },
  { id: 3, title: "REST API Best Practices", pages: 60 }
];

const results = [
  { student: "Alice Martin", qcm: "Intro Symfony", date: "15/01/2026", score: "18/20" },
  { student: "Thomas Dubois", qcm: "Security Bundle", date: "14/01/2026", score: "15/20" }
];

function Home() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="bg-light min-vh-100">

      {/* Header */}
      <div className="bg-primary text-white py-5 text-center">
        <h1 className="h3">Plateforme d’Apprentissage Moderne</h1>
        <p className="mb-0">Cours, documents et QCM générés par IA</p>
      </div>

      <div className="container my-5">

        {/* Vidéos */}
        <h4 className="mb-3">🎥 Vidéos de cours</h4>
        <div className="row g-4">
          {videos.map(v => (
            <div className="col-md-4" key={v.id}>
              <div className="card shadow-sm">
                <div className="card-body">
                  <h6>{v.title}</h6>
                  <small>{v.teacher} • {v.duration}</small>
                  <div className="mt-3 d-flex gap-2">
                    {role === "teacher" && (
                      <button className="btn btn-success btn-sm">Générer QCM</button>
                    )}
                    {role === "student" && (
                      <button className="btn btn-primary btn-sm">Passer le QCM</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Documents */}
        <h4 className="mt-5 mb-3">📄 Documents de cours</h4>
        <div className="row g-4">
          {documents.map(d => (
            <div className="col-md-4" key={d.id}>
              <div className="card shadow-sm">
                <div className="card-body">
                  <h6>{d.title}</h6>
                  <small>{d.pages} pages</small>
                  <div className="mt-3 d-flex gap-2">
                    {role === "teacher" && (
                      <button className="btn btn-success btn-sm">Générer QCM</button>
                    )}
                    {role === "student" && (
                      <button className="btn btn-primary btn-sm">Passer le QCM</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Résultats QCM */}
        <h4 className="mt-5 mb-3">📊 Résultats des QCM</h4>
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
              {results.map((r, i) => (
                <tr key={i}>
                  <td>{r.student}</td>
                  <td>{r.qcm}</td>
                  <td>{r.date}</td>
                  <td>{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center mt-4">
          <button className="btn btn-outline-danger" onClick={handleLogout}>
            Se déconnecter
          </button>
        </div>

      </div>
    </div>
  );
}

export default Home;
