// Versión Arquitectura: V16.1 - Normalización y Aislamiento Perimetral
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\models\Pasajero.js
 * Misión: Mapeo estricto a la colección física 'pasajeros' en MongoDB Atlas.
 * Integridad: Rompe la dependencia legacy con Usuario.js y establece un esquema blindado propio.
 * Ajuste V16.1: Estabilizar y alinear sus propiedades nominales con la persistencia aislada de la colección física de pasajeros.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const pasajeroSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, '⚠️ El nombre es obligatorio.'],
        trim: true
    },
    fullName: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        required: [true, '⚠️ El correo electrónico es requerido.'],
        unique: true,
        lowercase: true,
        trim: true
    },
    telefono: {
        type: String,
        unique: true,
        sparse: true
    },
    telefonoMovil: {
        type: String, // 🛡️ Sincronización directa con tu base de datos Atlas
        unique: true,
        sparse: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'pasajero'
    },
    rol: {
        type: String,
        default: 'pasajero'
    },
    estado: {
        type: String,
        default: 'offline'
    },
    uid: {
        type: String
    }
}, {
    timestamps: true
});

// 🛡️ Sincronización Homóloga de Variables y Cifrado
pasajeroSchema.pre('save', async function (next) {
    try {
        // Normalización de roles
        if (this.isModified('rol') && this.rol) {
            this.role = this.rol;
        } else if (this.isModified('role') && this.role) {
            this.rol = this.role;
        }

        // Normalización de teléfono para Atlas
        if (this.isModified('telefono') && this.telefono) {
            this.telefonoMovil = this.telefono;
        } else if (this.isModified('telefonoMovil') && this.telefonoMovil) {
            this.telefono = this.telefonoMovil;
        }

        if (!this.isModified('password')) {
            return next();
        }

        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        return next(error);
    }
});

// 🛡️ ENLACE BLINDADO: Persistencia estricta en la colección física 'pasajeros'
const Pasajero = mongoose.models.Pasajero || mongoose.model('Pasajero', pasajeroSchema, 'pasajeros');

export default Pasajero;