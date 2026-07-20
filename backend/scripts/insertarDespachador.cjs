// Versión Arquitectura: V2.0 - Asignación Nativa de ObjectId y Sincronización
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\insertarDespachador.cjs
 */

const { MongoClient } = require('mongodb');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

let URI_ATLAS = process.env.MONGODB_URI || process.env.MONGO_URI;
URI_ATLAS = URI_ATLAS.replace(/\/TAXIA-CIMCO/i, '/taxia-cimco');

async function sembrarDespachador() {
    const client = new MongoClient(URI_ATLAS, { connectTimeoutMS: 10000 });

    try {
        console.log('📡 [CIMCO-DESPACHADOR] Conectando de forma segura a Atlas...');
        await client.connect();
        
        const db = client.db('taxia-cimco');
        const coleccion = db.collection('usuarios'); 

        const emailObjetivo = "despacho4@test.com";
        const uidObjetivo = "6a29d55cc8d7b14cd8f85899"; 

        console.log(`🔍 [CIMCO-DESPACHADOR] Verificando nodo: ${emailObjetivo}...`);
        const existe = await coleccion.findOne({ email: emailObjetivo });

        // NOTA ARQUITECTÓNICA: El _id estricto fue removido. Mongoose se encargará.
        const payload = {
            uid: uidObjetivo,
            nombre: "Pitoloco Maestro",
            fullName: "Despachador Central La Jagua",
            email: emailObjetivo,
            rol: "despachador",
            role: "despachador",
            telefono: "3108889944",
            estado: "activo",
            access_level: 30,
            saldo: 3000,
            cooperativa_nombre: "COOPERATIVA TERMINAL DE LA JAGUA",
            flota_id: "FLOTA_TERMINAL_JAGUA",
            empresa: "FLOTA_TERMINAL_JAGUA",
            coordenadas: {
                latitud: 9.5623,
                longitud: -73.3325
            },
            updatedAt: new Date()
        };

        if (existe) {
            console.log('⚠️ [CIMCO-DESPACHADOR] El registro ya existe. Sincronizando...');
            await coleccion.updateOne({ email: emailObjetivo }, { $set: payload });
            console.log('🔄 Identidad operativa re-calibrada.');
        } else {
            console.log('📦 Empaquetando payload del Despachador...');
            payload.fechaCreacion = new Date();
            await coleccion.insertOne(payload);
            console.log('🚀 [SÚPER ÉXITO] Nodo Despachador inyectado de forma atómica.');
        }

    } catch (error) {
        console.error('❌ [ERROR CRÍTICO] Fallo:', error.message);
    } finally {
        await client.close();
        console.log('🔌 [CIMCO-DESPACHADOR] Canal transaccional cerrado con éxito.');
        process.exit(0);
    }
}

sembrarDespachador();