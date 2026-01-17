// ============================================================
// 🧩 Crear Usuarios (solo CEO)
// ============================================================

import { auth, db } from "./firebase-config-ceo.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "../firebase/firebase-loader.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "../firebase/firebase-loader.js";

// Verificar sesión y rol
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("⚠️ No tienes sesión activa. Inicia sesión como CEO.");
    window.location.href = "/admin/login-ceo.html";
    return;
  }

  // Solo CEO puede acceder
  if (!user.email.includes("ceo")) {
    alert("⛔ Acceso restringido. Solo el CEO puede crear nuevos usuarios.");
    window.location.href = "/admin/ceo-panel.html";
  }
});

const form = document.getElementById("crearForm");
const mensaje = document.getElementById("mensaje");
const logoutBtn = document.getElementById("logoutBtn");

// ============================================================
// 🧠 Crear usuario nuevo (Auth + Firestore)
// ============================================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  const password = form.password.value.trim();
  const rol = form.rol.value;

  if (!email || !password || !rol) {
    mensaje.textContent = "Por favor completa todos los campos.";
    mensaje.className = "text-yellow-400 text-center";
    return;
  }

  try {
    // Crear en Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Guardar en Firestore (colección usuarios)
    await setDoc(doc(db, "usuarios", user.uid), {
      email,
      rol,
      creado: serverTimestamp(),
      activo: true
    });

    mensaje.textContent = `✅ Usuario creado: ${email} (${rol})`;
    mensaje.className = "text-green-400 text-center";
    form.reset();
  } catch (error) {
    console.error("❌ Error al crear usuario:", error);
    mensaje.textContent = `Error: ${error.message}`;
    mensaje.className = "text-red-400 text-center";
  }
});

// ============================================================
// 🔒 Logout
// ============================================================
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "/admin/login-ceo.html";
});

