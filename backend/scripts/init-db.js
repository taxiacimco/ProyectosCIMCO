// Versión Arquitectura: V2.6 - Validación Estricta de Subdocumento Compuesto Geoespacial en Clúster Atlas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\init-db.js
 * Misión: Validar e inyectar el índice 2dsphere para el radar evitando duplicaciones causadas por la estructura del subdocumento.
 */

import mongoose from 'mongoose';
import Conductor from '../src/models/Conductor.js';
import dotenv from 'dotenv';

dotenv.config();

async function verificarIndexacion() {
    try {
        let mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error("⚠️ MONGODB_URI/MONGO_URI omitida en el .env.");
        }

        // 🛡️ COMPUERTA DEFENSIVA: Normalizar el string de la URI para evitar fragmentación por Case-Sensitivity en Atlas
        mongoUri = mongoUri.replace(/\/TAXIA-CIMCO/i, '/taxia-cimco');

        console.log('📡 [CIMCO-RADAR] Conectando de forma segura a Atlas para verificación de esquema...');
        await mongoose.connect(mongoUri);
        console.log('📡 [CIMCO-RADAR] Conectado para verificación de esquema...');

        // Aseguramos que el modelo esté completamente compilado en Mongoose antes de leer índices
        await Conductor.init();
        const indices = await Conductor.listIndexes();
        
        // 🛡️ BLINDAJE DE SEGURIDAD (ANTI-UNDEFINED): Validación estricta del subdocumento compuesto 'ubicacion.coordenadas'
        const tiene2dsphere = indices.some(idx => {
            if (!idx || !idx.key) return false;
            
            // Evaluamos la estructura de la llave del índice para prevenir colisiones o re-creaciones que disparen un timeout
            return (
                idx.key.ubicacion === '2dsphere' || 
                idx.key.coordenadas === '2dsphere' ||
                idx.key['ubicacion.coordenadas'] === '2dsphere'
            );
        });

        if (tiene2dsphere) {
            console.log('✅ [CIMCO-RADAR] ¡ÍNDICE 2DSPHERE DETECTADO Y ACTIVO EN ATLAS!');
        } else {
            console.log('⚠️ [CIMCO-RADAR] Creando índice 2dsphere en el nodo de conductores...');
            // Inyección atómica apuntando a la estructura de subdocumento geoespacial nativa
            await Conductor.collection.createIndex({ "ubicacion.coordenadas": "2dsphere" }, { name: "ubicacion_coordenadas_2dsphere" });
            console.log("🚀 [CIMCO-RADAR] Índice geoespacial '2dsphere' aplicado correctamente sobre el subdocumento compuesto.");
        }

    } catch (error) {
        console.error('❌ Error en init-db:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 [CIMCO-RADAR] Canal de verificación cerrado de forma segura.');
        process.exit(0);
    }
}

verificarIndexacion();