// Versión Arquitectura: V16.3 - Depuración de Token Inesperado de Citación en Mongoose Schema
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\models\Conductor.js
 * Misión: Mapeo y normalización de la colección física 'conductores' en MongoDB Atlas.
 * Integridad: Fusión Atómica. Remoción inmediata de marcas de citación conversacional inyectadas en la 
 * validación del campo 'saldo' para restaurar la validez de la sintaxis del motor V8 (ESM). Preserva intactas 
 * todas las guardas transaccionales, indexación 2dsphere y esquemas de multi-subrol integrados previamente.
 */

import mongoose from 'mongoose';

const coordenadasSchema = new mongoose.Schema({
    latitud: { type: Number },
    longitud: { type: Number },
    ultimaActualizacion: { type: Date, default: Date.now }
}, { _id: false });

const ConductorSchema = new mongoose.Schema({
    nombre: { 
        type: String, 
        required: [true, '⚠️ El nombre es obligatorio.'], 
        trim: true 
    },
    email: { 
        type: String, 
        unique: true, 
        required: [true, '⚠️ El correo es obligatorio.'], 
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
        required: true,
        unique: true, 
        sparse: true 
    },
    password: { 
        type: String, 
        required: true 
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
    subrol: { 
        type: String, 
        enum: ['motocarga', 'mototaxi', 'motoparrillero', 'conductor_intermunicipal'],
        required: true 
    },
    access_level: { 
        type: Number, 
        default: 10 
    },
    // 🏷️ ATRIBUTOS VEHICULARES Y OPERATIVOS
    placa: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    numeroInterno: {
        type: String,
        required: true,
        trim: true
    },
    cooperativa: {
        type: String,
        trim: true,
        default: 'Particular'
    },
    // 🚀 AGREGADO: Campo homologado para prevenir descalce documental en updateProfile
    empresa: {
        type: String,
        trim: true,
        default: 'Particular'
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
        default: 'DISPONIBLE',
        uppercase: true
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    uid: { 
        type: String 
    },
    flota_id: { 
        type: String, 
        default: null 
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
    coordenadas: { 
        type: coordenadasSchema, 
        default: () => ({}) 
    },
    saldo: { 
        type: Number, 
        default: 0, 
        min: [0, 'El saldo no puede ser inferior a $0 COP.'] 
    },
    saldoWallet: { 
        type: Number, 
        default: 0 
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

    // Sincronización de espejo para la estructura incrustada coordenadasSchema
    if (cond.ubicacion && Array.isArray(cond.ubicacion.coordinates) && cond.ubicacion.coordinates.length === 2) {
        cond.coordenadas.longitud = cond.ubicacion.coordinates[0];
        cond.coordenadas.latitud = cond.ubicacion.coordinates[1];
        cond.coordenadas.ultimaActualizacion = new Date();
    } else if (cond.coordenadas && cond.coordenadas.longitud && cond.coordenadas.latitud) {
        cond.ubicacion = {
            type: 'Point',
            coordinates: [cond.coordenadas.longitud, cond.coordenadas.latitud]
        };
    } else {
        // Salvaguarda geométrica GeoJSON Point nativa predeterminada
        cond.ubicacion = { type: 'Point', coordinates: [-73.3332, 9.5661] };
        cond.coordenadas = { longitud: -73.3332, latitud: 9.5661, ultimaActualizacion: new Date() };
    }

    // Blindaje de seguridad financiera (Anti-Null / Anti-NaN / Preservación de saldos)
    if (cond.saldo === undefined || cond.saldo === null || isNaN(cond.saldo)) {
        cond.saldo = 0;
    }
    if (cond.saldoWallet === undefined || cond.saldoWallet === null || isNaN(cond.saldoWallet)) {
        cond.saldoWallet = 0;
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