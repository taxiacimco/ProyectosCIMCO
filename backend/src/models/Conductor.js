// Versión Arquitectura: V7.0 - Esquema Unificado de Telemetría GeoJSON y Billetera Atómica Manual
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\models\Conductor.js
 * Misión: Defición del documento del Conductor (Taxis/Mototaxis) con soporte Geoespacial 2dsphere y balance financiero blindado.
 * Regla de Negocio: Prohibido saldos inferiores a $0. Garantiza consistencia transaccional ACID local.
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
    // 🚦 Estado operativo sincronizado con minúsculas estrictas para equivalencia en Firestore
    estado: { 
        type: String, 
        enum: {
            values: ['active', 'busy', 'offline'],
            message: '{VALUE} no es un estado operativo válido (active, busy, offline)'
        },
        default: 'offline',
        lowercase: true
    },
    // 📍 Estructura GeoJSON estándar para Leaflet.js e indexación radial inmediata
    coordenadas: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitud, latitud] -> Orden estricto de MongoDB GeoJSON
            default: [-73.3332, 9.5661] // Centro base de La Jagua de Ibirico
        }
    },
    // 💰 Billetera Interna Recargable a Mano por Administración
    saldo: { 
        type: Number, 
        default: 0, 
        required: [true, 'El saldo de la billetera es mandatorio para la aceptación de viajes'],
        min: [0, '⚠️ ALERTA DE NEGOCIO: El saldo no puede ser inferior a $0 COP. Transacción rechazada automáticamente.']
    }
}, { 
    timestamps: true 
});

// ⚡ Índice Geoespacial de 2da Generación para consultas masivas de proximidad
ConductorSchema.index({ coordenadas: "2dsphere" });

// 🛡️ GUARDA ANTI-UNDEFINED PRE-SAVE
ConductorSchema.pre('save', function(next) {
    if (!this.coordenadas || !Array.isArray(this.coordenadas.coordinates) || this.coordenadas.coordinates.length !== 2) {
        this.coordenadas = { type: 'Point', coordinates: [-73.3332, 9.5661] };
    }
    if (this.saldo === undefined || this.saldo === null || isNaN(this.saldo)) {
        this.saldo = 0;
    }
    next();
});

export default mongoose.models.Conductor || mongoose.model('Conductor', ConductorSchema);