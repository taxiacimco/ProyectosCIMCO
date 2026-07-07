// Versión Arquitectura: V1.5 - Corrección de Case-Sensitivity y Normalización de Base de Datos
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\insertarConductor.cjs
 * Misión: Sembrar el perfil del conductor demo en MongoDB Atlas apuntando al namespace exacto en minúsculas.
 */

const { MongoClient } = require('mongodb');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const URI_ATLAS = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://ac-r1pjv3q-shard-00-00.veevs7s.mongodb.net,ac-r1pjv3q-shard-00-01.veevs7s.mongodb.net/taxia-cimco?ssl=true&replicaSet=atlas-13gbyk-shard-0&authSource=admin&retryWrites=true&w=majority";

async function sembrarConductorAbsoluto() {
    const client = new MongoClient(URI_ATLAS, {
        connectTimeoutMS: 10000
    });

    try {
        console.log('📡 [CIMCO-FINAL] Conectando de forma segura al bus de datos de Atlas...');
        await client.connect();
        
        // CORRECCIÓN DE CAJA: Forzar uso del namespace real en minúsculas
        const db = client.db('taxia-cimco');
        const coleccion = db.collection('conductores');

        const emailObjetivo = "mototaxi@test.com";
        const uidObjetivo = "6a29c73cc8d7b14cd8f85876"; 

        console.log(`🔍 [CIMCO-FINAL] Verificando preexistencia del nodo: ${emailObjetivo}...`);
        const existe = await coleccion.findOne({ 
            $or: [
                { email: emailObjetivo },
                { uid: uidObjetivo }
            ]
        });

        if (existe) {
            console.log('⚠️ [CIMCO-FINAL] El registro del conductor ya existe. Actualizando credenciales operativas...');
            await coleccion.updateOne(
                { email: emailObjetivo },
                { 
                    $set: { 
                        uid: uidObjetivo,
                        nombre: "Pantera rosa",
                        placa: "MOT123",
                        numeroInterno: "#057",
                        rol: "conductor",
                        role: "conductor",
                        estado: "activo",
                        updatedAt: new Date()
                    } 
                }
            );
            console.log('🔄 [CIMCO-FINAL] Identidad del conductor re-sincronizada exitosamente con Firebase Auth.');
            return;
        }

        console.log('📦 [CIMCO-FINAL] Empaquetando payload del Conductor Demo...');
        const nuevoConductor = {
            uid: uidObjetivo, 
            nombre: "Pantera rosa",
            email: emailObjetivo,
            rol: "conductor",
            role: "conductor",
            telefono: "3102223344",
            clave: "123456",
            placa: "MOT123",
            numeroInterno: "#057",
            estado: "activo",
            saldo: 20000, 
            saldoWallet: 20000,
            fechaCreacion: new Date()
        };

        await coleccion.insertOne(nuevoConductor);
        console.log('🚀 [SÚPER ÉXITO] Conductor inyectado y alineado al nodo central.');

    } catch (error) {
        console.error('❌ [ERROR CRÍTICO] Fallo en la inyección de datos del conductor:', error.message);
    } finally {
        await client.close();
        console.log('🔌 [CIMCO-FINAL] Canal transaccional cerrado con éxito.');
        process.exit(0);
    }
}

sembrarConductorAbsoluto();