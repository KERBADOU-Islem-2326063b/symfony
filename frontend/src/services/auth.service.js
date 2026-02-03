const API_URL = "http://localhost:8000/api";

export async function login(email, password) {
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
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
      const user = (json && (json.user || json)) || null;
      const roles = (json && json.roles) || (user && user.roles) || [];
      return { success: true, user, roles };
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
