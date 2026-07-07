// Versión Arquitectura: V1.2 - Solución a Restricción de Inicialización de ID Manual en Esquemas Mongoose
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\insertarPasajero.cjs
 * Misión: Sanitizar y sembrar el dataset de pasajeros en MongoDB Atlas utilizando casillas nativas y Types.ObjectId.
 */

const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URI;

if (!mongoURI) {
    console.error("⚠️ [ALERTA DE ARQUITECTURA] Error de inicialización: No se detectó variable de conexión en el archivo .env.");
    process.exit(1);
}

// CORRECCIÓN: Se remueve el campo '_id' rígido del esquema para permitir que Mongoose maneje la asignación reactiva sin reventar
const PasajeroSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    telefono: { type: String, required: true },
    uid: { type: String, required: true, unique: true }, 
    rol: { type: String, default: 'pasajero' },
    role: { type: String, default: 'pasajero' },
    estado: { type: String, default: 'activo' },
    fechaRegistro: { type: Date, default: Date.now }
}, { collection: 'pasajeros', versionKey: false });

const Pasajero = mongoose.models.PasajeroSeeder || mongoose.model('PasajeroSeeder', PasajeroSchema);

const pasajerosDePrueba = [
    {
        nombre: "milevis Pasajero Test",
        email: "milevis@test.com",
        telefono: "3003503249",
        uid: "6a29b491c8d7b14cd8f85871", // Su UID de Firebase e Identificador unificado
        rol: "pasajero",
        role: "pasajero",
        estado: "activo"
    },
    {
        nombre: "Carlos Fuentes (Test Pasajero)",
        email: "carlos.pasajero@taxiacimco.com",
        telefono: "+573001234567",
        uid: "FB_UID_PASAJERO_CARLOS_PROD_TEST",
        rol: "pasajero",
        role: "pasajero",
        estado: "activo"
    },
    {
        nombre: "Diana Mendoza Altahona",
        email: "diana.mendoza@gmail.com",
        telefono: "+573157654321",
        uid: "FB_UID_PASAJERO_DIANA_PROD_TEST",
        rol: "pasajero",
        role: "pasajero",
        estado: "activo"
    }
];

const ejecutarSeeder = async () => {
    try {
        console.log("📡 Conectando con el Clúster de MongoDB Atlas...");
        // Aseguramos conexión explícita al namespace en minúsculas
        await mongoose.connect(mongoURI.replace('TAXIA-CIMCO', 'taxia-cimco'));
        console.log("✅ Conexión perimetral establecida.");

        console.log("⚡ Iniciando inyección atómica de pasajeros...");
        let insertados = 0;
        let omitidos = 0;

        for (const passengerData of pasajerosDePrueba) {
            const pasajeroExistente = await Pasajero.findOne({
                $or: [
                    { email: passengerData.email },
                    { uid: passengerData.uid }
                ]
            });

            if (pasajeroExistente) {
                console.log(`ℹ️ [OMITIDO] El pasajero [${passengerData.nombre}] ya existe en la base de datos.`);
                omitidos++;
            } else {
                // Instanciamos el modelo de Mongoose dejando que asigne su _id nativo, preservando la sincronización en 'uid'
                const nuevoPasajero = new Pasajero(passengerData);
                await nuevoPasajero.save();
                console.log(`🚀 [INYECTADO] Pasajero creado con éxito: ${passengerData.nombre} (UID: ${passengerData.uid})`);
                insertados++;
            }
        }

        console.log("\n📊 --- RESUMEN DE TELEMETRÍA SEEDER ---");
        console.log(`✅ Registros procesados e inyectados: ${insertados}`);
        console.log(`ℹ️ Registros omitidos por preexistencia: ${omitidos}`);
        console.log("----------------------------------------\n");

    } catch (error) {
        console.error("❌ Error crítico durante la ejecución del despachador:", error);
    } finally {
        await mongoose.connection.close();
        console.log("🛑 Proceso de sembrado finalizado de forma segura.");
        process.exit(0);
    }
};

ejecutarSeeder();