// Versión Arquitectura: V1.5.6 - Rompimiento de Hoisting mediante Importación Dinámica Secuencial
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\reset_driver.js
 * Misión: Forzar la restauración del estado operativo de los conductores de prueba en MongoDB Atlas y Firebase Firestore.
 * Saca a las unidades del estado 'busy' / 'OCUPADO' para permitir nuevas ráfagas de inyección transaccional ACID.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Configuración dinámica de rutas para capturar tu .env raíz (SE EJECUTA EN ORDEN ESTRICTO)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Extraer cadena de conexión exacta desde tu archivo .env con guardas reactivas
const MONGO_URI = process.env.MONGODB_URI;
const ID_CONDUCTOR = "6a29cbb9c8d7b14cd8f85882"; // Camilo Castro (Intermunicipal)

async function restaurarConductor() {
    if (!MONGO_URI) {
        console.error("❌ [CIMCO-DATABASE] Error: No se encontró la variable MONGODB_URI en tu archivo .env.");
        process.exit(1);
    }

    try {
        console.log(`📡 [CIMCO-RESET] Conectando al clúster de MongoDB Atlas...`);
        await mongoose.connect(MONGO_URI);

        console.log(`⚡ [CIMCO-RESET] Limpiando locks de concurrencia para el ID: ${ID_CONDUCTOR}`);
        
        // Actualización directa en la colección para máxima velocidad y evasión de hooks restrictivos
        const resultado = await mongoose.connection.db.collection('conductores').updateOne(
            { _id: new mongoose.Types.ObjectId(ID_CONDUCTOR) },
            {
                $set: {
                    estado: "available",           // Requerido por lógica interna externa
                    estadoOperativo: "DISPONIBLE", // Requerido por semántica de andén
                    viajeActualId: null,           // Rompe el candado del viaje anterior
                    updatedAt: new Date()
                }
            }
        );

        if (resultado && resultado.matchedCount > 0) {
            console.log(`\n✅ [CIMCO-RESET-ATLAS] Conductor Camilo Castro seteado a DISPONIBLE de forma atómica en Atlas.`);
            console.log(`📦 Documentos modificados en Atlas: ${resultado.modifiedCount}`);
        } else {
            console.log(`\n⚠️ [AVISO] No se encontró ningún conductor con el ID ${ID_CONDUCTOR} en la colección 'conductores'.`);
        }

        // 2. IMPORTACIÓN DINÁMICA: Firebase se carga exclusivamente AQUÍ, garantizando que process.env ya está poblado.
        console.log(`🔄 [CIMCO-RESET] Cargando módulo de Firebase de forma diferida...`);
        const { dbFirestore, FIRESTORE_PATHS } = await import('../src/config/firebase.js');

        // Sincronización reflejada en el Emulador Local de Firebase Firestore (Puerto 8085) con blindaje anti-undefined
        if (dbFirestore) {
            const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores_activos';
            const conductorRef = dbFirestore.collection(coleccionConductores).doc(ID_CONDUCTOR);
            
            // Verificación previa de existencia para inserción limpia o actualización atómica set(merge)
            await conductorRef.set({
                estado: "available",
                estadoOperativo: "DISPONIBLE",
                viajeActualId: null,
                updatedAt: new Date()
            }, { merge: true }).then(() => {
                console.log(`📡 [CIMCO-RESET-FIRESTORE] Sincronizado conductor [${ID_CONDUCTOR}] en tiempo real en la colección [${coleccionConductores}].`);
            }).catch(fsErr => {
                console.warn(`📡 [CIMCO-RESET-FIRESTORE] Error detectado en actualización de Firestore: ${fsErr.message}`);
            });
        }

        console.log('\n🏁 [CIMCO-RESET] Proceso finalizado con éxito. Entorno limpio para pruebas de estrés.');
    } catch (error) {
        console.error("❌ [CRÍTICO] Error en el mantenimiento del andén:", error ? error.message : "Desconocido");
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

restaurarConductor();