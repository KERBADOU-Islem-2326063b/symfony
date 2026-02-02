const API_URL = "http://localhost:8000/api/users";

const fakeDelay = (ms) => new Promise(r => setTimeout(r, ms));

export async function login(email, password) {
  try {
    const res = await fetch(API_URL);
    if (res.status === 200) return { success: true };
    return { success: false, message: "Identifiants invalides" };
  } catch {
    await fakeDelay(800);
    return email && password
      ? { success: true, mock: true }
      : { success: false, message: "Erreur réseau" };
  }
}

export async function register(data) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (res.status === 200 || res.status === 201) return { success: true };
    return { success: false, message: "Erreur inscription" };
  } catch {
    await fakeDelay(800);
    return data.email && data.password
      ? { success: true, mock: true }
      : { success: false, message: "Erreur réseau" };
  }
}
