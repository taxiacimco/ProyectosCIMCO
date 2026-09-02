// Versión Arquitectura: V1.2 - Eliminación de Index Redundante en Campo NIT
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\models\Cooperativa.js
 * Misión: Mapeo y gestión de la colección de cooperativas asociadas dentro del ecosistema TAXIA CIMCO.
 * Integridad: Fusión Atómica. Preserva todo el ecosistema previo (Relaciones con Usuarios/Despachadores y Conductores,
 * enums de estado, límites de flota y trazabilidad temporal).
 * Ajuste V1.2: Remoción de 'index: true' en el campo 'nit' para eliminar redundancia de indexación con 'unique: true'.
 */

import mongoose from 'mongoose';

const cooperativaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre de la cooperativa es obligatorio'],
    trim: true
  },
  nit: {
    type: String,
    required: [true, 'El NIT es obligatorio'],
    unique: true,
    trim: true
  },
  telefono: {
    type: String,
    trim: true
  },
  ciudad: {
    type: String,
    default: 'La Jagua de Ibirico'
  },
  estado: {
    type: String,
    enum: ['activa', 'inactiva', 'suspendida'],
    default: 'activa'
  },
  despachadores: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  }],
  conductoresAsignados: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conductor'
  }],
  limiteFlota: {
    type: Number,
    default: 50
  }
}, {
  timestamps: true
});

export default mongoose.models.Cooperativa || mongoose.model('Cooperativa', cooperativaSchema);