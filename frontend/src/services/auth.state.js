export const isAuthenticated = () =>
  localStorage.getItem("auth") === "true";

export const loginSuccess = (user, roles, userId) => {
  localStorage.setItem("auth", "true");
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));

    // On essaie de récupérer et stocker l'identifiant utilisateur
    // Priorité: paramètre userId > user.id > user["@id"]
    let idToStore = userId;
    if (!idToStore && user && typeof user === "object") {
      idToStore = user.id ?? (typeof user["@id"] === "string" ? user["@id"].split("/").pop() : null);
    }
    if (idToStore) {
      localStorage.setItem("userId", String(idToStore));
    }
  }
  if (roles) localStorage.setItem("roles", JSON.stringify(roles));
};

export const getUser = () => {
  const user = localStorage.getItem("user");
  console.log("[auth.state] getUser raw:", user);
  if (!user) return null;
  try {
    const parsed = JSON.parse(user);
    // Ancien format: juste une string email
    if (typeof parsed === "string") {
      return { email: parsed };
    }
    return parsed;
  } catch (e) {
    return null;
  }
};

export const getUserId = () => {
  // Si déjà présent, on le renvoie directement
  const stored = localStorage.getItem("userId");
  console.log("[auth.state] getUserId stored:", stored);
  if (stored) {
    return stored;
  }

  // Sinon, on tente de le recalculer à partir de l'objet user déjà stocké
  const user = getUser();
  if (user) {
    console.log("[auth.state] getUserId deriving from user:", user);
    const rawId =
      user.id ??
      (typeof user["@id"] === "string"
        ? user["@id"].split("/").pop()
        : null);
    if (rawId) {
      const idStr = String(rawId);
      localStorage.setItem("userId", idStr);
      return idStr;
    }
  }

  return null;
};

export const getRoles = () => {
  const roles = localStorage.getItem("roles");
  if (!roles) return [];
  try {
    const parsed = JSON.parse(roles);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

export const logout = () => {
  localStorage.removeItem("auth");
  localStorage.removeItem("user");
  localStorage.removeItem("roles");
  localStorage.removeItem("userId");
};
