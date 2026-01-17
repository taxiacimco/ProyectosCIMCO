package com.cimco.api.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Servicio para enviar notificaciones Push a través de Firebase Cloud Messaging (FCM).
 */
@Service
public class NotificacionService {

    /**
     * Envía una notificación a un dispositivo específico mediante su token FCM.
     * @param token El token único del dispositivo del conductor.
     * @param titulo Título de la notificación.
     * @param mensaje Cuerpo del mensaje.
     * @param datos Mapa opcional con datos extra (ej: id del viaje, tipo de alerta).
     */
    public String enviarNotificacion(String token, String titulo, String mensaje, Map<String, String> datos) {
        try {
            Notification notification = Notification.builder()
                    .setTitle(titulo)
                    .setBody(mensaje)
                    .build();

            Message message = Message.builder()
                    .setToken(token)
                    .setNotification(notification)
                    .putAllData(datos != null ? datos : Map.of())
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            System.out.println("🚀 Notificación enviada con éxito: " + response);
            return response;
        } catch (Exception e) {
            System.err.println("❌ Error enviando notificación: " + e.getMessage());
            return null;
        }
    }
}