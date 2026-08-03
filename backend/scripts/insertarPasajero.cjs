// Ubicación: backend/scripts/insertarPasajero.cjs
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

let mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/taxia-cimco';
mongoURI = mongoURI.replace(/\/TAXIA-CIMCO/i, '/taxia-cimco');

const PasajeroSchema = new mongoose.Schema({
    nombre: String,
    email: { type: String, unique: true },
    telefono: String,
    telefonoMovil: String,
    password: String,
    passwordHash: String,
    uid: String, 
    rol: { type: String, default: 'pasajero' },
    role: { type: String, default: 'pasajero' },
    subrol: { type: String, default: 'pasajero' },
    saldo: { type: Number, default: 0 },
    estado: { type: String, default: 'activo' },
    isActive: { type: Boolean, default: true }
}, { collection: 'usuarios', versionKey: false });

const Pasajero = mongoose.models.PasajeroSeeder || mongoose.model('PasajeroSeeder', PasajeroSchema);
const defaultPasswordHash = bcrypt.hashSync('123456', 10);

const pasajerosDePrueba = [
    {
        _id: new mongoose.Types.ObjectId("6a29b491c8d7b14cd8f85871"),
        nombre: "milevis Pasajero Test",
        email: "milevis@test.com",
        telefono: "3003503249",
        telefonoMovil: "3003503249",
        password: defaultPasswordHash,
        passwordHash: defaultPasswordHash,
        uid: "6a29b491c8d7b14cd8f85871",
        rol: "pasajero",
        role: "pasajero",
        subrol: "pasajero",
        saldo: 20000,
        estado: "activo",
        isActive: true
    },
    {
        _id: new mongoose.Types.ObjectId("6a4ab95a9afcfb7540cd9876"),
        nombre: "Carlos Fuentes (Test Pasajero)",
        email: "carlos.pasajero@taxiacimco.com",
        telefono: "3001234567",
        telefonoMovil: "3001234567",
        password: defaultPasswordHash,
        passwordHash: defaultPasswordHash,
        uid: "6a4ab95a9afcfb7540cd9876",
        rol: "pasajero",
        role: "pasajero",
        subrol: "pasajero",
        saldo: 15000,
        estado: "activo",
        isActive: true
    }
];

const ejecutarSeeder = async () => {
    try {
        console.log("📡 Conectando a MongoDB...");
        await mongoose.connect(mongoURI);

        for (const p of pasajerosDePrueba) {
            await Pasajero.findByIdAndUpdate(p._id, { $set: p }, { upsert: true, new: true });
            console.log(`🚀 Pasajero sincronizado atómicamente: ${p.nombre} | Saldo: $${p.saldo} COP`);
        }
    } catch (error) {
        console.error("❌ Error en seeder de pasajeros:", error.message);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

ejecutarSeeder();