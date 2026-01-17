package com.cimco.api.controller;

import com.cimco.api.service.ViajeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Controlador para recibir notificaciones externas (Webhooks).
 * Este es el punto de entrada cuando un viaje finaliza en la App.
 */
@RestController
@RequestMapping("/api/webhooks")
@CrossOrigin(origins = "*") // Permite llamadas desde cualquier origen (ajustar en producción)
public class WebhookController {

    @Autowired
    private ViajeService viajeService;

    /**
     * Endpoint para recibir la finalización de un viaje.
     * URL: POST http://tu-dominio.com/api/webhooks/viaje-finalizado
     */
    @PostMapping("/viaje-finalizado")
    public ResponseEntity<Map<String, Object>> recibirViajeFinalizado(@RequestBody Map<String, Object> payload) {
        Map<String, Object> respuesta = new HashMap<>();
        
        try {
            // Llamamos al servicio para procesar saldo y registrar viaje
            String rideId = viajeService.procesarSolicitudViaje(payload);
            
            respuesta.put("success", true);
            respuesta.put("message", "Viaje procesado y saldo actualizado correctamente");
            respuesta.put("rideId", rideId);
            
            return ResponseEntity.ok(respuesta);
            
        } catch (Exception e) {
            respuesta.put("success", false);
            respuesta.put("message", "Error al procesar el viaje: " + e.getMessage());
            
            // Retornamos un error 400 o 500 dependiendo de la lógica
            return ResponseEntity.badRequest().body(respuesta);
        }
    }

    /**
     * Endpoint de prueba para verificar que el Webhook está activo.
     */
    @GetMapping("/test")
    public ResponseEntity<String> test() {
        return ResponseEntity.ok("El Webhook de CIMCO está activo y escuchando.");
    }
}