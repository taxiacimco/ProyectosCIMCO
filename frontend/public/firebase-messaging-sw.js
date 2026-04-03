/**
 * JAGUA PRO - FIREBASE MESSAGING SERVICE WORKER (FUSIÓN V3.2)
 * Ubicación: frontend/public/firebase-messaging-sw.js
 * Objetivo: Gestión táctica de flota, notificaciones de alta prioridad 
 * y aceptación de viajes mediante Webhook dinámico.
 */

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

/**
 * 1. CONFIGURACIÓN DUAL Y CAPTURA DE PARÁMETROS
 * Soporta inicialización vía URL Params (robusto para PWA) o self.name.
 */
const urlParams = new URLSearchParams(self.location.search);
const configParam = urlParams.get('config');
const dynamicApiUrl = urlParams.get('apiUrl'); // URL Base de la API (inyectada desde el registro)

let firebaseConfig = {};
try {
    if (configParam) {
        firebaseConfig = JSON.parse(decodeURIComponent(configParam));
    } else if (self.name && self.name.startsWith('{')) {
        firebaseConfig = JSON.parse(self.name);
    }
} catch (e) {
    console.error('[CIMCO SW] Error crítico al parsear config de Firebase:', e);
}

if (firebaseConfig.apiKey) {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    /**
     * 2. MANEJO DE MENSAJES EN SEGUNDO PLANO
     * Implementación de visuales "Ciber-Neo-Brutalistas" y patrones de vibración.
     */
    messaging.onBackgroundMessage((payload) => {
        console.log('[CIMCO SW] Alerta de alta prioridad recibida:', payload);

        const notificationTitle = payload.data?.title || "NUEVO VIAJE DISPONIBLE";
        const notificationOptions = {
            body: payload.data?.body || "Hay un servicio cerca de tu ubicación.",
            icon: '/assets/pwa-192x192.png',
            badge: '/assets/favicon-cimco.png',
            tag: payload.data?.viajeId || 'viaje-asignado',
            renotify: true,
            requireInteraction: true,
            // ⚡ Patrón de vibración táctico (Secuencia de atención)
            vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110],
            data: {
                url: payload.data?.url || '/ConductorPanel',
                viajeId: payload.data?.viajeId,
                conductorId: payload.data?.conductorId,
                apiBase: dynamicApiUrl
            },
            actions: [
                { action: 'accept', title: '✅ ACEPTAR VIAJE', icon: '/assets/check-icon.png' },
                { action: 'close', title: 'IGNORAR' }
            ]
        };

        return self.registration.showNotification(notificationTitle, notificationOptions);
    });
}

/**
 * 3. GESTIÓN DE INTERACCIÓN (Notification Click)
 * Fusión de Lógica: Apertura de ventana + Aceptación Dinámica (Silent Fetch).
 */
self.addEventListener('notificationclick', (event) => {
    const notification = event.notification;
    const action = event.action;
    const { url, viajeId, conductorId, apiBase } = notification.data;
    const urlToOpen = new URL(url, self.location.origin).href;

    notification.close();

    if (action === 'close') return;

    /**
     * CASO A: ACCIÓN 'ACCEPT' (Aceptación Quirúrgica)
     * Se realiza la petición al backend antes de enfocar la aplicación.
     */
    if (action === 'accept' && apiBase && viajeId) {
        event.waitUntil(
            fetch(`${apiBase}/api/rides/accept-fast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ viajeId, conductorId, timestamp: new Date().toISOString() })
            })
            .then(response => {
                console.log("[CIMCO SW] Aceptación procesada:", response.status);
                return focusOrOpenWindow(event, urlToOpen);
            })
            .catch(err => {
                console.error("[CIMCO SW] Error en aceptación dinámica:", err);
                return focusOrOpenWindow(event, urlToOpen);
            })
        );
    } 
    /**
     * CASO B: CLIC GENERAL
     * Redirección estándar al panel correspondiente.
     */
    else {
        event.waitUntil(focusOrOpenWindow(event, urlToOpen));
    }
});

/**
 * 4. UTILIDAD: GESTIÓN DE VENTANAS
 */
function focusOrOpenWindow(event, url) {
    return clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                let client = windowClients[i];
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        });
}