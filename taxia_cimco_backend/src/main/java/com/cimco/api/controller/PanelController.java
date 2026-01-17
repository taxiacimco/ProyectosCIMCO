package com.cimco.api.controller;

import com.cimco.api.service.PanelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controlador para el Dashboard Administrativo de CIMCO.
 * Expone las métricas financieras y operativas extraídas de Firestore en tiempo real.
 */
@RestController
@RequestMapping("/api/panel")
@CrossOrigin(origins = "*") // Permite la conexión desde cualquier origen (React, Vue, etc.)
public class PanelController {

    @Autowired
    private PanelService panelService;

    /**
     * Obtiene las métricas principales del negocio.
     * URL: GET http://localhost:8081/api/panel/metricas
     */
    @GetMapping("/metricas")
    public ResponseEntity<?> getMetricas() {
        try {
            // Obtenemos los datos procesados desde el servicio
            Map<String, Object> metricas = panelService.obtenerMetricasDashboard();
            
            // Si el servicio reportó un error interno en la lógica de Firebase
            if (Boolean.FALSE.equals(metricas.get("success"))) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(metricas);
            }

            return ResponseEntity.ok(metricas);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "error");
            errorResponse.put("message", "Excepción al recuperar métricas");
            errorResponse.put("details", e.getMessage());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Obtiene el listado de conductores con su estado actual (Online/Offline) y saldos.
     * URL: GET http://localhost:8081/api/panel/conductores
     */
    @GetMapping("/conductores")
    public ResponseEntity<?> getListaConductores() {
        try {
            List<Map<String, Object>> conductores = panelService.obtenerEstadoConductores();
            return ResponseEntity.ok(conductores);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al obtener lista de conductores: " + e.getMessage());
        }
    }

    /**
     * Endpoint para obtener un resumen rápido de activos (Conductores vs Clientes).
     * Ideal para componentes de gráficas circulares.
     */
    @GetMapping("/resumen-usuarios")
    public ResponseEntity<?> getResumenUsuarios() {
        try {
            Map<String, Object> data = panelService.obtenerMetricasDashboard();
            
            // Extraemos solo lo necesario para la gráfica
            Map<String, Object> resumen = new HashMap<>();
            if (data.containsKey("resumen")) {
                Object resumenObj = data.get("resumen");
                // Aquí podrías mapear campos específicos si prefieres un JSON más plano
                resumen.put("datos", resumenObj);
            }
            if (data.containsKey("detalles")) {
                resumen.put("detalles", data.get("detalles"));
            }
            
            return ResponseEntity.ok(resumen);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error en resumen de usuarios: " + e.getMessage());
        }
    }

    /**
     * Endpoint de salud del sistema para monitoreo.
     */
    @GetMapping("/test")
    public ResponseEntity<Map<String, String>> test() {
        Map<String, String> response = new HashMap<>();
        response.put("mensaje", "API CIMCO conectada correctamente.");
        response.put("version", "1.0.1-PROD");
        response.put("firebase_status", "active");
        return ResponseEntity.ok(response);
    }
}