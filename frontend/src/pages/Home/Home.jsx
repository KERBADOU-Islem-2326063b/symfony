import Header from "../../components/Header";
import { useNavigate } from "react-router-dom";
import { logout, getRoles } from "../../services/auth.state";
import { useState, useEffect } from "react";
import { FaChevronLeft, FaChevronRight, FaFileAlt, FaVideo } from "react-icons/fa";

function Carousel({ items, renderItem, icon }) {
  const [start, setStart] = useState(0);
  const visibleCount = 3;
  const max = items.length;
  const prev = () => setStart(s => (s - 1 + max) % max);
  const next = () => setStart(s => (s + 1) % max);
  const getVisible = () => {
    let arr = [];
    for (let i = 0; i < visibleCount; i++) {
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
        {getVisible().map((item, idx) => renderItem(item, icon, idx))}
      </div>
      <div className="progress mt-3" style={{height: 4}}>
        <div className="progress-bar bg-primary" style={{width: `${((start+1)/max)*100}%`}}></div>
      </div>
    </div>
  );
}

function Home() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);

  useEffect(() => {
    const roles = getRoles();
    setRole(roles.includes("ROLE_TEACHER") ? "ROLE_TEACHER" : roles.includes("ROLE_STUDENT") ? "ROLE_STUDENT" : null);
  }, []);

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

  return (
    <div className="bg-light min-vh-100">
      <Header />
      <div className="container my-5">
        <h4 className="mb-3">🎥 Vidéos de cours</h4>
        <Carousel
          items={videos}
          icon={<FaVideo size={48} className="text-primary mb-2" />}
          renderItem={(v, icon) => (
            <div className="card shadow-sm text-center">
              <div className="card-body">
                <h6>{v.title}</h6>
                {icon}
                <small>{v.teacher} • {v.duration}</small>
                <div className="mt-3 d-flex gap-2 justify-content-center">
                  {role === "ROLE_TEACHER" && (
                    <button className="btn btn-success btn-sm">Générer QCM</button>
                  )}
                  {role === "ROLE_STUDENT" && (
                    <button className="btn btn-primary btn-sm">Passer le QCM</button>
                  )}
                </div>
              </div>
            </div>
          )}
        />
        <h4 className="mt-5 mb-3">📄 Documents de cours</h4>
        <Carousel
          items={documents}
          icon={<FaFileAlt size={48} className="text-secondary mb-2" />}
          renderItem={(d, icon) => (
            <div className="card shadow-sm text-center">
              <div className="card-body">
                <h6>{d.title}</h6>
                {icon}
                <small>{d.pages} pages</small>
                <div className="mt-3 d-flex gap-2 justify-content-center">
                  {role === "ROLE_TEACHER" && (
                    <button className="btn btn-success btn-sm">Générer QCM</button>
                  )}
                  {role === "ROLE_STUDENT" && (
                    <button className="btn btn-primary btn-sm">Passer le QCM</button>
                  )}
                </div>
              </div>
            </div>
          )}
        />
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
      </div>
    </div>
  );
}

export default Home;
