// Versión Arquitectura: V1.3 - Tolerancia a Fallos de Red y Optimización de Índices en Producción
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\config\db.js
 * Misión: Levantar el canal de comunicación nativo usando el estándar unificado MONGODB_URI
 *         con gestión dinámica de índices y resiliencia ante interrupciones de red.
 */

import mongoose from 'mongoose';

// 📡 MANEJADORES DE EVENTOS DE RED Y RECONEXIÓN
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ [CIMCO-DATABASE] Conexión perdida con MongoDB Atlas. Intentando reconectar automáticamente...');
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ [CIMCO-DATABASE] Reconexión restablecida exitosamente con MongoDB Atlas.');
});

mongoose.connection.on('error', (err) => {
    console.error('🚨 [CIMCO-DATABASE] Error en el canal de datos con MongoDB:', err?.message || err);
});

export const conectarDB = async () => {
    try {
        // 🛡️ GUARDA DE SEGURIDAD INTERNA: Bloqueo unificado bajo MONGODB_URI
        if (!process.env.MONGODB_URI) {
            throw new Error("La variable de entorno MONGODB_URI no está definida en el archivo .env configurado.");
        }

        console.log("[CIMCO-DATABASE] Estableciendo puente de datos con MongoDB Atlas...");

        const configuracionMongoose = {
            autoIndex: process.env.NODE_ENV !== 'production', 
            maxPoolSize: 10, 
            serverSelectionTimeoutMS: 5000, 
            socketTimeoutMS: 45000, 
        };

        // 🔗 Conexión atómica usando la variable estandarizada
        const conexionInstancia = await mongoose.connect(process.env.MONGODB_URI, configuracionMongoose);
        
        const hostName = conexionInstancia?.connection?.host || 'Host-Desconocido';
        const dbName = conexionInstancia?.connection?.name ? conexionInstancia.connection.name.toUpperCase() : 'DESCONOCIDO';

        console.log(`🚀 ¡MongoDB Conectado con éxito! Host centralizado en: ${hostName}`);
        console.log(`📦 Base de Datos operativa del Ecosistema: ${dbName}`);
        
    } catch (error) {
        console.error('❌ Error inicial de infraestructura al conectar a MongoDB:', error?.message || error);
        console.warn('⚠️ [CIMCO-DATABASE] El servidor continuará operando en espera de restauración de red sin tumbar el proceso.');
    }
};