// ============================================================
//  ceo-guard.js — Protección de acceso al panel CEO
// ============================================================

import { auth, db } from "../admin/js/firebase-config-ceo.js";
import { onAuthStateChanged, signOut } from "../firebase/firebase-loader.js";
import { collection, query, where, getDocs } from "../firebase/firebase-loader.js";

export const protegerPaginaCEO = () => {
  console.log("🔐 Verificando autenticación del CEO...");

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      console.warn("⚠️ No hay sesión activa. Redirigiendo al login...");
      window.location.href = "login-ceo.html";
      return;
    }

    try {
      const q = query(collection(db, "usuarios"), where("email", "==", user.email));
      const snap = await getDocs(q);

      if (snap.empty) {
        console.error("❌ No se encontró el documento del usuario en Firestore.");
        await signOut(auth);
        window.location.href = "login-ceo.html";
        return;
      }

      const rol = (snap.docs[0].data().rol || "").toLowerCase();
      console.log("👤 Usuario autenticado con rol:", rol);

      if (rol !== "admin" && rol !== "ceo") {
        console.error("🚫 Acceso denegado. Rol no autorizado:", rol);
        await signOut(auth);
        window.location.href = "login-ceo.html?error=unauthorized";
      }

    } catch (err) {
      console.error("❌ Error al verificar el rol en Firestore:", err);
      window.location.href = "login-ceo.html";
    }
  });
};

// Ejecutar automáticamente al cargar
protegerPaginaCEO();

