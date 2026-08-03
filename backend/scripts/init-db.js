// Versión Arquitectura: V2.6 - Validación Estricta de Subdocumento Compuesto Geoespacial en Clúster Atlas
/**
 * Ubicación: backend/scripts/init-db.js
 * Misión: Validar e inyectar el índice 2dsphere para el radar evitando duplicaciones causadas por la estructura del subdocumento.
 */

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Conductor from '../src/models/Conductor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function verificarIndexacion() {
    try {
        let mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error("⚠️ MONGODB_URI/MONGO_URI omitida en el .env.");
        }

        // 🛡️ COMPUERTA DEFENSIVA: Normalizar la URI evitando temas de case-sensitivity en Atlas
        mongoUri = mongoUri.replace(/\/TAXIA-CIMCO/i, '/taxia-cimco');

        console.log('📡 [CIMCO-RADAR] Conectando de forma segura a Atlas para verificación de esquema...');
        await mongoose.connect(mongoUri);

        // Compilar modelo antes de verificar índices
        await Conductor.init();
        const indices = await Conductor.listIndexes();
        
        // 🛡️ BLINDAJE ANTI-UNDEFINED: Validación del subdocumento compuesto 'ubicacion.coordenadas'
        const tiene2dsphere = indices.some(idx => {
            if (!idx || !idx.key) return false;
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
            await Conductor.collection.createIndex(
                { "ubicacion.coordenadas": "2dsphere" }, 
                { name: "ubicacion_coordenadas_2dsphere" }
            );
            console.log("🚀 [CIMCO-RADAR] Índice geoespacial '2dsphere' aplicado correctamente sobre el subdocumento compuesto.");
        }

    } catch (error) {
        console.error('❌ Error en init-db:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 [CIMCO-RADAR] Canal de verificación cerrado de forma segura.');
        process.exit(0);
    }
}

verificarIndexacion();