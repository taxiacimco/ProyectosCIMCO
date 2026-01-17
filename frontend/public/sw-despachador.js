// Service Worker para Notificaciones de TAXIA CIMCO
self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : {
        title: 'Nueva Solicitud',
        body: 'Hay un nuevo viaje pendiente de despacho.',
        icon: '/icons/despachador-192.png'
    };

    const options = {
        body: data.body,
        icon: data.icon,
        badge: '/img/favicon-cimco.png',
        vibrate: [200, 100, 200],
        data: {
            url: '/despachador/panel-despachador.html'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Al hacer clic en la notificación, abre el panel
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});