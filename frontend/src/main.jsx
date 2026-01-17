import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
// Importamos los estilos.
import "./index.css";

/**
 * REGISTRO DEL SERVICE WORKER
 * Esto permite que la app funcione offline y reciba notificaciones push.
 */
if ('serviceWorker' in navigator && 'PushManager' in window) {
  window.addEventListener('load', () => {
    // Apuntamos a la ruta exacta donde pusimos el código en el paso anterior
    navigator.serviceWorker.register('/assets/sw.js')
      .then(reg => {
        console.log('✅ Service Worker de TAXIA Activo:', reg.scope);
      })
      .catch(err => {
        console.error('❌ Error al registrar el Service Worker:', err);
      });
  });
}

/**
 * FUNCIÓN GLOBAL PARA PERMISOS DE NOTIFICACIÓN
 * La ponemos en el objeto window para poder llamarla desde cualquier 
 * componente de login o panel del conductor.
 */
window.pedirPermisoNotificacion = async () => {
  if (!("Notification" in window)) {
    console.error("Este navegador no soporta notificaciones de escritorio");
    return;
  }

  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('🔔 Permisos de notificación concedidos por el usuario');
      // Opcional: Una pequeña vibración de prueba si el permiso es concedido
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  }
};

/**
 * Punto de entrada principal de la aplicación CIMCO.
 */
const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("No se encontró el elemento con id 'root'.");
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
}