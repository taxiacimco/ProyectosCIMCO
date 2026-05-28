// Versión Arquitectura: V1.3 - Inyección de Contingencia con URI Expandida Absoluta
/**
 * Ubicación: backend/src/insertarConductor.cjs
 * Misión: Forzar el registro usando el string de conexión directo de Atlas libre de errores de parseo.
 */

const { MongoClient } = require('mongodb');

// Usamos la cadena de conexión explícita apuntando directamente a los nodos de datos de tu log
const URI_DIRECTA = "mongodb://ac-r1pjv3q-shard-00-00.veevs7s.mongodb.net,ac-r1pjv3q-shard-00-01.veevs7s.mongodb.net/TAXIA-CIMCO?ssl=true&replicaSet=atlas-13gbyk-shard-0&authSource=admin&retryWrites=true&w=majority";

async function sembrarConductorAbsoluto() {
    // Configuramos opciones de tolerancia para entornos Windows de desarrollo local
    const client = new MongoClient(URI_DIRECTA, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        connectTimeoutMS: 10000
    });

    try {
        console.log('📡 [CIMCO-FINAL] Conectando por bypass directo al bus de datos de Atlas...');
        await client.connect();
        
        const db = client.db('TAXIA-CIMCO');
        const coleccion = db.collection('conductores');

        console.log('🔍 [CIMCO-FINAL] Verificando existencia de mototaxi@cimco...');
        const existe = await coleccion.findOne({ email: 'mototaxi@cimco' });

        if (existe) {
            console.log('⚠️ [CIMCO-FINAL] El registro ya se encuentra en el nodo central.');
            return;
        }

        console.log('📦 [CIMCO-FINAL] Empaquetando payload del Conductor Demo...');
        const nuevoConductor = {
            nombre: "Carlos Fuentes (Conductor Demo)",
            email: "mototaxi@cimco",
            rol: "conductor",
            telefono: "+573001234567",
            estado: "activo",
            saldoWallet: 0,
            fechaCreacion: new Date()
        };

        await coleccion.insertOne(nuevoConductor);
        console.log('🚀 ¡SÚPER ÉXITO! CONDUCTOR INYECTADO CORRECTAMENTE EN EL NODO CENTRAL.');

    } catch (error) {
        console.error('❌ Error crítico en la inyección de datos:', error.message);
    } finally {
        await client.close();
        console.log('🔌 [CIMCO-FINAL] Canal cerrado con éxito.');
        process.exit(0);
    }
}

sembrarConductorAbsoluto();