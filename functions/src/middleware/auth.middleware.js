// src/middleware/auth.middleware.js
import admin from "../firebase/firebase-init.js";

/**
 * ==============================
 * authMiddleware (Firebase JWT)
 * ==============================
 * - Verifica ID Token de Firebase
 * - Detecta tokens revocados
 * - Extrae Custom Claims (role)
 * - Expone identidad en req.user
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token de autenticación no proporcionado",
      });
    }

    const token = authHeader.split(" ")[1];

    // 🔐 Verificación fuerte (incluye revocación)
    // El segundo argumento 'true' fuerza la verificación de revocación.
    const decodedToken = await admin.auth().verifyIdToken(token, true);

    // 🔒 Validación de Custom Claims: Aseguramos que el rol exista
    if (!decodedToken.role) {
      return res.status(401).json({
        success: false,
        message: "Token sin rol asignado",
      });
    }

    /**
     * req.user es la ÚNICA fuente de identidad para los controladores.
     * Contiene la información de seguridad esencial extraída del JWT.
     */
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      role: decodedToken.role,
    };

    next();
  } catch (error) {
    // Si la verificación falla (expirado, inválido, revocado, etc.)
    console.error("❌ Auth error:", error.code || error.message);

    return res.status(401).json({
      success: false,
      message: "Token inválido, expirado o revocado",
    });
  }
};

export default authMiddleware;