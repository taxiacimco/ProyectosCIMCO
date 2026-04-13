/**
 * TAXIA CIMCO - SERVICIO DE LOGICA DE NOTIFICACIONES V12.2
 * Integración Quirúrgica: Captura de Token + Persistencia en Ruta Sagrada.
 */

import { db, auth, messaging } from "../firebase/firebaseConfig";
import { doc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";

const VAPID_KEY = "BLK4gLk8LiDQQEQBTjOLNmfqcr0aQB7Mwy38ayAIDYcTs02Pl1gnSqeesDO2-5cGvEJVFmn_tAHj3xzu258LOMY";

/**
 * --- 1. CAPTURA Y PERMISIONAMIENTO ---
 */
export const solicitarPermisosYObtenerToken = async () => {
  try {
    if (!("Notification" in window)) {
      console.warn("Este navegador no soporta notificaciones de escritorio.");
      return null;
    }

    const permiso = await Notification.requestPermission();
    
    if (permiso === 'granted') {
      console.log("✅ Permiso de notificaciones concedido.");
      
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      
      if (token) {
        console.log("-----------------------------------------");
        console.log("🔥 TOKEN FCM DE TAXIA CIMCO:", token);
        console.log("-----------------------------------------");
        
        await guardarTokenEnBaseDeDatos(token);
        return token;
      } else {
        console.warn("⚠️ No se pudo generar el token. Verifica la VAPID Key.");
      }
    } else {
      console.error("❌ El usuario bloqueó las notificaciones.");
    }
  } catch (error) {
    console.error("❌ Error en solicitarPermisosYObtenerToken:", error);
  }
  return null;
};

/**
 * --- 2. PERSISTENCIA EN RUTA SAGRADA ---
 */
export const guardarTokenEnBaseDeDatos = async (token) => {
  const user = auth.currentUser;
  if (!user || !token) return;

  try {
    // Path Sagrado: artifacts/taxiacimco-app/public/data/usuarios/[uid]
    const userRef = doc(db, 'artifacts', 'taxiacimco-app', 'public', 'data', 'usuarios', user.uid);
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token),
      lastTokenUpdate: serverTimestamp()
    });
    console.log("✅ Token sincronizado con el perfil CIMCO.");
  } catch (error) {
    console.error("❌ Error persistiendo token:", error);
  }
};

/**
 * --- 3. ESCUCHA EN TIEMPO REAL (FIRST PLANE) ---
 */
export const registrarEscuchaMensajes = () => {
  onMessage(messaging, (payload) => {
    console.log("🔔 Notificación recibida en tiempo real:", payload);
    
    reproducirSonidoAlerta();
    mostrarAlertaVisual(
      payload.notification?.title || "Nueva Alerta",
      payload.notification?.body || "Revisa el panel de despacho."
    );
  });
};

/**
 * --- 4. UI / UX UTILS ---
 */
export const mostrarAlertaVisual = (titulo, cuerpo) => {
  if (Notification.permission === "granted") {
    new Notification(titulo, { 
      body: cuerpo, 
      icon: '/favicon.ico',
      tag: 'cimco-alert'
    });
  }
};

export const reproducirSonidoAlerta = () => {
  const audio = new Audio('/sounds/alert-taxi.mp3');
  audio.play().catch(e => console.log("ℹ️ Bloqueo de audio por navegador."));
};