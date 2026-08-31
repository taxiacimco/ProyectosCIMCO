// Versión Arquitectura: V2.2 - Inyección Estándar de Escuadrón Multimodal
/**
 * Ubicación: backend/scripts/insertarConductor.cjs
 */

const { MongoClient } = require('mongodb');
const path = require('path');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

let URI_ATLAS = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/taxia-cimco';
URI_ATLAS = URI_ATLAS.replace(/\/TAXIA-CIMCO/i, '/taxia-cimco');

const defaultPasswordHash = bcrypt.hashSync('123456', 10);

const escuadronConductores = [
    {
        uid: "6a29c73cc8d7b14cd8f85876",
        nombre: "Pantera rosa",
        email: "mototaxi@test.com",
        telefono: "3102223344",
        clave: "123456",
        placa: "MOT-001",
        numeroInterno: "M-01",
        subrol: "mototaxi",
        cooperativa: "asociturji"
    },
    {
        uid: "6a29ca0bc8d7b14cd8f85879",
        nombre: "Juan",
        email: "parrillero@test.com",
        telefono: "3103334455",
        clave: "123456",
        placa: "PAR-002",
        numeroInterno: "P-02",
        subrol: "motoparrillero",
        cooperativa: "Cooperativaparrilleros"
    },
    {
        uid: "6a29ca9bc8d7b14cd8f8587c",
        nombre: "Pedro",
        email: "carga@test.com",
        telefono: "3104445566",
        clave: "123456",
        placa: "CAR-003",
        numeroInterno: "C-03",
        subrol: "motocarga",
        cooperativa: "Cootracaraga"
    },
    {
        uid: "6a29cbb9c8d7b14cd8f85882",
        nombre: "Camilo Castro",
        email: "inter@test.com",
        telefono: "3106666666",
        clave: "123456",
        placa: "INT-004",
        numeroInterno: "I-04",
        subrol: "conductor_intermunicipal",
        cooperativa: "SISTEMA CENTRAL",
        flota_id: "FLOTA_TERMINAL_JAGUA"
    }
];

async function sembrarEscuadron() {
    const client = new MongoClient(URI_ATLAS, { connectTimeoutMS: 10000 });

    try {
        console.log('📡 [CIMCO-CONDUCTORES] Conectando de forma segura a MongoDB...');
        await client.connect();
        
        const db = client.db('taxia-cimco');
        const coleccion = db.collection('conductores');

        for (const piloto of escuadronConductores) {
            console.log(`🔍 Verificando piloto: ${piloto.nombre} (${piloto.email})...`);
            const passHash = piloto.clave ? bcrypt.hashSync(piloto.clave, 10) : defaultPasswordHash;

            const payload = {
                uid: piloto.uid,
                nombre: piloto.nombre,
                email: piloto.email,
                password: passHash,
                passwordHash: passHash,
                rol: "conductor",
                role: "conductor",
                subrol: piloto.subrol,
                telefono: piloto.telefono,
                telefonoMovil: piloto.telefono,
                placa: piloto.placa,
                numeroInterno: piloto.numeroInterno,
                cooperativa: piloto.cooperativa || null,
                flota_id: piloto.flota_id || null,
                estado: "activo",
                isActive: true,
                saldo: 0,
                saldoWallet: 0,
                updatedAt: new Date()
            };

            await coleccion.updateOne(
                { email: piloto.email }, 
                { $set: payload },
                { upsert: true }
            );
            console.log(`🚀 [SÚPER ÉXITO] Piloto ${piloto.nombre} sincronizado (Empresa: ${piloto.cooperativa}).`);
        }

    } catch (error) {
        console.error('❌ [ERROR CRÍTICO] Fallo en la inyección de conductores:', error.message);
    } finally {
        await client.close();
        console.log('🔌 [CIMCO-CONDUCTORES] Conexión cerrada con éxito.');
        process.exit(0);
    }
}

sembrarEscuadron();