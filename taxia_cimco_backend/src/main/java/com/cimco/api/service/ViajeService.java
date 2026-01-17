package com.cimco.api.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

/**
 * Servicio encargado de la gestión de viajes (rides) y reportes financieros.
 * Implementa la lógica de cobro de comisiones y actualización de saldos en tiempo real.
 */
@Service
public class ViajeService {

    @Autowired
    private FirebaseService firebaseService;

    // Nombres de colecciones consistentes con el modelo de base de datos
    private static final String RIDES_COLLECTION = "rides";
    private static final String USERS_COLLECTION = "usuarios";
    
    // Configuración de Negocio (CIMCO)
    private static final double COMISION_PORCENTAJE = 0.10; // 10% de comisión
    private static final double LIMITE_DEUDA = -10000.0;    // Límite para bloqueo automático

    /**
     * Helper para obtener la instancia de Firestore desde el FirebaseService.
     */
    private Firestore getDb() {
        return firebaseService.getFirestore();
    }

    /**
     * PROCESAR VIAJE (Transacción Atómica):
     * Calcula comisiones, actualiza Wallet del conductor y registra el viaje.
     * Utiliza transacciones de Firestore para evitar condiciones de carrera.
     */
    public String procesarSolicitudViaje(Map<String, Object> datosViaje) throws Exception {
        Firestore db = getDb();
        
        // 1. Validaciones de entrada robustas
        if (!datosViaje.containsKey("tarifa") || !datosViaje.containsKey("conductor_id")) {
            throw new IllegalArgumentException("Error: 'tarifa' y 'conductor_id' son campos obligatorios.");
        }

        // Convertir valores numéricos de forma segura
        double tarifa = Double.parseDouble(datosViaje.get("tarifa").toString());
        double comisionCimco = tarifa * COMISION_PORCENTAJE;
        double gananciaConductor = tarifa - comisionCimco;
        
        String conductorId = (String) datosViaje.get("conductor_id");
        String metodoPago = ((String) datosViaje.getOrDefault("metodo_pago", "EFECTIVO")).toUpperCase();

        // Referencias a documentos
        DocumentReference conductorRef = db.collection(USERS_COLLECTION).document(conductorId);
        DocumentReference rideRef = db.collection(RIDES_COLLECTION).document(); // Genera ID único

        // INICIO DE TRANSACCIÓN ATÓMICA
        ApiFuture<String> resultadoTx = db.runTransaction(transaction -> {
            DocumentSnapshot conductorSnap = transaction.get(conductorRef).get();
            
            if (!conductorSnap.exists()) {
                throw new RuntimeException("Error: El conductor con ID " + conductorId + " no existe en la base de datos.");
            }

            // --- Lógica de Wallet del Conductor ---
            Double saldoActual = conductorSnap.getDouble("saldo_wallet");
            if (saldoActual == null) saldoActual = 0.0;
            
            double nuevoSaldo;
            if ("EFECTIVO".equals(metodoPago)) {
                // El conductor recibe el 100% en mano, CIMCO le resta la comisión de su saldo prepagado
                nuevoSaldo = saldoActual - comisionCimco;
            } else {
                // Pago Digital: CIMCO recibe el 100%, se queda con su parte y le suma el resto al conductor
                nuevoSaldo = saldoActual + gananciaConductor;
            }
            
            // Actualización de saldo en el documento del conductor
            transaction.update(conductorRef, "saldo_wallet", nuevoSaldo);
            
            // Verificación de límite de crédito / deuda
            if (nuevoSaldo <= LIMITE_DEUDA) {
                transaction.update(conductorRef, "bloqueado", true);
                transaction.update(conductorRef, "motivo_bloqueo", "Exceso de deuda de comisiones (Saldo: " + nuevoSaldo + ")");
            } else {
                // Si el saldo es mayor al límite, nos aseguramos de que no esté bloqueado por este motivo
                transaction.update(conductorRef, "bloqueado", false);
            }

            // --- Preparación del Registro del Viaje ---
            Map<String, Object> registroViaje = new HashMap<>(datosViaje);
            registroViaje.put("id", rideRef.getId());
            registroViaje.put("status", "COMPLETADO");
            registroViaje.put("comision_cimco", comisionCimco);
            registroViaje.put("monto_conductor", gananciaConductor);
            registroViaje.put("metodo_pago", metodoPago);
            registroViaje.put("fecha_registro", FieldValue.serverTimestamp()); 
            
            // Guardar el registro del viaje
            transaction.set(rideRef, registroViaje);

            return rideRef.getId();
        });

        try {
            return resultadoTx.get();
        } catch (ExecutionException | InterruptedException e) {
            throw new Exception("Error crítico en transacción de Firestore: " + e.getMessage());
        }
    }

