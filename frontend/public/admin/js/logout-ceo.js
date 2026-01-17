// ============================================================
//  🔐 login-ceo.js — Inicio de sesión del panel ADMIN / CEO
//  Proyecto: TAXIA CIMCO
//  Autor: Carlos Mario Fuentes García
//  Integración: Firebase Auth + Firestore Roles
// ============================================================

import { auth, db, loginAdmin } from "./firebase-config-ceo.js";
import {
  collection,
  query,
  where,
  getDocs,
} from "../firebase/firebase-loader.js";
import { onAuthStateChanged } from "../firebase/firebase-loader.js";

// ------------------------------------------------------------
//  Selectores
// ------------------------------------------------------------
const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const btnLogin = document.getElementById("btnLogin");
const mensaje = document.getElementById("mensaje");

// ------------------------------------------------------------
//  Mostrar mensajes al usuario
// ------------------------------------------------------------
function mostrarMensaje(texto, tipo = "info") {
  mensaje.textContent = texto;
  mensaje.className = `mt-2 text-sm ${tipo === "error" ? "text-red-500" : "text-green-500"}`;
  mensaje.style.display = "block";
}

// ------------------------------------------------------------
//  Verificar si el usuario tiene rol de CEO/Admin
// ------------------------------------------------------------
async function verificarRolCEO(uid) {
  const ref = collection(db, "usuarios");
  const q = query(ref, where("uid", "==", uid), where("rol", "==", "CEO"));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// ------------------------------------------------------------
//  Evento de inicio de sesión
// ------------------------------------------------------------
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    mostrarMensaje("⚠️ Ingresa correo y contraseña.", "error");
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = "Iniciando sesión...";

  try {
    const user = await loginAdmin(email, password);
    const esCEO = await verificarRolCEO(user.uid);

    if (esCEO) {
      mostrarMensaje("✅ Acceso permitido. Redirigiendo...", "success");
      setTimeout(() => {
        window.location.href = "/admin/ceo-dashboard.html";
      }, 1500);
    } else {
      mostrarMensaje("❌ No tienes permisos para acceder al panel CEO.", "error");
      await auth.signOut();
    }
  } catch (err) {
    mostrarMensaje("❌ Error al iniciar sesión: " + err.message, "error");
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = "Ingresar";
  }
});

// ------------------------------------------------------------
//  Verificar sesión activa al cargar el login
// ------------------------------------------------------------
onAuthStateChanged(auth, (user) => {
  if (user) {
    verificarRolCEO(user.uid).then((esCEO) => {
      if (esCEO) {
        console.log("🔁 Sesión CEO detectada. Redirigiendo...");
        window.location.href = "/admin/ceo-dashboard.html";
      } else {
        console.warn("🚫 Sesión no autorizada para este panel.");
        auth.signOut();
      }
    });
  } else {
    console.log("ℹ️ Sin sesión activa, mostrando formulario de login.");
  }
});

console.log("✅ login-ceo.js cargado correctamente.");

