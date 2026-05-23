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
        lowercase: true 
    },
    estado: { 
        type: String, 
        enum: ['disponible', 'en_viaje', 'desconectado'], 
        default: 'desconectado' 
    },
    // 📍 Estructura GeoJSON obligatoria para búsquedas de alta velocidad
    coordenadas: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], default: [-73.33, 9.55] } // [Longitud, Latitud] - Centro de La Jagua
    },
    // 💰 Control Financiero Blindado
    saldo: { 
        type: Number, 
        default: 0, 
        required: true 
    }
}, { 
    timestamps: true // Crea automáticamente createdAt y updatedAt
});

// ⚡ Índice Geoespacial: Fundamental para que el "Radar" sea inmediato
ConductorSchema.index({ coordenadas: "2dsphere" });

// Exportación segura evitando duplicados en el contexto de ejecución
export default mongoose.models.Conductor || mongoose.model('Conductor', ConductorSchema);