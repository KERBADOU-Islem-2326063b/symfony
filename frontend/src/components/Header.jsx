import { logout, getUser, getRoles } from "../services/auth.state";
import { API_URL } from "../services/auth.service";

function Header() {
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

  const handleLogout = async () => {
    try {
      // Appeler le backend pour déconnecter la session côté serveur
      const baseUrl = API_URL.replace('/api', '');
      await fetch(`${baseUrl}/logout`, {
        method: "POST",
        credentials: 'include',
      }).catch(() => {
        // Ignorer les erreurs de déconnexion côté serveur
      });
    } catch (e) {
      // Ignorer les erreurs
    }
    
    // Nettoyer le localStorage
    logout();
    
    // Forcer un rechargement complet de la page pour éviter les conflits de navigation
    // Cela nettoie tout l'état React et évite les boucles de redirection
    window.location.href = "/login";
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
