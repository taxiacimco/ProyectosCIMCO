// Versión Arquitectura: V1.2 - Libro Contable Digital para Auditorías de Recargas Manuales y Descuentos
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\models\HistorialSaldo.js
 * Misión: Persistir cada movimiento de dinero ejecutado por el CEO o la Secretaría Auxiliar para evitar fraudes internos.
 */

import mongoose from 'mongoose';

const HistorialSaldoSchema = new mongoose.Schema({
    conductorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conductor',
        required: true
    },
    viajeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Viaje',
        required: false // Hacemos false porque las recargas manuales no tienen un viajeId asociado
    },
    tipo: {
        type: String,
        enum: ['descuento_comision', 'recarga', 'recarga_manual'], // 🛡️ Actualizado para incluir recarga_manual
        required: true
    },
    monto: {
        type: Number,
        required: true // El valor absoluto de la transacción (ej: 700)
    },
    saldoAnterior: {
        type: Number,
        required: true
    },
    saldoNuevo: {
        type: Number,
        required: true
    },
    procesadoPor: {
        type: String,
        default: 'ADMIN_CENTRAL' // Puede almacenar el email o rol de quien operó (CEO/Secretaría)
    },
    descripcion: {
        type: String,
        default: ''
    }
}, {
    timestamps: true // Esto nos da la fecha exacta de la transacción automáticamente (createdAt)
});

// 🛡️ GUARDA DE SEGURIDAD (Anti-Undefined)
HistorialSaldoSchema.pre('save', function(next) {
    if (this.monto === undefined || this.monto === null || isNaN(this.monto)) this.monto = 0;
    if (this.saldoAnterior === undefined || this.saldoAnterior === null || isNaN(this.saldoAnterior)) this.saldoAnterior = 0;
    if (this.saldoNuevo === undefined || this.saldoNuevo === null || isNaN(this.saldoNuevo)) this.saldoNuevo = 0;
    next();
});

export default mongoose.models.HistorialSaldo || mongoose.model('HistorialSaldo', HistorialSaldoSchema);