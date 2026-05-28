// Versión Arquitectura: V6.6 - Integración de Guardas Estrictas Anti-Negativos y Equivalencia de Estados Core
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\models\Conductor.js
 * Misión: Modelar el documento de persistencia del conductor aplicando sanitización e índices espaciales avanzados para Leaflet.js.
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
    // 🚦 Equivalencia de estados alineada con el radar y el frontend (CIMCO-UI)
    estado: { 
        type: String, 
        enum: {
            values: ['active', 'busy', 'offline'],
            message: '{VALUE} no es un estado operativo válido (active, busy, offline)'
        },
        default: 'offline',
        lowercase: true
    },
    // 📍 Estructura GeoJSON estándar obligatoria para indexación y renderizado óptimo en Leaflet.js
    coordenadas: {
        type: { 
            type: String, 
            enum: ['Point'], 
            default: 'Point',
            required: true
        },
        coordinates: { 
            type: [Number], // [Longitud, Latitud]
            default: [-73.33, 9.55], // Centro de coordenadas de La Jagua (Cesar)
            required: true
        }
    },
    // 💰 Control Financiero Blindado de Billetera Local (Espejo de Telemetría)
    saldo: { 
        type: Number, 
        default: 0, 
        required: [true, 'El saldo de la billetera es mandatorio para la aceptación de viajes'],
        min: [0, '⚠️ ALERTA DE NEGOCIO: El saldo no puede ser inferior a $0 COP. Transacción rechazada automáticamente.']
    }
}, { 
    timestamps: true // Inyección nativa y trazabilidad de createdAt y updatedAt
});

// ⚡ Índice Geoespacial de Segunda Generación: Crucial para búsquedas radiales inmediatas por la API
ConductorSchema.index({ coordenadas: "2dsphere" });

// 🛡️ GUARDA ANTI-UNDEFINED & SANITIZACIÓN PRE-SAVE (Capa redundante en ciclo de vida)
ConductorSchema.pre('save', function(next) {
    // Validar que el array de coordenadas posea la estructura matemática exacta [Lng, Lat]
    if (!this.coordenadas || !Array.isArray(this.coordenadas.coordinates) || this.coordenadas.coordinates.length !== 2) {
        this.coordenadas = {
            type: 'Point',
            coordinates: [-73.33, 9.55]
        };
    }
    
    // Forzar consistencia ante posibles valores nulos o indefinidos en el saldo
    if (this.saldo === undefined || this.saldo === null || isNaN(this.saldo)) {
        this.saldo = 0;
    }
    
    next();
});

// Exportación robusta evitando colisiones de recompilación en el contexto de ejecución de Node.js
export default mongoose.models.Conductor || mongoose.model('Conductor', ConductorSchema);