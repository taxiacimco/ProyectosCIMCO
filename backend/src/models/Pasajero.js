// Versión Arquitectura: V16.8 - Eliminación de Índice Duplicado UID en Modelo Pasajero
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\models\Pasajero.js
 * Misión: Mapeo estricto a la colección física 'pasajeros' en MongoDB Atlas.
 * Integridad: Depuración de índice explícito en la propiedad `uid` para silenciar la advertencia
 * de duplicidad en Mongoose, manteniendo la restricción sparse en la definición de campo
 * e índice GeoJSON 2dsphere activo.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const direccionFavoritaSchema = new mongoose.Schema({
    alias: { type: String, required: true, trim: true }, // Ej: "Casa", "Trabajo", "Terminal"
    direccion: { type: String, required: true, trim: true },
    coordenadas: {
        latitud: { type: Number, required: true },
        longitud: { type: Number, required: true }
    }
}, { _id: true });

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
        type: String,
        unique: true,
        sparse: true
    },
    password: {
        type: String,
        required: false
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
    isActive: {
        type: Boolean,
        default: true
    },
    saldo: {
        type: Number,
        default: 0,
        min: [0, '⚠️ ALERTA DE NEGOCIO: El saldo de la billetera del pasajero no puede ser negativo.']
    },
    access_level: {
        type: Number,
        default: 1
    },
    cooperativa: {
        type: String,
        trim: true,
        default: 'Particular'
    },
    empresa: {
        type: String,
        trim: true,
        default: 'Particular'
    },
    uid: {
        type: String,
        sparse: true
    },
    direccionesFavoritas: [direccionFavoritaSchema],
    coordenadas: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [-73.3325, 9.5623] } // [longitud, latitud]
    },
    fechaRegistro: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    versionKey: false
});

// Índices optimizados (se remueve declaración duplicada de uid)
pasajeroSchema.index({ "coordenadas.coordinates": "2dsphere" }, { background: true });

// 🛡️ Sincronización Homóloga de Variables y Cifrado
pasajeroSchema.pre('save', async function (next) {
    try {
        if (!this.fullName && this.nombre) {
            this.fullName = this.nombre;
        } else if (!this.nombre && this.fullName) {
            this.nombre = this.fullName;
        }

        if (this.isModified('rol') && this.rol) {
            this.role = this.rol;
        } else if (this.isModified('role') && this.role) {
            this.rol = this.role;
        }

        if (this.isModified('telefono') && this.telefono) {
            this.telefonoMovil = this.telefono;
        } else if (this.isModified('telefonoMovil') && this.telefonoMovil) {
            this.telefono = this.telefonoMovil;
        }

        if (isNaN(this.saldo) || this.saldo < 0) {
            this.saldo = 0;
        }

        if (!this.coordenadas || !Array.isArray(this.coordenadas.coordinates) || this.coordenadas.coordinates.length !== 2) {
            this.coordenadas = { type: 'Point', coordinates: [-73.3325, 9.5623] };
        }

        if (!this.isModified('password') || !this.password) {
            return next();
        }

        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        return next(error);
    }
});

const Pasajero = mongoose.models.Pasajero || mongoose.model('Pasajero', pasajeroSchema, 'pasajeros');

export default Pasajero;