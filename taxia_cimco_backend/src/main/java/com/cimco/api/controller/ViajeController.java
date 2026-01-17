package com.cimco.api.controller;

import com.cimco.api.service.ViajeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controlador para la gestión de viajes y comisiones.
 * Actúa como puente entre los Webhooks externos y el Dashboard Administrativo de CIMCO.
 */
@RestController
@RequestMapping("/api/viajes")
@CrossOrigin(origins = "*") 
public class ViajeController {

    @Autowired
    private ViajeService viajeService;

    /**
     * POST: Recibe datos de un viaje finalizado.
     * Endpoint: http://localhost:8080/api/viajes/solicitar
     * * @param datosViaje JSON esperado: 
     * {
     * "conductor_id": "ID_DE_FIRESTORE",
     * "conductor_nombre": "Nombre del Conductor",
     * "tarifa": 15000,
     * "metodo_pago": "EFECTIVO" o "DIGITAL",
     * "cliente_nombre": "Nombre del Pasajero"
     * }
     */
    @PostMapping("/solicitar")
    public ResponseEntity<Map<String, Object>> solicitarViaje(@RequestBody Map<String, Object> datosViaje) {
        Map<String, Object> respuesta = new HashMap<>();
        
        // Log para monitoreo en consola
        System.out.println("--------------------------------------------------");
        System.out.println("📥 WEBHOOK RECIBIDO: Procesando liquidación de viaje...");
        System.out.println("Payload: " + datosViaje);

        try {
            // Procesamos la transacción en el servicio (Saldos + Registro)
            String idViaje = viajeService.procesarSolicitudViaje(datosViaje);
            
            respuesta.put("success", true);
            respuesta.put("viaje_id", idViaje);
            respuesta.put("timestamp", System.currentTimeMillis());
            respuesta.put("message", "Operación exitosa: Comisión aplicada y wallet actualizada.");
            
            System.out.println("✅ RESULTADO: Viaje registrado con ID " + idViaje);
            return ResponseEntity.status(HttpStatus.CREATED).body(respuesta);
            
        } catch (IllegalArgumentException e) {
            System.err.println("⚠️ ERROR DE VALIDACIÓN: " + e.getMessage());
            respuesta.put("success", false);
            respuesta.put("error", "DATOS_INVALIDOS");
            respuesta.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(respuesta);
            
        } catch (Exception e) {
            System.err.println("❌ ERROR CRÍTICO: " + e.getMessage());
            respuesta.put("success", false);
            respuesta.put("error", "INTERNAL_SERVER_ERROR");
            respuesta.put("message", "No se pudo procesar el viaje: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(respuesta);
        } finally {
            System.out.println("--------------------------------------------------");
        }
    }

    /**
     * GET: Genera un resumen financiero para el Dashboard.
     * Endpoint: http://localhost:8080/api/viajes/reporte-ganancias
     */
    @GetMapping("/reporte-ganancias")
    public ResponseEntity<Map<String, Object>> obtenerReporteGanancias() {
        try {
            Map<String, Object> reporte = viajeService.obtenerReporteFinancieroHoy();
            return ResponseEntity.ok(reporte);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Error al generar reporte: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * GET: Lista los viajes más recientes para auditoría.
     * Endpoint: http://localhost:8080/api/viajes/listar
     */
    @GetMapping("/listar")
    public ResponseEntity<Map<String, Object>> listarViajesRecientes() {
        Map<String, Object> respuesta = new HashMap<>();
        try {
            List<Map<String, Object>> viajes = viajeService.listarViajes();
            respuesta.put("success", true);
            respuesta.put("count", viajes.size());
            respuesta.put("data", viajes);
            return ResponseEntity.ok(respuesta);
        } catch (Exception e) {
            respuesta.put("success", false);
            respuesta.put("message", "Error al obtener lista de viajes: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(respuesta);
        }
    }
}