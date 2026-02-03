import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginSuccess } from "../../services/auth.state";
import { login } from "../../services/auth.service";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const res = await login(email, password);

    if (res.success) {
      loginSuccess(res.user, res.roles);
      navigate("/");
    } else {
      if (res.status === 401) {
        setError("Identifiants invalides");
      } else {
        setError(res.message || "Erreur lors de la connexion");
      }
    }
  };

  return (
    <div className="container vh-100 d-flex justify-content-center align-items-center">
      <div className="card shadow p-4" style={{ maxWidth: 400 }}>
        <h1 className="h4 text-center mb-4">Connexion</h1>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <input className="form-control mb-3"
            type="email" placeholder="Email"
            onChange={e => setEmail(e.target.value)}
          />
          <input className="form-control mb-3"
            type="password" placeholder="Mot de passe"
            onChange={e => setPassword(e.target.value)}
          />
          <button className="btn btn-primary w-100">Se connecter</button>
        <p className="text-center mt-3 mb-0">
            Pas encore de compte ? <Link to="/register">Créer un compte</Link>
        </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
