// Versión Arquitectura: V1.0 - Inyección Quirúrgica y Sincronización del Nodo Despachador de Terminal
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\insertarDespachador.cjs
 * Misión: Sembrar el perfil del despachador de control en MongoDB Atlas apuntando al namespace unificado en minúsculas.
 */

const { MongoClient } = require('mongodb');
const path = require('path');

// 🛡️ CARGA PERIMETRAL DE VARIABLES DE ENTORNO
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const URI_ATLAS = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://ac-r1pjv3q-shard-00-00.veevs7s.mongodb.net,ac-r1pjv3q-shard-00-01.veevs7s.mongodb.net/taxia-cimco?ssl=true&replicaSet=atlas-13gbyk-shard-0&authSource=admin&retryWrites=true&w=majority";

async function sembrarDespachador() {
    const client = new MongoClient(URI_ATLAS, {
        connectTimeoutMS: 10000
    });

    try {
        console.log('📡 [CIMCO-DESPACHADOR] Conectando de forma segura al bus de datos de Atlas...');
        await client.connect();
        
        const db = client.db('taxia-cimco');
        const coleccion = db.collection('usuarios'); // El rol operativo/administrativo comparte la colección centralizada de usuarios

        const emailObjetivo = "despacho4@test.com";
        const uidObjetivo = "6a29d55cc8d7b14cd8f85899"; // UID unificado para pruebas de interfaz

        console.log(`🔍 [CIMCO-DESPACHADOR] Verificando preexistencia del nodo: ${emailObjetivo}...`);
        const existe = await coleccion.findOne({ 
            $or: [
                { email: emailObjetivo },
                { uid: uidObjetivo }
            ]
        });

        if (existe) {
            console.log('⚠️ [CIMCO-DESPACHADOR] El registro del despachador ya existe en el nodo central. Sincronizando campos...');
            await coleccion.updateOne(
                { email: emailObjetivo },
                { 
                    $set: { 
                        uid: uidObjetivo,
                        fullName: "Despachador Central La Jagua",
                        rol: "despachador",
                        role: "despachador",
                        estado: "activo",
                        updatedAt: new Date()
                    } 
                }
            );
            console.log('🔄 [CIMCO-DESPACHADOR] Identidad operativa re-calibrada exitosamente.');
            return;
        }

        console.log('📦 [CIMCO-DESPACHADOR] Empaquetando payload del Despachador de Control...');
        const nuevoDespachador = {
            _id: uidObjetivo,
            uid: uidObjetivo,
            fullName: "Despachador Central La Jagua",
            email: emailObjetivo,
            rol: "despachador",
            role: "despachador",
            telefono: "3209998877",
            clave: "123456",
            estado: "activo",
            access_level: 50, // Nivel intermedio para gestión de asignación de tableros
            fechaCreacion: new Date()
        };

        await coleccion.insertOne(nuevoDespachador);
        console.log('🚀 [SÚPER ÉXITO] Nodo Despachador inyectado de forma atómica.');

    } catch (error) {
        console.error('❌ [ERROR CRÍTICO] Fallo en la inyección del despachador:', error.message);
    } finally {
        await client.close();
        console.log('🔌 [CIMCO-DESPACHADOR] Canal transaccional cerrado con éxito.');
        process.exit(0);
    }
}

sembrarDespachador();