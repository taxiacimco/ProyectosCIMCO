// Versión Arquitectura: V1.5.6 - Rompimiento de Hoisting mediante Importación Dinámica Secuencial
/**
 * Ubicación: backend/scripts/reset_driver.js
 * Misión: Forzar la restauración del estado operativo de los conductores de prueba en MongoDB Atlas y Firebase Firestore.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

let MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const ID_CONDUCTOR = "6a29cbb9c8d7b14cd8f85882"; // Camilo Castro (Intermunicipal)

async function restaurarConductor() {
    if (!MONGO_URI) {
        console.error("❌ [CIMCO-DATABASE] Error: No se encontró la variable MONGODB_URI / MONGO_URI en el .env");
        process.exit(1);
    }

    MONGO_URI = MONGO_URI.replace(/\/TAXIA-CIMCO/i, '/taxia-cimco');

    try {
        console.log(`📡 [CIMCO-RESET] Conectando al clúster de MongoDB...`);
        await mongoose.connect(MONGO_URI);

        console.log(`⚡ [CIMCO-RESET] Limpiando locks de concurrencia para el ID: ${ID_CONDUCTOR}`);
        
        const resultado = await mongoose.connection.db.collection('conductores').updateOne(
            { _id: new mongoose.Types.ObjectId(ID_CONDUCTOR) },
            {
                $set: {
                    estado: "available",
                    estadoOperativo: "DISPONIBLE",
                    viajeActualId: null,
                    updatedAt: new Date()
                }
            }
        );

        if (resultado && resultado.matchedCount > 0) {
            console.log(`\n✅ [CIMCO-RESET-ATLAS] Conductor Camilo Castro seteado a DISPONIBLE de forma atómica.`);
        } else {
            console.log(`\n⚠️ [AVISO] No se encontró ningún conductor con el ID ${ID_CONDUCTOR} en 'conductores'.`);
        }

        // Carga diferida de Firebase para resolver variables de entorno a tiempo
        console.log(`🔄 [CIMCO-RESET] Cargando módulo de Firebase de forma diferida...`);
        const { dbFirestore, FIRESTORE_PATHS } = await import('../src/config/firebase.js');

        if (dbFirestore) {
            const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores_activos';
            const conductorRef = dbFirestore.collection(coleccionConductores).doc(ID_CONDUCTOR);
            
            await conductorRef.set({
                estado: "available",
                estadoOperativo: "DISPONIBLE",
                viajeActualId: null,
                updatedAt: new Date()
            }, { merge: true });
            
            console.log(`📡 [CIMCO-RESET-FIRESTORE] Sincronizado en tiempo real [${coleccionConductores}].`);
        }

        console.log('\n🏁 [CIMCO-RESET] Proceso finalizado con éxito.');
    } catch (error) {
        console.error("❌ [CRÍTICO] Error en el mantenimiento:", error ? error.message : "Desconocido");
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

restaurarConductor();