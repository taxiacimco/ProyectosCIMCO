import mongoose from 'mongoose';

const ViajeSchema = new mongoose.Schema({
    pasajeroId: { 
        type: String, 
        required: true 
    },
    conductorId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Conductor', 
        default: null 
    },
    // 📍 GPS interno (Coordenadas reales exactas)
    origen: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    destino: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    // ✍️ Texto escrito por el pasajero (Referencias adicionales)
    origenTexto: {
        type: String,
        required: [true, 'La dirección de recogida escrita es obligatoria'],
        trim: true
    },
    destinoTexto: {
        type: String,
        required: [true, 'La dirección de destino escrita es obligatoria'],
        trim: true
    },
    tarifa: { 
        type: Number, 
        required: true 
    },
    estadoViaje: { 
        type: String, 
        enum: ['buscando', 'aceptado', 'en_ruta', 'completado', 'cancelado'], 
        default: 'buscando' 
    }
}, { 
    timestamps: true 
});

// Exportación segura evitando duplicados en memoria
export default mongoose.models.Viaje || mongoose.model('Viaje', ViajeSchema);