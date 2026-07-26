// C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\insertarPasajero.cjs
const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

const PasajeroSchema = new mongoose.Schema({
    nombre: String,
    email: { type: String, unique: true },
    telefono: String,
    uid: String, 
    rol: { type: String, default: 'pasajero' },
    role: { type: String, default: 'pasajero' },
    subrol: { type: String, default: 'pasajero' },
    saldo: { type: Number, default: 0 },
    estado: { type: String, default: 'activo' }
}, { collection: 'usuarios', versionKey: false });

const Pasajero = mongoose.models.PasajeroSeeder || mongoose.model('PasajeroSeeder', PasajeroSchema);

const pasajerosDePrueba = [
    {
        _id: new mongoose.Types.ObjectId("6a29b491c8d7b14cd8f85871"),
        nombre: "milevis Pasajero Test",
        email: "milevis@test.com",
        telefono: "3003503249",
        uid: "6a29b491c8d7b14cd8f85871",
        rol: "pasajero",
        role: "pasajero",
        subrol: "pasajero",
        saldo: 20000,
        estado: "activo"
    },
    {
        _id: new mongoose.Types.ObjectId("6a4ab95a9afcfb7540cd9876"),
        nombre: "Carlos Fuentes (Test Pasajero)",
        email: "carlos.pasajero@taxiacimco.com",
        telefono: "3001234567",
        uid: "6a4ab95a9afcfb7540cd9876",
        rol: "pasajero",
        role: "pasajero",
        subrol: "pasajero",
        saldo: 15000,
        estado: "activo"
    }
];

const ejecutarSeeder = async () => {
    try {
        console.log("📡 Conectando a MongoDB Atlas...");
        await mongoose.connect(mongoURI.replace(/\/TAXIA-CIMCO/i, '/taxia-cimco'));

        for (const p of pasajerosDePrueba) {
            await Pasajero.findByIdAndUpdate(p._id, { $set: p }, { upsert: true, new: true });
            console.log(`🚀 Pasajero sincronizado: ${p.nombre} | Saldo: $${p.saldo} COP`);
        }
    } catch (error) {
        console.error("❌ Error en seeder de pasajeros:", error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

ejecutarSeeder();