export const API_URL = "http://localhost:8000/api";

export async function login(email, password) {
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    if (res.status === 401) {
      return { success: false, status: 401, message: "Identifiants invalides" };
    }

    let json = null;
    try {
      json = await res.json();
    } catch (e) {
    }

    if (res.ok) {
      const roles = (json && json.roles) || [];

      // Notre LoginSuccessHandler renvoie: { user: "<email>", roles: [...], id: <int> }
      // On normalise en objet user pour que le frontend puisse stocker userId.
      let user = null;
      if (json && typeof json === "object") {
        if (json.user && typeof json.user === "object") {
          user = json.user;
        } else if (typeof json.user === "string") {
          user = {
            id: json.id ?? null,
            email: json.user,
            roles
          };
        } else if (typeof json.id !== "undefined") {
          user = { id: json.id, email, roles };
        }
      }

      return { success: true, user, roles, id: json.id };
    }

    return {
      success: false,
      message: (json && (json.message || json["hydra:description"])) || "Erreur lors de la connexion"
    };
  } catch (e) {
    return { success: false, message: "Erreur réseau" };
  }
}

export async function register(data) {
  try {
    const res = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/ld+json",
        "Accept": "application/ld+json"
      },
      body: JSON.stringify(data)
    });

    let json = null;
    try {
      json = await res.json();
    } catch (e) {
    }

    if (res.ok) {
      return { success: true, user: json };
    }

    return {
      success: false,
      message: (json && (json["hydra:description"] || json.message)) || "Erreur lors de l'inscription"
    };
  } catch (e) {
    return { success: false, message: "Erreur réseau" };
  }
}
