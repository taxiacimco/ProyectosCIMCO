package com.cimco.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Clase principal para iniciar la API de CIMCO (Taxia).
 * * Esta clase es el punto de entrada de la aplicación Spring Boot. 
 * La configuración de Firebase se maneja de forma independiente en 
 * la clase com.cimco.api.config.FirebaseConfig para mantener un 
 * código limpio y modular.
 */
@SpringBootApplication
public class ApiApplication {

    private static final Logger logger = LoggerFactory.getLogger(ApiApplication.class);

    public static void main(String[] args) {
        // Inicia la aplicación de Spring
        SpringApplication.run(ApiApplication.class, args);
        
        // Mensaje estético y funcional de confirmación en consola
        logger.info("\n" +
            "==========================================================\n" +
            "   ¡SISTEMA CIMCO API INICIADO EXITOSAMENTE!\n" +
            "   Puerto: 8081\n" +
            "   Entorno: Desarrollo (Local)\n" +
            "   Servicios: Firebase Admin SDK & Firestore Activos\n" +
            "==========================================================");
    }
}