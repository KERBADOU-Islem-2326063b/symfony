export const isAuthenticated = () =>
  localStorage.getItem("auth") === "true";

export const loginSuccess = () =>
  localStorage.setItem("auth", "true");

export const logout = () =>
  localStorage.removeItem("auth");
