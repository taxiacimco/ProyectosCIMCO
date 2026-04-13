// Versión Arquitectura: V8.0 - Gestión Táctica de Flota y Notificaciones PUSH
/**
 * JAGUA PRO - FIREBASE MESSAGING SERVICE WORKER
 * Ubicación: frontend/public/firebase-messaging-sw.js
 * Objetivo: Gestión táctica de flota con UI Ciber-Neo-Brutalista y Webhooks de aceptación.
 */

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

/**
 * 1. CONFIGURACIÓN DUAL Y CAPTURA DE PARÁMETROS
 */
const urlParams = new URLSearchParams(self.location.search);
const configParam = urlParams.get('config');
const dynamicApiUrl = urlParams.get('apiUrl'); 

let firebaseConfig = {
    apiKey: "AIzaSyCseKkOoHY8pbSnUWSEWyPR8et1BVccr7s",
    authDomain: "pelagic-chalice-467818-e1.firebaseapp.com",
    projectId: "pelagic-chalice-467818-e1",
    storageBucket: "pelagic-chalice-467818-e1.firebasestorage.app",
    messagingSenderId: "191106268804",
    appId: "1:191106268804:web:1bb4a7c7847c20c0827255"
};

if (configParam) {
    try {
        firebaseConfig = JSON.parse(decodeURIComponent(configParam));
    } catch (e) {
        console.error('[CIMCO SW] Error al parsear config:', e);
    }
}

if (firebaseConfig.apiKey) {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // Manejo de notificaciones en segundo plano
    messaging.onBackgroundMessage((payload) => {
        console.log('[CIMCO SW] Mensaje recibido en background:', payload);
    });
}

/**
 * 2. EVENTO PUSH: Personalización Ciber-Neo-Brutalista
 */
self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.json();
        const notificationData = data.notification || data.data;

        const title = notificationData.title || "Nuevo Viaje - TAXIA CIMCO";
        const options = {
            body: notificationData.body || "Tienes una nueva solicitud cerca.",
            // ✅ RUTA CORREGIDA: Apuntando a la nueva estructura de assets
            icon: '/assets/logo-cimco.png', 
            badge: '/assets/badge-icon.png', 
            vibrate: [200, 100, 200],
            tag: notificationData.tag || 'request-notification',
            data: {
                url: notificationData.url || '/ConductorPanel',
                viajeId: notificationData.viajeId,
                conductorId: notificationData.conductorId,
                apiBase: dynamicApiUrl || 'https://taxia-cimco-backend.web.app'
            },
            actions: [
                {
                    action: 'accept',
                    title: '✅ ACEPTAR VIAJE',
                    icon: '/assets/check-icon.png' 
                },
                {
                    action: 'close',
                    title: 'IGNORAR',
                    icon: '/assets/cancel-icon.png' 
                }
            ]
        };

        event.waitUntil(self.registration.showNotification(title, options));
    }
});

/**
 * 3. INTERACCIÓN: Lógica de Aceptación Rápida
 */
self.addEventListener('notificationclick', function(event) {
    const action = event.action;
    const notification = event.notification;
    const { viajeId, conductorId, apiBase, url } = notification.data;

    notification.close();

    const urlToOpen = new URL(url, self.location.origin).href;

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
    else if (action !== 'close') {
        event.waitUntil(focusOrOpenWindow(event, urlToOpen));
    }
});

function focusOrOpenWindow(event, url) {
    return clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                let client = windowClients[i];
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        });
}