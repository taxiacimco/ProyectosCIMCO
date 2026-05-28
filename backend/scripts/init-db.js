// Versión Arquitectura: V2.3 - Calibración Estructural e Inicialización de Índices Geoespaciales
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\init-db.js
 * Misión: Forzar la compilación del esquema de conductores y validar de forma preventiva que el índice 2dsphere esté activo en MongoDB Atlas.
 * Blindaje: Evita quiebres de importación redirigiendo al modelo unificado central.
 */

import mongoose from 'mongoose';
import Conductor from '../src/models/Conductor.js'; // Direccionamiento topológico corregido
import dotenv from 'dotenv';

dotenv.config();

async function verificarIndexacion() {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error("⚠️ MONGODB_URI/MONGO_URI omitida en las variables de entorno de este proceso.");
        }

        await mongoose.connect(mongoUri);
        console.log('📡 [CIMCO-RADAR] Conectado para verificación de esquema geoespacial...');

        // Obliga a Mongoose a compilar el esquema e inyectar/actualizar las reglas de indexación en el clúster
        await Conductor.init();
        
        const indices = await Conductor.listIndexes();
        
        // Guarda de validación perimetral del índice geoespacial
        const tiene2dsphere = indices.some(idx => idx.key && (idx.key.ubicacion === '2dsphere' || idx.key.coordenadas === '2dsphere'));

        if (tiene2dsphere) {
            console.log('✅ [CIMCO-RADAR] ¡ÍNDICE 2DSPHERE DETECTADO Y ACTIVO! El radar de mototaxis está calibrado para producción.');
        } else {
            console.warn('⚠️ [CIMCO-RADAR] ALERTA: No se detecta un índice 2dsphere nativo en el campo de ubicación geográfica.');
            console.log('💡 Sugerencia: Mongoose intentará propagarlo en la próxima mutación de coordenadas.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ [CIMCO-CRITICAL] Fallo estructural en la verificación del radar:', error.message);
        process.exit(1);
    }
}

verificarIndexacion();