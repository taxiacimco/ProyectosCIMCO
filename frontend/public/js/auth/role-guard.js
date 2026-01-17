// role-guard.js
// Protección automática basada en rol usando Firebase

import { auth, db } from "../firebase/firebase-loader.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const scriptTag = document.currentScript;

// Leer el rol que esta página requiere
const requiredRole = scriptTag.dataset.rol;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.warn("No autenticado → redirigiendo a login.html");
        window.location.replace("../login.html");
        return;
    }

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        console.error("Usuario no registrado → logout");
        auth.signOut();
        window.location.replace("../login.html");
        return;
    }

    const userRole = snap.data().rol;

    if (userRole !== requiredRole) {
        alert("No tienes permisos para acceder a esta sección.");
        auth.signOut();
        window.location.replace("../login.html");
        return;
    }

    console.log("✔ Acceso permitido a:", requiredRole);
});
