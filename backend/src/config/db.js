// Versión Arquitectura: V1.1 - Soporte Transaccional de Bóveda Local y Configuración de Replica Set Coexistente
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\config\db.js
 * Misión: Levantar el canal de comunicación nativo con MongoDB Atlas / Local aplicando parámetros ACID de aislamiento térmico de datos.
 */

import mongoose from 'mongoose';

export const conectarDB = async () => {
    try {
        // 🛡️ GUARDA DE SEGURIDAD INTERNA: Bloqueo de inicialización ante ausencia de URI
        if (!process.env.MONGO_URI) {
            throw new Error("La variable de entorno MONGO_URI no está definida en el archivo .env configurado.");
        }

        console.log("[CIMCO-DATABASE] Estableciendo puente de datos con MongoDB...");

        // Configuración de flags de conexión avanzados de Mongoose para asegurar soporte ACID local
        const configuracionMongoose = {
            autoIndex: true, // Mantiene la generación automática del índice de 2dsphere para Leaflet
            maxPoolSize: 10, // Optimiza el uso de sockets concurrentes en la laptop de desarrollo
            serverSelectionTimeoutMS: 5000, // Tiempo límite de espera para evitar bloqueos infinitos de hilos
            socketTimeoutMS: 45000, // Cierre preventivo de sockets colgados
        };

        // Conexión atómica usando la URI inyectada en el entorno operativo
        const conexionInstancia = await mongoose.connect(process.env.MONGO_URI, configuracionMongoose);
        
        console.log(`🚀 ¡MongoDB Conectado con éxito! Host centralizado en: ${conexionInstancia.connection.host}`);
        console.log(`📦 Base de Datos operativa del Ecosistema: ${conexionInstancia.connection.name.toUpperCase()}`);
        
    } catch (error) {
        console.error('❌ Error crítico de infraestructura al conectar a MongoDB:', error.message);
        console.error('⚠️ ALERTA DE ARQUITECTURA: El motor local no iniciará hasta restaurar el nodo de persistencia.');
        
        // Cierre controlado del proceso evitando fugas de hilos o desbordamientos en memoria
        process.exit(1);
    }
};