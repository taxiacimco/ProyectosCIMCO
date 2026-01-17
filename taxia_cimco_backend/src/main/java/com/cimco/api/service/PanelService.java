package com.cimco.api.service;

import com.cimco.api.model.MetricasResumen;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Servicio encargado de consolidar datos para el Dashboard Administrativo.
 * Proporciona una visión global del estado del negocio, usuarios y finanzas.
 */
@Service
public class PanelService {

    @Autowired
    private FirebaseService firebaseService;

    /**
     * Obtiene las métricas globales procesadas para el Dashboard.
     * Utiliza el modelo MetricasResumen para estructurar la respuesta.
     */
    public Map<String, Object> obtenerMetricasDashboard() throws Exception {
        Firestore db = firebaseService.getFirestore();
        Map<String, Object> respuesta = new HashMap<>();

        try {
            // 1. Obtener todos los usuarios de una vez para procesar roles
            CollectionReference usuariosRef = db.collection("usuarios");
            ApiFuture<QuerySnapshot> usuariosQuery = usuariosRef.get();
            List<QueryDocumentSnapshot> listaUsuarios = usuariosQuery.get().getDocuments();

            long totalConductores = 0;
            long totalClientes = 0;
            long conductoresActivos = 0;
            double saldoTotalWallets = 0;

            for (QueryDocumentSnapshot doc : listaUsuarios) {
                String rol = doc.getString("rol");
                Boolean online = doc.getBoolean("online");
                Double saldo = doc.getDouble("saldo_wallet");

                if (saldo != null) saldoTotalWallets += saldo;

                if ("CONDUCTOR".equalsIgnoreCase(rol)) {
                    totalConductores++;
                    if (Boolean.TRUE.equals(online)) {
                        conductoresActivos++;
                    }
                } else if ("CLIENTE".equalsIgnoreCase(rol)) {
                    totalClientes++;
                }
            }

            // 2. Obtener estadísticas de viajes (Rides)
            CollectionReference ridesRef = db.collection("rides");
            ApiFuture<QuerySnapshot> ridesQuery = ridesRef.get();
            List<QueryDocumentSnapshot> listaRides = ridesQuery.get().getDocuments();

            double facturacionBruta = 0;
            long viajesFinalizados = 0;
            long viajesCancelados = 0;

            for (QueryDocumentSnapshot doc : listaRides) {
                Double tarifa = doc.getDouble("tarifa");
                String estado = doc.getString("estado");

                if ("COMPLETED".equalsIgnoreCase(estado)) {
                    viajesFinalizados++;
                    if (tarifa != null) facturacionBruta += tarifa;
                } else if ("CANCELLED".equalsIgnoreCase(estado)) {
                    viajesCancelados++;
                }
            }

            // 3. Mapeo al objeto de respuesta estructurado
            MetricasResumen metricas = new MetricasResumen();
            metricas.setTotalConductores(totalConductores);
            metricas.setConductoresActivos(conductoresActivos);
            metricas.setTotalViajesHoy(viajesFinalizados); // Aquí podrías filtrar por fecha si fuera necesario
            metricas.setIngresosTotales(facturacionBruta);
            
            // Calculamos crecimiento (valor estático por ahora o lógica personalizada)
            metricas.setPorcentajeCrecimiento(5.5); 

            // Construcción del mapa de respuesta final
            respuesta.put("resumen", metricas);
            respuesta.put("detalles", Map.of(
                "totalClientes", totalClientes,
                "viajesCancelados", viajesCancelados,
                "comisionesCimco", facturacionBruta * 0.10,
                "pasivosWallets", saldoTotalWallets
            ));
            respuesta.put("timestamp", System.currentTimeMillis());
            respuesta.put("success", true);

        } catch (Exception e) {
            respuesta.put("success", false);
            respuesta.put("error", "Error al procesar el dashboard: " + e.getMessage());
        }

        return respuesta;
    }

    /**
     * Obtiene una lista detallada de conductores con su estado actual.
     * Realiza una consulta filtrada directamente en Firestore.
     */
    public List<Map<String, Object>> obtenerEstadoConductores() throws Exception {
        Firestore db = firebaseService.getFirestore();
        
        // Optimizamos: Traemos solo los que tienen rol CONDUCTOR
        Query query = db.collection("usuarios").whereEqualTo("rol", "CONDUCTOR");
        ApiFuture<QuerySnapshot> querySnapshot = query.get();
        
        List<Map<String, Object>> conductores = new ArrayList<>();
        
        for (QueryDocumentSnapshot doc : querySnapshot.get().getDocuments()) {
            Map<String, Object> data = new HashMap<>(doc.getData());
            data.put("id", doc.getId()); 
            
            // Eliminamos datos que no queremos exponer en el listado del panel
            data.remove("password");
            data.remove("token_fcm");
            
            conductores.add(data);
        }
        return conductores;
    }
}