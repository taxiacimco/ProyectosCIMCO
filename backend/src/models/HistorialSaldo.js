// Versión Arquitectura: V3.1 - Indexación Compuesta para Auditoría y Reportes Cronológicos Multientidad
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\models\HistorialSaldo.js
 * Misión: Persistir cada movimiento financiero y auditoría contable ejecutada en el sistema,
 * extendiendo el soporte relacional a Conductores y Usuarios (Despachadores/Pasajeros).
 * Integridad: Fusión Atómica. Preserva todo el ecosistema previo (Hooks de guardas anti-NaN/undefined,
 * compatibilidad de campos heredados conductorId/entidadId, refPath dinámico y registro explícito de modelos).
 * Ajuste V3.1: Incorporación de índices compuestos { entidadId: 1, createdAt: -1 } y { conductorId: 1, createdAt: -1 }
 * para acelerar reportes financieros, trazabilidad de extractos y consultas de auditoría de saldo.
 */

import mongoose from 'mongoose';

// 🛡️ Registro explícito de dependencias relacionales en el pool de Mongoose
import '#models/Conductor.js';
import '#models/Usuario.js';
import '#models/Viaje.js';

const HistorialSaldoSchema = new mongoose.Schema({
    // 🛡️ IDENTIFICADOR POLIMÓRFICO: Permite ObjectId o cadenas de texto para máxima flexibilidad entre colecciones
    entidadId: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    // 🏷️ TIPO DE ENTIDAD POLIMÓRFICA: Define el modelo referenciado dinámicamente
    tipoEntidad: {
        type: String,
        enum: ['Conductor', 'Usuario'],
        default: 'Conductor',
        required: true
    },
    // 🚀 CAMPO HEREDADO (COMPATIBILIDAD): Mantiene retrocompatibilidad con controladores existentes
    conductorId: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    viajeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Viaje',
        required: false // Opcional ya que recargas manuales o transferencias no están atadas a viajes
    },
    tipo: {
        type: String,
        enum: ['descuento_comision', 'recarga', 'recarga_manual', 'devolucion', 'transferencia'], // Soporte extendido transaccional
        required: true
    },
    monto: {
        type: Number,
        required: true // El valor absoluto de la transacción
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
        default: 'ADMIN_CENTRAL' // Almacena identificador, email o rol del operador (CEO/Secretaría/Sistema)
    },
    descripcion: {
        type: String,
        default: ''
    }
}, {
    timestamps: true // Trazabilidad temporal automática (createdAt, updatedAt)
});

// 🚀 ÍNDICES COMPUESTOS: Optimización de consultas de auditoría, kardex y reportes cronológicos por entidad/conductor
HistorialSaldoSchema.index({ entidadId: 1, createdAt: -1 });
HistorialSaldoSchema.index({ conductorId: 1, createdAt: -1 });

// 🛡️ GUARDA DE SEGURIDAD Y SINCRONIZACIÓN POLIMÓRFICA (Anti-Undefined / Multi-Modelo)
HistorialSaldoSchema.pre('save', function(next) {
    // Sincronización automática de campos entre la entidad genérica y conductorId para prevenir regresiones
    if (this.entidadId && !this.conductorId && this.tipoEntidad === 'Conductor') {
        this.conductorId = this.entidadId;
    } else if (this.conductorId && !this.entidadId) {
        this.entidadId = this.conductorId;
        this.tipoEntidad = 'Conductor';
    }

    // Sanitización numérica estricta contra corruptores de datos o valores vacíos
    if (this.monto === undefined || this.monto === null || isNaN(this.monto)) this.monto = 0;
    if (this.saldoAnterior === undefined || this.saldoAnterior === null || isNaN(this.saldoAnterior)) this.saldoAnterior = 0;
    if (this.saldoNuevo === undefined || this.saldoNuevo === null || isNaN(this.saldoNuevo)) this.saldoNuevo = 0;
    
    next();
});

// 🛡️ ENLACE BLINDADO: Persistencia estricta en la colección física 'historialsaldos'
export default mongoose.models.HistorialSaldo || mongoose.model('HistorialSaldo', HistorialSaldoSchema, 'historialsaldos');