// Versión Arquitectura: V16.1 - Inyección de Guarda Semántica Operativa y GeoJSON Unificado
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\models\Conductor.js
 * Misión: Definición del documento del Conductor con soporte Multi-Rol y persistencia estricta en 'conductores'.
 * Integridad: Fusión Atómica. Incorpora la guarda de seguridad semántica `estadoOperativo` junto con su mapeo automático,
 * consolidando un único campo GeoJSON Point optimizado llamado `ubicacion` para eliminar la duplicidad de telemetría
 * sin romper las validaciones contables ni las sincronizaciones redundantes de roles heredadas.
 */

import mongoose from 'mongoose';

const ConductorSchema = new mongoose.Schema({
    nombre: { 
        type: String, 
        required: [true, 'El nombre es obligatorio'], 
        trim: true 
    },
    email: { 
        type: String, 
        unique: true, 
        required: [true, 'El correo es obligatorio'], 
        lowercase: true, 
        trim: true 
    },
    conductorId: { 
        type: String, 
        unique: true, 
        sparse: true 
    },
    telefono: { 
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
        default: 'conductor', 
        lowercase: true, 
        trim: true 
    },
    rol: { 
        type: String, 
        default: 'conductor', 
        lowercase: true, 
        trim: true 
    },
    access_level: { 
        type: Number, 
        default: 10 
    },
    // Campo tradicional extendido para soportar los estados del controlador
    estado: { 
        type: String, 
        enum: ['active', 'busy', 'offline', 'disponible', 'ocupado', 'en_ruta', 'asignado'],
        default: 'offline',
        lowercase: true 
    },
    // 🛡️ GUARDA SEMÁNTICA OPERATIVA: Control atómico e inequívoco para bloqueos transaccionales rápidos
    estadoOperativo: {
        type: String,
        enum: ['DISPONIBLE', 'OCUPADO', 'NO_DISPONIBLE'],
        default: 'NO_DISPONIBLE',
        uppercase: true
    },
    viajeActualId: {
        type: String,
        default: null
    },
    // Unificado a un solo campo GeoJSON nativo para evitar sobrecostos de indexación doble
    ubicacion: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [-73.3332, 9.5661] } // [longitud, latitud]
    },
    saldo: { 
        type: Number, 
        default: 0, 
        min: [0, 'El saldo no puede ser inferior a $0 COP.'] 
    }
}, { timestamps: true });

// Índices optimizados para el motor de geolocalización y bloqueos transaccionales
ConductorSchema.index({ ubicacion: "2dsphere" });
ConductorSchema.index({ estadoOperativo: 1 });

// 🛠️ HOOK PRE-SAVE: Sincronización Automática de Estados y Geometría Anti-Undefined
ConductorSchema.pre('save', function(next) {
    const cond = this;

    // Sincronización automática del estado operativo semántico basado en el estado transaccional o viaje asignado
    if (cond.isModified('estado') || cond.isModified('viajeActualId')) {
        const est = cond.estado ? String(cond.estado).toLowerCase() : 'offline';
        
        if (cond.viajeActualId || ['busy', 'ocupado', 'en_ruta', 'asignado'].includes(est)) {
            cond.estadoOperativo = 'OCUPADO';
        } else if (['active', 'disponible'].includes(est)) {
            cond.estadoOperativo = 'DISPONIBLE';
        } else {
            cond.estadoOperativo = 'NO_DISPONIBLE';
        }
    }

    // Salvaguarda geométrica GeoJSON Point nativa
    if (!cond.ubicacion || !Array.isArray(cond.ubicacion.coordinates) || cond.ubicacion.coordinates.length !== 2) {
        cond.ubicacion = { type: 'Point', coordinates: [-73.3332, 9.5661] };
    }

    // Blindaje de seguridad financiera (Anti-Null / Anti-NaN)
    if (cond.saldo === undefined || cond.saldo === null || isNaN(cond.saldo)) {
        cond.saldo = 0;
    }

    // Sincronización bidireccional homóloga de roles operativos
    if (cond.isModified('rol') && cond.rol) {
        cond.role = cond.rol;
    } else if (cond.isModified('role') && cond.role) {
        cond.rol = cond.role;
    }

    next();
});

// 🛡️ ENLACE BLINDADO DEFINITIVO: Persistencia estricta en la colección 'conductores'
const Conductor = mongoose.models.Conductor || mongoose.model('Conductor', ConductorSchema, 'conductores');

export default Conductor;