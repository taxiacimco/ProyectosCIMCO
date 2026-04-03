/**
 * TAXIA CIMCO - SERVICIO DE LOGICA DE NOTIFICACIONES V12.1
 * Centro de despacho y sincronización de tokens para conductores.
 * Objetivo: Conectar el motor de Firebase con la base de datos de usuarios (Java Backend Sync).
 * Consolidación: Arquitectura Multidispositivo con fcmTokens.
 */

import { db, auth } from "../firebase/firebaseConfig";
import { doc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { solicitarPermisosYObtenerToken, escucharNotificaciones } from "../utils/notificaciones";

/**
 * --- 1. PERSISTENCIA DE TOKENS (NUEVA LÓGICA) ---
 * Sincroniza el token actual con el perfil del usuario en la Ruta Sagrada.
 * Usa arrayUnion para soportar múltiples dispositivos activos.
 */

/**
 * Guarda el fcmToken en la colección de usuarios dentro de la estructura de artefactos.
 * @param {string} token - Token FCM obtenido del navegador/dispositivo.
 */
export const guardarTokenEnBaseDeDatos = async (token) => {
  const user = auth.currentUser;
  if (!user || !token) {
    console.warn("⚠️ [Service] Intento de guardado de token inválido o sin sesión activa.");
    return;
  }

  // Referencia exacta siguiendo la jerarquía de la arquitectura CIMCO
  const userRef = doc(db, 'artifacts', 'taxiacimco-app', 'public', 'data', 'usuarios', user.uid);

  try {
    await updateDoc(userRef, {
      // Usamos fcmTokens como array para permitir múltiples sesiones (multidevice support)
      fcmTokens: arrayUnion(token),
      // Mantenemos fcmToken individual para retrocompatibilidad con servicios legacy de Java
      fcmToken: token,
      lastTokenUpdate: new Date().toISOString()
    });
    console.log("✅ [Service] Token sincronizado con el perfil del conductor (Multidevice Mode).");
  } catch (error) {
    console.error("❌ [Service] Error al sincronizar token con Firestore:", error);
  }
};

/**
 * --- 2. INICIALIZACIÓN Y ORQUESTACIÓN ---
 * Orquesta la recuperación del token y su vinculación con el perfil del usuario.
 */

/**
 * Punto de entrada para activar las notificaciones al iniciar la sesión del conductor.
 */
export const inicializarNotificaciones = async () => {
  const user = auth.currentUser;
  if (!user) {
    console.warn("⚠️ [Service] No se puede inicializar notificaciones: Sesión no encontrada.");
    return;
  }

  try {
    const token = await solicitarPermisosYObtenerToken();
    
    if (token) {
      // Invocamos la persistencia atómica en la base de datos
      await guardarTokenEnBaseDeDatos(token);

      // Activamos el listener de mensajes en primer plano (Foreground)
      escucharNotificaciones((payload) => {
        console.log("🚨 [Service] Notificación recibida en tiempo real:", payload);
        
        // Ejecutamos la retroalimentación visual y sonora definida en CIMCO
        mostrarAlertaVisual(
          payload.notification?.title || "NUEVO SERVICIO", 
          payload.notification?.body || "Hay una carga disponible cerca de tu ubicación."
        );
        reproducirSonidoAlerta();
      });
    }
  } catch (error) {
    console.error("❌ [Service] Falla crítica en el sistema de notificaciones:", error);
  }
};

/**
 * --- 3. LÓGICA DE INTERFAZ Y RESPUESTA (UI/UX) ---
 * Gestiona la visibilidad y las alertas sonoras para garantizar la atención del conductor.
 */

/**
 * Dispara la notificación nativa del sistema o alertas visuales personalizadas.
 */
export const mostrarAlertaVisual = (titulo, cuerpo) => {
  if (!("Notification" in window)) return;
  
  if (Notification.permission === "granted") {
    new Notification(titulo, { 
      body: cuerpo, 
      icon: '/logo-cimco.png',
      tag: 'nuevo-viaje', // Previene el spam agrupando notificaciones del mismo tipo
      silent: false
    });
  }
};

/**
 * Retroalimentación Auditiva y Háptica.
 * Hace que el dispositivo reaccione físicamente ante una nueva asignación.
 */
export const reproducirSonidoAlerta = () => {
  const audio = new Audio('/sounds/alert-taxi.mp3');
  
  audio.play().catch(e => {
    console.log("ℹ️ [Service] Bloqueo de reproducción automática: Se requiere interacción previa.");
  });
  
  // Vibración táctica para entornos ruidosos
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200, 100, 500]);
  }
};

/**
 * Mantenimiento de compatibilidad para notificaciones locales simples.
 */
export const enviarNotificacionLocal = (titulo, mensaje) => {
  mostrarAlertaVisual(titulo, mensaje);
  reproducirSonidoAlerta();
};