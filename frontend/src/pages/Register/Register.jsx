import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../../services/auth.service";
import { loginSuccess } from "../../services/auth.state";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "",
    terms: false
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.terms) {
      setError("Veuillez accepter les conditions pour continuer.");
      return;
    }

    const res = await register(form);

    if (res.success) {
      loginSuccess();
      navigate("/");
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="container vh-100 d-flex justify-content-center align-items-center">
      <div className="card shadow p-4" style={{ maxWidth: 450 }}>
        <h1 className="h4 text-center mb-4">Inscription</h1>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            className="form-control mb-3"
            placeholder="Email"
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
          />

          <input
            className="form-control mb-3"
            type="password"
            placeholder="Mot de passe"
            onChange={e => setForm({ ...form, password: e.target.value })}
            required
          />

          <div className="mb-3">
            <div className="form-check">
              <input
                type="radio"
                name="role"
                className="form-check-input"
                onChange={() => setForm({ ...form, role: "student" })}
                required
              />
              <label className="form-check-label">Élève</label>
            </div>

            <div className="form-check">
              <input
                type="radio"
                name="role"
                className="form-check-input"
                onChange={() => setForm({ ...form, role: "teacher" })}
              />
              <label className="form-check-label">Professeur</label>
            </div>
          </div>

          <div className="form-check mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              onChange={e => setForm({ ...form, terms: e.target.checked })}
            />
            <label className="form-check-label">
              J’accepte les conditions d’utilisation
            </label>
          </div>

          <button className="btn btn-success w-100">
            S’inscrire
          </button>
        </form>
      </div>
    </div>
  );
}

export default Register;
