// Versión Arquitectura: V1.0 - Seeder Atómico de Pasajeros para MongoDB Atlas con Guarda Anti-Undefined
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\insertarPasajero.cjs
 * Misión: Proveer e inyectar perfiles de prueba de pasajeros sanitizados en el clúster de MongoDB.
 * Alineación: Sincroniza la estructura con la matriz de identidad para erradicar el descalce 'id' vs 'uid'.
 * Ejecución: En tu terminal, corre: node backend/scripts/insertarPasajero.cjs
 */

const mongoose = require('mongoose');
const path = require('path');

// 🛡️ CARGA Y BLINDAJE DE VARIABLES DE ENTORNO
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Guarda de Seguridad: Validar que el string de conexión exista antes de proceder
const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URI;

if (!mongoURI) {
    console.error("⚠️ [ALERTA DE ARQUITECTURA] Error de inicialización: No se detectó ninguna variable de conexión (MONGO_URI) en el archivo .env.");
    process.exit(1);
}

// 📐 DEFINICIÓN DEL ESQUEMA OPERACIONAL (Alineado con el Core de TAXIA CIMCO)
const PasajeroSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    telefono: { type: String, required: true },
    uid: { type: String, required: true, unique: true }, // ID del Core de Firebase Auth para sincronización perfecta
    estado: { type: String, default: 'active' },
    fechaRegistro: { type: Date, default: Date.now }
}, { collection: 'pasajeros' }); // Forzar mapeo exacto a la colección física

// Prevenir la recompilación del modelo si ya está registrado en el buffer de Mongoose
const Pasajero = mongoose.models.Pasajero || mongoose.model('PasajeroSeeder', PasajeroSchema);

// 📊 DATA SET SANITIZADA PARA AMBIENTE DE PRUEBAS HÍBRIDO (Valores representativos en es-CO)
const pasajerosDePrueba = [
    {
        nombre: "Carlos Fuentes (Test Pasajero)",
        email: "carlos.pasajero@taxiacimco.com",
        telefono: "+573001234567",
        uid: "FB_UID_PASAJERO_CARLOS_PROD_TEST",
        estado: "active"
    },
    {
        nombre: "Diana Mendoza Altahona",
        email: "diana.mendoza@gmail.com",
        telefono: "+573157654321",
        uid: "FB_UID_PASAJERO_DIANA_PROD_TEST",
        estado: "active"
    },
    {
        nombre: "Usuario Demo Alfa",
        email: "alfa.demo@taxiacimco.com",
        telefono: "+573210001122",
        uid: "FB_UID_PASAJERO_DEMO_ALFA",
        estado: "active"
    }
];

// 🚀 NÚCLEO DE EJECUCIÓN TRANSACCIONAL
const ejecutarSeeder = async () => {
    try {
        console.log("📡 Conectando con el Clúster de MongoDB Atlas...");
        await mongoose.connect(mongoURI);
        console.log("✅ Conexión establecida de forma segura.");

        console.log("⚡ Iniciando escaneo e inyección atómica de pasajeros...");
        let insertados = 0;
        let omitidos = 0;

        for (const pasajeroData of pasajerosDePrueba) {
            // 🛡️ GUARDA ANTI-DUPLICADOS (Verificación preventiva por correo y UID)
            if (!pasajeroData.email || !pasajeroData.uid) {
                console.warn("⚠️ Registro de pruebas corrupto o incompleto detectado. Omitiendo nodo.");
                omitidos++;
                continue;
            }

            const pasajeroExistente = await Pasajero.findOne({
                $or: [
                    { email: pasajeroData.email },
                    { uid: pasajeroData.uid }
                ]
            });

            if (pasajeroExistente) {
                console.log(`ℹ️ [OMITIDO] El pasajero [${pasajeroData.nombre}] ya se encuentra registrado en el Core.`);
                omitidos++;
            } else {
                const nuevoPasajero = new Pasajero(pasajeroData);
                await nuevoPasajero.save();
                console.log(`🚀 [INYECTADO] Nodo Pasajero creado con éxito: ${pasajeroData.nombre} (Sync UID: ${pasajeroData.uid})`);
                insertados++;
            }
        }

        console.log("\n📊 --- RESUMEN DE TELEMETRÍA FIN DE SCRIPT ---");
        console.log(`✅ Registros procesados e inyectados con éxito: ${insertados}`);
        console.log(`ℹ️ Registros ya existentes u omitidos por seguridad: ${omitidos}`);
        console.log("--------------------------------------------------\n");

    } catch (error) {
        console.error("❌ Error crítico durante la inyección de datos en la red local:", error);
    } finally {
        console.log("🔌 Desconectando del clúster y cerrando hilos de ejecución de Node de forma segura...");
        await mongoose.connection.close();
        console.log("🛑 Proceso finalizado.");
        process.exit(0);
    }
};

// Disparador del Script Central
ejecutarSeeder();