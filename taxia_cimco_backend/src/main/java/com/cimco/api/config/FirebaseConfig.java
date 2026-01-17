package com.cimco.api.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;

/**
 * Configuración central para la conexión con Firebase y Google Cloud Firestore.
 * Optimizada para leer credenciales desde el classpath (resources).
 * Proyecto: pelagic-chalice-467818-e1
 */
@Configuration
public class FirebaseConfig {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseConfig.class);
    
    // ID del proyecto extraído de tu consola de Firebase
    private static final String PROJECT_ID = "pelagic-chalice-467818-e1";
    // Nombre del archivo de credenciales (debe estar en src/main/resources/)
    private static final String KEY_FILE = "serviceAccountKey.json";

    @PostConstruct
    public void initialize() {
        try {
            // Evitamos inicializar múltiples veces si Spring recarga el contexto
            if (!FirebaseApp.getApps().isEmpty()) {
                logger.info("ℹ️ [CIMCO] FirebaseApp ya se encuentra inicializado.");
                return;
            }

            String emulatorHost = System.getenv("FIRESTORE_EMULATOR_HOST");
            FirebaseOptions.Builder optionsBuilder = FirebaseOptions.builder();

            if (emulatorHost != null && !emulatorHost.isEmpty()) {
                // --- CONFIGURACIÓN PARA EMULADOR ---
                logger.info("🔧 [CIMCO] Detectado entorno de desarrollo. Conectando al Emulador: {}", emulatorHost);
                optionsBuilder
                    .setProjectId(PROJECT_ID)
                    .setCredentials(GoogleCredentials.newBuilder().build());
                
                FirebaseApp.initializeApp(optionsBuilder.build());
            } else {
                // --- CONFIGURACIÓN PARA PRODUCCIÓN / CLOUD ---
                ClassPathResource resource = new ClassPathResource(KEY_FILE);
                
                if (resource.exists()) {
                    logger.info("📦 [CIMCO] Cargando credenciales desde el classpath: {}", KEY_FILE);
                    try (InputStream serviceAccount = resource.getInputStream()) {
                        optionsBuilder
                            .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                            .setProjectId(PROJECT_ID);
                        
                        FirebaseApp.initializeApp(optionsBuilder.build());
                        logger.info("✅ [CIMCO BACKEND] Firebase Admin SDK inicializado exitosamente para el proyecto: {}", PROJECT_ID);
                    }
                } else {
                    logger.error("❌ [CIMCO] ERROR CRÍTICO: No se encontró el archivo '{}' en src/main/resources/", KEY_FILE);
                    logger.error("👉 Asegúrate de descargar la llave privada de Firebase Console -> Configuración del proyecto -> Cuentas de servicio.");
                }
            }
            
        } catch (IOException e) {
            logger.error("❌ [CIMCO] Fallo de E/S al leer credenciales de Firebase: {}", e.getMessage());
        } catch (Exception e) {
            logger.error("❌ [CIMCO] Error inesperado durante la inicialización de Firebase: ", e);
        }
    }

    /**
     * Bean para inyectar la instancia de Firestore en los servicios de la aplicación.
     */
    @Bean
    public Firestore getFirestore() {
        if (FirebaseApp.getApps().isEmpty()) {
            logger.warn("⚠️ [CIMCO] Intento de acceso a Firestore sin inicialización. Intentando reinicializar...");
            initialize();
        }
        
        // Si después de intentar inicializar sigue vacío, devolverá un error al intentar usar el cliente
        return FirestoreClient.getFirestore();
    }
}