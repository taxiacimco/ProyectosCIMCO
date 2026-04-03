/**
 * JAGUA PRO / CIMCO - SISTEMA DE NOTIFICACIONES V12.0
 * Integración: SweetAlert2 (UI) + Firebase Cloud Messaging (Motor).
 * Consolidación: Editor Senior de Documentación Técnica.
 */

import Swal from 'sweetalert2';
import { messaging, db } from "../firebase/firebaseConfig";
import { getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

/**
 * --- 1. ALERTAS VISUALES PREMIUM (SweetAlert2) ---
 * Estilo Dark/Cian unificado con la estética industrial de la terminal.
 */
const toastConfig = {
  background: '#0f172a',
  color: '#fff',
  confirmButtonColor: '#06b6d4',
  borderRadius: '2rem',
};

/**
 * Notificación de éxito para operaciones de sistema
 */
export const notificarExito = (mensaje) => {
  Swal.fire({
    ...toastConfig,
    icon: 'success',
    title: 'OPERACIÓN EXITOSA',
    text: mensaje,
    timer: 2500,
    showConfirmButton: false,
    iconColor: '#10b981'
  });
};

/**
 * Notificación de error para fallos tácticos o de conexión
 */
export const notificarError = (mensaje) => {
  Swal.fire({
    ...toastConfig,
    icon: 'error',
    title: 'ERROR DE SISTEMA',
    text: mensaje || 'Fallo en la conexión táctica',
    iconColor: '#ef4444'
  });
};

/**
 * Alerta de proximidad para conductores (Uso en PasajeroPanel)
 */
export const notificarLlegadaConductor = (nombreConductor) => {
  Swal.fire({
    ...toastConfig,
    icon: 'info',
    title: 'CONDUCTOR EN CAMINO',
    text: `Tu unidad ${nombreConductor} ha llegado al punto de recogida.`,
    confirmButtonText: 'ENTENDIDO',
    iconColor: '#06b6d4'
  });
};

/**
 * --- 2. MOTOR DE FIREBASE CLOUD MESSAGING (FCM) ---
 * Gestión de permisos, recuperación de tokens y sincronización de perfiles.
 */

/**
 * Solicita permisos al navegador y recupera el Token único del dispositivo.
 * @returns {Promise<string|null>} Token FCM o null si falla.
 */
export const solicitarPermisosYObtenerToken = async () => {
  try {
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") {
      console.error("❌ CIMCO-PUSH: Permiso de notificaciones denegado.");
      return null;
    }

    // El VAPID KEY se obtiene de la consola de Firebase -> Cloud Messaging
    const token = await getToken(messaging, { 
      vapidKey: "TU_VAPID_KEY_AQUI" 
    });
    
    return token;
  } catch (error) {
    console.error("❌ Error al obtener token FCM:", error);
    return null;
  }
};

/**
 * Vincula el token del dispositivo con el perfil del usuario en Firestore.
 * Utiliza la ruta maestra de 'artifacts' para sincronización con el AdminDashboard.
 */
export const sincronizarTokenUsuario = async (userId) => {
  try {
    const token = await solicitarPermisosYObtenerToken();

    if (token) {
      const userRef = doc(db, 'artifacts', 'taxiacimco-app', 'public', 'data', 'usuarios', userId);
      
      await updateDoc(userRef, { 
        fcmToken: token,
        lastTokenUpdate: serverTimestamp(),
        dispositivoActivo: true,
        permisosPush: 'concedido'
      });

      console.log("🚀 CIMCO-PUSH: Token vinculado al perfil:", userId);
      return true;
    }
  } catch (error) {
    console.error("❌ Error en sincronización Cloud Messaging:", error);
  }
  return false;
};

/**
 * --- 3. ESCUCHA DE MENSAJES (FOREGROUND) ---
 * Detecta y procesa notificaciones mientras la aplicación está abierta.
 */

/**
 * Listener genérico para callbacks personalizados.
 */
export const escucharNotificaciones = (callback) => {
  return onMessage(messaging, (payload) => {
    console.log("🔔 Mensaje recibido en primer plano (Genérico):", payload);
    callback(payload);
  });
};

/**
 * Listener específico con lógica de interfaz para la flota y pasajeros.
 */
export const escucharNotificacionesActivas = () => {
  onMessage(messaging, (payload) => {
    console.log('🔔 Notificación reactiva recibida:', payload);
    
    // Si el mensaje indica llegada de unidad, disparamos alerta visual
    if (payload.notification?.title?.includes("llegado")) {
      notificarLlegadaConductor(payload.notification.body);
    }
    // Espacio para lógica adicional de notificaciones de chat o SOS
  });
};