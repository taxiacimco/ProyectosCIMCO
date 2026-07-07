// Versión Arquitectura: V2.5 - Corrección de Sintaxis de Logging y Calibración Final
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\init-db.js
 * Misión: Validar e inyectar el índice 2dsphere para el radar.
 */

import mongoose from 'mongoose';
import Conductor from '../src/models/Conductor.js';
import dotenv from 'dotenv';

dotenv.config();

async function verificarIndexacion() {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error("⚠️ MONGODB_URI/MONGO_URI omitida en el .env.");
        }

        await mongoose.connect(mongoUri);
        console.log('📡 [CIMCO-RADAR] Conectado para verificación de esquema...');

        await Conductor.init();
        const indices = await Conductor.listIndexes();
        
        const tiene2dsphere = indices.some(idx => idx.key && (idx.key.ubicacion === '2dsphere' || idx.key.coordenadas === '2dsphere'));

        if (tiene2dsphere) {
            console.log('✅ [CIMCO-RADAR] ¡ÍNDICE 2DSPHERE DETECTADO Y ACTIVO!');
        } else {
            console.log('⚠️ [CIMCO-RADAR] Creando índice 2dsphere...');
            // Corrección de sintaxis: Usamos comillas dobles externas para permitir comillas simples internas o evitar escape
            await Conductor.collection.createIndex({ ubicacion: "2dsphere" });
            console.log("🚀 [CIMCO-RADAR] Índice geoespacial '2dsphere' aplicado correctamente.");
        }

    } catch (error) {
        console.error('❌ Error en init-db:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

verificarIndexacion();