// Versión Arquitectura: V21.29 - Reconfiguración del Atributo UID con Unicidad y Dispersión Unificada
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\models\Pasajero.js
 * Misión: Mapeo estricto a la colección física 'pasajeros' en MongoDB Atlas.
 * Integridad: Fusión Atómica. Preserva cifrado Bcrypt con guarda anti-doble hashing (isModified('password')
 * y detección de prefijo hash $2a$/$2b$), esquema de direcciones favoritas, soporte GeoJSON 2dsphere,
 * aprobación automática inmediata, URL de foto_perfil y normalización de variables.
 * Ajuste V21.29: Homologación del atributo 'uid' con { type: String, unique: true, sparse: true } para prevenir desbordamientos E11000.
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
        required: false,
        select: false
    },
    role: {
        type: String,
        default: 'pasajero'
    },
    rol: {
        type: String,
        default: 'pasajero'
    },
    // 📷 MULTIMEDIA DE PERFIL (URL de avatar/fotografía)
    foto_perfil: {
        type: String,
        default: null
    },
    // 🟢 APROBACIÓN AUTOMÁTICA: Nace APROBADO/activo por defecto para evitar fricciones de registro
    estado: {
        type: String,
        default: 'APROBADO'
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
    terminal_sede: {
        type: String,
        trim: true,
        default: 'Particular'
    },
    uid: {
        type: String,
        unique: true,
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

// Índices optimizados
pasajeroSchema.index({ "coordenadas.coordinates": "2dsphere" }, { background: true });

// 🛡️ Sincronización Homóloga de Variables y Cifrado Anti-Doble Hashing
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

        // 🔒 BLINDAJE ANTI-DOBLE HASHING:
        // Evalúa si el campo contraseña fue modificado y no está vacío
        if (!this.isModified('password') || !this.password) {
            return next();
        }

        // Si la contraseña ya viene encriptada con Bcrypt (empieza por $2a$, $2b$ o $2y$ y tiene longitud de hash), evita un segundo hashing
        const isAlreadyHashed = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(this.password);
        if (isAlreadyHashed) {
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