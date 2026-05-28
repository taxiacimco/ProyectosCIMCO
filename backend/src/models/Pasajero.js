// Versión Arquitectura: V1.0 - Modelo de Pasajero Blindado
import mongoose from 'mongoose';

const pasajeroSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    telefono: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'pasajero' },
    fechaCreacion: { type: Date, default: Date.now }
});

const Pasajero = mongoose.model('Pasajero', pasajeroSchema);

export default Pasajero;