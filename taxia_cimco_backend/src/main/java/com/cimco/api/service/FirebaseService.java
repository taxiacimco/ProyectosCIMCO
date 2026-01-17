package com.cimco.api.service;

import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;

/**
 * Servicio núcleo para la gestión de la conexión con Firestore.
 * Proporciona una instancia centralizada de la base de datos para todos los servicios de la API.
 */
@Service
public class FirebaseService {

    private Firestore db;

    /**
     * Se ejecuta automáticamente después de que Spring inicializa el componente.
     * Intenta establecer el enlace con el cliente de Firestore ya configurado.
     */
    @PostConstruct
    public void initialization() {
        try {
            // Obtenemos la instancia de Firestore que ya fue inicializada previamente por FirebaseConfig
            this.db = FirestoreClient.getFirestore();
            
            if (this.db != null) {
                System.out.println("---------------------------------------------------------");
                System.out.println("🚀 [CIMCO] FirebaseService: Enlace con Firestore activo.");
                System.out.println("🛰️ Conectado exitosamente al proyecto Firebase.");
                System.out.println("📅 Estado: Listo para procesar peticiones.");
                System.out.println("---------------------------------------------------------");
            } else {
                System.err.println("⚠️ [CIMCO] FirebaseService: La base de datos se inicializó como NULL.");
                System.err.println("👉 Verifique que el archivo serviceAccountKey.json sea correcto.");
            }
        } catch (Exception e) {
            System.err.println("❌ [CIMCO] ERROR Crítico en FirebaseService al obtener Firestore: " + e.getMessage());
            // No imprimimos todo el stacktrace para mantener el log limpio, 
            // pero notificamos la causa principal.
        }
    }

    /**
     * Retorna la instancia activa de la base de datos Firestore.
     * Este método es utilizado por ViajeService, UsuarioService y PanelService.
     * * @return Firestore instancia de la base de datos.
     */
    public Firestore getFirestore() {
        // Doble verificación: Si por alguna razón la instancia se pierde, intentamos recuperarla.
        if (this.db == null) {
            synchronized (this) {
                if (this.db == null) {
                    try {
                        this.db = FirestoreClient.getFirestore();
                    } catch (Exception e) {
                        System.err.println("❌ [CIMCO] No se pudo recuperar la instancia de Firestore: " + e.getMessage());
                        throw new RuntimeException("Base de datos Firestore no disponible.");
                    }
                }
            }
        }
        return this.db;
    }
}