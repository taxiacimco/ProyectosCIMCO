// Versión Arquitectura: V2.0 - Inyección Múltiple y Asignación Nativa de ObjectId
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\insertarConductor.cjs
 */

const { MongoClient } = require('mongodb');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

let URI_ATLAS = process.env.MONGODB_URI || process.env.MONGO_URI;
URI_ATLAS = URI_ATLAS.replace(/\/TAXIA-CIMCO/i, '/taxia-cimco');

const escuadronConductores = [
    {
        uid: "6a29c73cc8d7b14cd8f85876",
        nombre: "Pantera rosa",
        email: "mototaxi@test.com",
        telefono: "3102223344",
        clave: "123456",
        placa: "MOT123",
        numeroInterno: "#057",
        subrol: "mototaxi",
        cooperativa: "asociturji"
    },
    {
        uid: "6a29ca0bc8d7b14cd8f85879",
        nombre: "Juan",
        email: "parrillero@test.com",
        telefono: "3103334455",
        clave: "123456",
        placa: "PAR123",
        numeroInterno: "#056",
        subrol: "motoparrillero",
        cooperativa: "Cooperativaparrilleros"
    },
    {
        uid: "6a29ca9bc8d7b14cd8f8587c",
        nombre: "Pedro",
        email: "carga@test.com",
        telefono: "3104445566",
        clave: "123456",
        placa: "CAR123",
        numeroInterno: "#059",
        subrol: "motocarga",
        cooperativa: "Cootracaraga"
    },
    {
        uid: "6a29cbb9c8d7b14cd8f85882",
        nombre: "Camilo Castro",
        email: "inter@test.com",
        telefono: "3106666666",
        clave: "123456",
        placa: "INT123",
        numeroInterno: "#057",
        subrol: "conductor_intermunicipal",
        flota_id: "FLOTA_TERMINAL_JAGUA"
    }
];

async function sembrarEscuadron() {
    const client = new MongoClient(URI_ATLAS, { connectTimeoutMS: 10000 });

    try {
        console.log('📡 [CIMCO-CONDUCTORES] Conectando de forma segura a Atlas...');
        await client.connect();
        
        const db = client.db('taxia-cimco');
        const coleccion = db.collection('conductores');

        for (const piloto of escuadronConductores) {
            console.log(`🔍 Verificando preexistencia del piloto: ${piloto.email}...`);
            const existe = await coleccion.findOne({ email: piloto.email });

            // NOTA ARQUITECTÓNICA: Omitimos el campo _id a propósito para que MongoDB asigne el ObjectId nativo
            const payload = {
                uid: piloto.uid,
                nombre: piloto.nombre,
                email: piloto.email,
                rol: "conductor",
                role: "conductor",
                subrol: piloto.subrol,
                telefono: piloto.telefono,
                placa: piloto.placa,
                numeroInterno: piloto.numeroInterno,
                cooperativa: piloto.cooperativa || null,
                flota_id: piloto.flota_id || null,
                estado: "activo",
                saldo: 20000,
                saldoWallet: 20000,
                fechaCreacion: new Date(),
                updatedAt: new Date()
            };

            if (existe) {
                console.log(`⚠️ Actualizando credenciales de ${piloto.nombre}...`);
                await coleccion.updateOne({ email: piloto.email }, { $set: payload });
            } else {
                await coleccion.insertOne(payload);
                console.log(`🚀 [SÚPER ÉXITO] Piloto ${piloto.nombre} inyectado al nodo central.`);
            }
        }

    } catch (error) {
        console.error('❌ [ERROR CRÍTICO] Fallo en la inyección:', error.message);
    } finally {
        await client.close();
        console.log('🔌 [CIMCO-CONDUCTORES] Canal cerrado con éxito.');
        process.exit(0);
    }
}

sembrarEscuadron();