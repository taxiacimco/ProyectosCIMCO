import { auth } from "./firebase-config-pasajero.js";
import { signOut } from "../firebase/firebase-loader.js";

const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");

window.addEventListener("DOMContentLoaded", () => {
  const email = localStorage.getItem("pasajeroEmail") || "Anónimo";
  userInfo.textContent = `👤 ${email}`;
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("pasajeroEmail");
      window.location.href = "./login-pasajero.html";
    } catch (err) {
      console.error("❌ Error al cerrar sesión:", err);
    }
  });
}

