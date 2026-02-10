import { useNavigate } from "react-router-dom";
import { logout, getUser, getRoles } from "../services/auth.state";

function Header() {
  const navigate = useNavigate();
  const user = getUser();

  // On s'assure de ne JAMAIS rendre un objet React.
  // Format attendu: user = { id, email, roles } (ou ancien: string email)
  const displayUserText =
    typeof user === "string"
      ? user
      : user && typeof user === "object" && typeof user.email === "string"
      ? user.email
      : "";
  const rolesArray = getRoles();
  const displayRoles = (Array.isArray(rolesArray) ? rolesArray : [])
    .filter(r => r !== "ROLE_USER")
    .map(r => r === "ROLE_TEACHER" ? "Professeur" : r === "ROLE_STUDENT" ? "Élève" : r)
    .join(", ");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="bg-primary text-white py-3 px-4 d-flex justify-content-between align-items-center">
      <div>
        <span className="fw-bold">Plateforme d’Apprentissage Moderne</span>
      </div>
      <div className="d-flex align-items-center gap-3">
        {displayUserText && <span>{displayUserText}</span>}
        {displayRoles && <span className="badge bg-light text-primary">{displayRoles}</span>}
        <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>Se déconnecter</button>
      </div>
    </div>
  );
}

export default Header;
