// Versión Arquitectura: V1.3 - Flexibilización de Esquema para IDs Mixtos (Producción/Pruebas)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\models\Viaje.js
 * Misión: Esquema de persistencia transaccional del viaje en Atlas.
 */

import mongoose from 'mongoose';

const ViajeSchema = new mongoose.Schema({
    pasajeroId: { 
        type: String, 
        required: true 
    },
    // 🛡️ Ajuste Quirúrgico: Soporte híbrido para ObjectIds (Producción) o Strings puros (Pruebas Ngrok/Postman)
    conductorId: { 
        type: mongoose.Schema.Types.Mixed, 
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