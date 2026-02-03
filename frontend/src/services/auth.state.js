export const isAuthenticated = () =>
  localStorage.getItem("auth") === "true";

export const loginSuccess = (user, roles) => {
  localStorage.setItem("auth", "true");
  if (user) localStorage.setItem("user", JSON.stringify(user));
  if (roles) localStorage.setItem("roles", JSON.stringify(roles));
};

export const getUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export const getRoles = () => {
  const roles = localStorage.getItem("roles");
  return roles ? JSON.parse(roles) : [];
};

export const logout = () => {
  localStorage.removeItem("auth");
  localStorage.removeItem("user");
  localStorage.removeItem("roles");
};
