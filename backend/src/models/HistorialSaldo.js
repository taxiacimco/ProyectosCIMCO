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
        required: true
    },
    tipo: {
        type: String,
        enum: ['descuento_comision', 'recarga'],
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
    descripcion: {
        type: String,
        default: ''
    }
}, {
    timestamps: true // Esto nos da la fecha exacta de la transacción automáticamente (createdAt)
});

export default mongoose.models.HistorialSaldo || mongoose.model('HistorialSaldo', HistorialSaldoSchema);