    /**
     * REPORTE FINANCIERO:
     * Genera métricas de ventas y comisiones para el Dashboard administrativo.
     */
    public Map<String, Object> obtenerReporteFinancieroHoy() throws Exception {
        Firestore db = getDb();
        
        // Obtenemos los últimos 500 viajes para análisis (ajustable según necesidad)
        QuerySnapshot querySnapshot = db.collection(RIDES_COLLECTION)
                .orderBy("fecha_registro", Query.Direction.DESCENDING)
                .limit(500)
                .get().get();
        
        List<QueryDocumentSnapshot> documents = querySnapshot.getDocuments();

        double totalBrutoVendido = 0;
        double totalGananciaCimco = 0;
        Map<String, Map<String, Object>> rankingConductores = new HashMap<>();

        for (QueryDocumentSnapshot doc : documents) {
            Double tarifa = doc.getDouble("tarifa");
            Double comision = doc.getDouble("comision_cimco");
            String nombreCond = doc.getString("conductor_nombre");
            
            if (tarifa == null) tarifa = 0.0;
            if (comision == null) comision = 0.0;
            if (nombreCond == null) nombreCond = "Conductor No Identificado";

            totalBrutoVendido += tarifa;
            totalGananciaCimco += comision;

            // Agregación por conductor para el ranking
            rankingConductores.computeIfAbsent(nombreCond, k -> {
                Map<String, Object> stats = new HashMap<>();
                stats.put("nombre", k);
                stats.put("total_viajes", 0);
                stats.put("monto_generado", 0.0);
                return stats;
            });
            
            Map<String, Object> stats = rankingConductores.get(nombreCond);
            stats.put("total_viajes", (int)stats.get("total_viajes") + 1);
            stats.put("monto_generado", (double)stats.get("monto_generado") + tarifa);
        }

        // Construcción del objeto de respuesta final
        Map<String, Object> reporte = new HashMap<>();
        reporte.put("ventas_brutas", totalBrutoVendido);
        reporte.put("comisiones_recaudadas", totalGananciaCimco);
        reporte.put("cantidad_viajes", documents.size());
        reporte.put("ranking_productividad", new ArrayList<>(rankingConductores.values()));
        reporte.put("fecha_generacion", new java.util.Date().toString());

        return reporte;
    }

    /**
     * LISTAR VIAJES:
     * Obtiene una lista paginada (últimos 20) de los registros de viajes.
     */
    public List<Map<String, Object>> listarViajes() throws Exception {
        Firestore db = getDb();
        QuerySnapshot querySnapshot = db.collection(RIDES_COLLECTION)
                .orderBy("fecha_registro", Query.Direction.DESCENDING)
                .limit(20)
                .get().get();
        
        List<Map<String, Object>> lista = new ArrayList<>();
        for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
            Map<String, Object> data = doc.getData();
            if (data != null) {
                data.put("id", doc.getId()); // Aseguramos que el ID del documento esté en el Map
                lista.add(data);
            }
        }
        return lista;
    }
}