// Versión Arquitectura: V1.2 - Homologación Estándar MONGODB_URI
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\config\db.js
 * Misión: Levantar el canal de comunicación nativo usando el estándar unificado MONGODB_URI.
 */

import mongoose from 'mongoose';

export const conectarDB = async () => {
    try {
        // 🛡️ GUARDA DE SEGURIDAD INTERNA: Bloqueo unificado bajo MONGODB_URI
        if (!process.env.MONGODB_URI) {
            throw new Error("La variable de entorno MONGODB_URI no está definida en el archivo .env configurado.");
        }

        console.log("[CIMCO-DATABASE] Estableciendo puente de datos con MongoDB Atlas...");

        const configuracionMongoose = {
            autoIndex: true, 
            maxPoolSize: 10, 
            serverSelectionTimeoutMS: 5000, 
            socketTimeoutMS: 45000, 
        };

        // 🔗 Conexión atómica usando la variable estandarizada
        const conexionInstancia = await mongoose.connect(process.env.MONGODB_URI, configuracionMongoose);
        
        console.log(`🚀 ¡MongoDB Conectado con éxito! Host centralizado en: ${conexionInstancia.connection.host}`);
        console.log(`📦 Base de Datos operativa del Ecosistema: ${conexionInstancia.connection.name.toUpperCase()}`);
        
    } catch (error) {
        console.error('❌ Error crítico de infraestructura al conectar a MongoDB:', error.message);
        process.exit(1);
    }
};