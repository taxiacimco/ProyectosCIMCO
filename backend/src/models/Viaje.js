// Versión Arquitectura: V2.6 - Inyección Quirúrgica de Índices Compuestos contra Concurrencia Masiva y Ráfagas de Telemetría
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\models\Viaje.js
 * Misión: Esquema de transacciones de despacho logístico con referencias cruzadas indexadas por Subpath Imports.
 * Ajuste V2.6: Preservación absoluta de la lógica polimórfica de sincronización de atributos (valor/tarifa, estado/estadoViaje) 
 * e inyección atómica del índice compuesto optimizado para ráfagas concurrentes en la cola del despachador central y administración.
 */

import mongoose from 'mongoose';

// 🛡️ Importaciones preventivas para registrar dependencias relacionales en el ecosistema ESM nativo
import '#models/Usuario.js';
import '#models/Conductor.js';

const ViajeSchema = new mongoose.Schema({
    pasajeroId: {
        type: mongoose.Schema.Types.Mixed, // FUSIÓN ATÓMICA: Soporte Híbrido (String/ObjectId) para evitar rupturas legacy/Ngrok
        ref: 'Usuario', // Apunta de forma estricta al nuevo esquema unificado multi-rol
        required: [true, 'El identificador del pasajero/remitente es obligatorio.']
    },
    conductorId: {
        type: mongoose.Schema.Types.Mixed, // FUSIÓN ATÓMICA: Soporte Híbrido (String/ObjectId) para pruebas de integración y pasarela
        ref: 'Conductor', // Apunta a la tabla operativa de conductores
        default: null
    },
    // 📍 GPS interno y direcciones textuales normalizadas (CIMCO-NEXUS Coexistencia Total)
    origen: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        direccion: { type: String, default: '' }
    },
    destino: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        direccion: { type: String, default: '' }
    },
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
    // 💰 EQUILIBRIO CONTABLE MULTIPLEXADO (Homologación Atómica de Atributos)
    valor: {
        type: Number,
        required: [true, 'El valor del servicio es mandatorio para la liquidación de comisión.']
    },
    tarifa: {
        type: Number,
        required: [true, 'La tarifa base del servicio es requerida para retrocompatibilidad con el bus.']
    },
    // 🚦 ESTADO DEL DESPACHO DE ALTO TRÁFICO
    estado: {
        type: String,
        enum: ['solicitado', 'aceptado', 'en_camino', 'finalizado', 'cancelado'],
        default: 'solicitado',
        lowercase: true
    },
    estadoViaje: {
        type: String,
        enum: ['solicitado', 'aceptado', 'en_camino', 'finalizado', 'cancelado', 'creado', 'iniciado', 'completado', 'terminado'],
        default: 'solicitado',
        lowercase: true
    },
    tipoServicio: {
        type: String,
        enum: ['mototaxi', 'flete', 'intermunicipal', 'motoparrillero', 'motocarga'],
        default: 'mototaxi',
        required: true,
        lowercase: true
    }
}, { 
    timestamps: true,
    versionKey: false
});

/* ==================================================================
   🛡️ MATRIZ DE ÍNDICES: OPTIMIZACIÓN Y BLINDAJE CONTRA WRITE-CONFLICTS
   ================================================================== */

// Índices Simples Existentes
ViajeSchema.index({ pasajeroId: 1 });
ViajeSchema.index({ conductorId: 1 });
ViajeSchema.index({ estado: 1 });
ViajeSchema.index({ estadoViaje: 1 });

// 🛠️ Índice Compuesto 1: Optimización de colas de despacho concurrentes y telemetría reciente
ViajeSchema.index({ estado: 1, createdAt: -1 }, { 
  name: "idx_viajes_estado_recientes", 
  background: true 
});

// 🛠️ Índice Compuesto 2: Cierre contable seguro e inmediato de billeteras (/completar)
// Permite que el hilo de liquidación localice instantáneamente los viajes sin escaneos completos
ViajeSchema.index({ conductorId: 1, estado: 1 }, {
  name: "idx_viajes_conductor_estado",
  background: true
});

// 🛠️ Índice Compuesto 3: Control de doble solicitud en ráfagas de pasajeros (/solicitar)
ViajeSchema.index({ pasajeroId: 1, estado: 1 }, {
  name: "idx_viajes_pasajero_estado",
  background: true
});


// 🛡️ HOOK PRE-SAVE: Guarda de Sincronización Bidireccional (Anti-Undefined en Malla de Negocio)
ViajeSchema.pre('save', function (next) {
    const viaje = this;

    try {
        // Normalización cruzada de variables contables primarias
        if (viaje.isModified('valor') && viaje.valor !== undefined) {
            viaje.tarifa = viaje.valor;
        } else if (viaje.isModified('tarifa') && viaje.tarifa !== undefined) {
            viaje.valor = viaje.tarifa;
        }

        // Mapeo adaptativo y preventivo de estados operativos
        if (viaje.isModified('estado') && viaje.estado) {
            let estadoNormalizado = String(viaje.estado).toLowerCase();
            if (estadoNormalizado === 'finalizado') estadoNormalizado = 'finalizado';
            viaje.estadoViaje = estadoNormalizado;
        } else if (viaje.isModified('estadoViaje') && viaje.estadoViaje) {
            let estadoViajeNormalizado = String(viaje.estadoViaje).toLowerCase();
            if (estadoViajeNormalizado === 'completado' || estadoViajeNormalizado === 'terminado') {
                viaje.estado = 'finalizado';
            } else if (['solicitado', 'aceptado', 'en_camino', 'cancelado'].includes(estadoViajeNormalizado)) {
                viaje.estado = estadoViajeNormalizado;
            }
        }

        // Sincronización estructural de cadenas de texto para evitar fugas de renderizado en UI
        if (viaje.origen && viaje.origen.direccion && !viaje.origenTexto) {
            viaje.origenTexto = viaje.origen.direccion;
        } else if (viaje.origenTexto && viaje.origen && !viaje.origen.direccion) {
            viaje.origen.direccion = viaje.origenTexto;
        }

        if (viaje.destino && viaje.destino.direccion && !viaje.destinoTexto) {
            viaje.destinoTexto = viaje.destino.direccion;
        } else if (viaje.destinoTexto && viaje.destino && !viaje.destino.direccion) {
            viaje.destino.direccion = viaje.destinoTexto;
        }

        next();
    } catch (error) {
        return next(error);
    }
});

// Forzar la construcción automática en caliente de la matriz de índices en Atlas
ViajeSchema.set('autoIndex', true);

// 🛡️ ENLACE BLINDADO: Persistencia estricta en la colección física 'viajes'
export default mongoose.models.Viaje || mongoose.model('Viaje', ViajeSchema, 'viajes');