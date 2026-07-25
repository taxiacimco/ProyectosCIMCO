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

export default mongoose.model('Cooperativa', cooperativaSchema);