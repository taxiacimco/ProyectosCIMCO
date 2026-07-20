// Versión Arquitectura: V16.2 - Integración de Atributo de Autenticación isActive, Geolocalización y Control de Saldos en Pasajeros
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\models\Pasajero.js
 * Misión: Mapeo estricto a la colección física 'pasajeros' en MongoDB Atlas.
 * Integridad: Rompe la dependencia legacy con Usuario.js y establece un esquema blindado propio.
 * Ajuste V16.2: Inclusión de los campos `isActive`, `saldo`, `access_level` y sub-esquema de `coordenadas` 
 * para garantizar la compatibilidad de inicio de sesión de pasajeros, previniendo errores 403 por asimetría de propiedades.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const coordenadasSchema = new mongoose.Schema({
    latitud: {
        type: Number,
        default: 9.5623
    },
    longitud: {
        type: Number,
        default: -73.3325
    },
    ultimaActualizacion: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

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
        required: false // Se establece en false para soportar usuarios de Firebase sin contraseña local inicial
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
    // 🚀 AGREGADO: Atributos de pertenencia operativa homologados para evitar descalce en updateProfile
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
        type: String
    },
    coordenadas: {
        type: coordenadasSchema,
        default: () => ({})
    },
    fechaRegistro: {
        type: Date,
        default: Date.now
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

// 🛡️ ENLACE BLINDADO: Persistencia estricta en la colección física 'pasajeros'
const Pasajero = mongoose.models.Pasajero || mongoose.model('Pasajero', pasajeroSchema, 'pasajeros');

export default Pasajero;