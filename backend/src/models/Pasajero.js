// Versión Arquitectura: V14.2 - Modelo de Pasajero Blindado con Soporte de Recuperación de Credenciales
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\models\Pasajero.js
 */
import mongoose from 'mongoose';

const pasajeroSchema = new mongoose.Schema({
    nombre: { 
        type: String, 
        required: [true, 'El nombre es obligatorio.'], 
        trim: true 
    },
    telefono: { 
        type: String, 
        required: [true, 'El teléfono es obligatorio.'], 
        unique: true, 
        trim: true 
    },
    email: { 
        type: String, 
        required: [true, 'El correo electrónico es obligatorio.'], 
        unique: true, 
        lowercase: true, 
        trim: true 
    },
    password: { 
        type: String, 
        required: [true, 'La contraseña es obligatoria.'] 
    },
    role: { 
        type: String, 
        default: 'pasajero' 
    },
    fechaCreacion: { 
        type: Date, 
        default: Date.now 
    },
    // 🛡️ NUEVOS CAMPOS: Control de recuperación de contraseña
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

const Pasajero = mongoose.model('Pasajero', pasajeroSchema);

export default Pasajero;