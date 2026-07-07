// Versión Arquitectura: V6.2 - Transición GeoJSON Nativa y Coexistencia de Billetera Homóloga
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\models\Usuario.js
 * Misión: Definir la estructura unificada para la entidad de Usuarios en MongoDB Atlas con GeoJSON Point oficial.
 * Integridad: Fusión Atómica. Pone fin a la dualidad nominal forzando a Mongoose a persistir
 * estrictamente en la colección física 'usuarios' (tercer parámetro de exportación). Preserva las
 * guardas pre-save de sincronización bidireccional homóloga (rol ↔ role y saldo ↔ balance).
 * Ajuste V6.2: Mutación definitiva de la propiedad `coordenadas` a un formato compatible GeoJSON Point oficial
 * para consultas indexadas $near instantáneas, preservando la compatibilidad retroactiva a nivel de hooks pre-save.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const usuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, '⚠️ El nombre de la entidad es obligatorio para el registro perimetral.'],
        trim: true
    },
    fullName: {
        type: String,
        trim: true
    },
    username: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    email: {
        type: String,
        required: [true, '⚠️ El correo electrónico institucional es un campo requerido.'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, '⚠️ Por favor, ingrese un correo electrónico con estructura válida.']
    },
    telefono: {
        type: String,
        required: [true, '⚠️ El identificador telefónico es mandatorio para el ruteo de alertas OTP.'],
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, '⚠️ La clave de acceso criptográfica es obligatoria para el resguardo de la sesión.']
    },
    rol: {
        type: String,
        enum: {
            values: ['pasajero', 'despachador', 'admin', 'secretaria', 'staff', 'conductor'],
            message: '⚠️ El rol operativo proporcionado ({VALUE}) no pertenece a la matriz autorizada.'
        },
        default: 'pasajero'
    },
    // 🔄 HOMOLOGACIÓN REDUNDANTE: Mapeo espejo por compatibilidad con controladores Legacy / Clientes V3.x
    role: {
        type: String,
        enum: ['pasajero', 'despachador', 'admin', 'secretaria', 'staff', 'conductor'],
        default: 'pasajero'
    },
    saldo: {
        type: Number,
        default: 0,
        min: [0, '⚠️ ALERTA DE NEGOCIO: El saldo de la billetera unificada no puede descender de $0 COP.']
    },
    // 🔄 HOMOLOGACIÓN REDUNDANTE: Billetera espejo por compatibilidad con integraciones externas
    balance: {
        type: Number,
        default: 0,
        min: [0, '⚠️ ALERTA DE NEGOCIO: El balance financiero alterno no puede descender de $0 COP.']
    },
    access_level: {
        type: Number,
        default: 1
    },
    uid: {
        type: String,
        default: null
    },
    estado: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'offline', 'online', 'activo'],
        default: 'offline'
    },
    // 🧭 AJUSTE GEOMÉTRICO OFICIAL: Formato GeoJSON Point nativo para consultas indexadas $near instantáneas
    coordenadas: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [-73.3332, 9.5661] } // [longitud, latitud]
    },
    // Campos específicos de conductores y despachadores simulados
    cooperativa_nombre: String,
    flota_id: String,
    placa: String,
    numeroInterno: String
}, {
    timestamps: true,
    versionKey: false
});

// Mantener índice sparse estrictamente necesario para integraciones con Firebase UID
usuarioSchema.index({ uid: 1 }, { sparse: true });

// 🛠️ INYECCIÓN DE SEGURIDAD V6.2: Índice geoespacial compuesto actualizado para soportar la ruta exacta de la propiedad GeoJSON .coordinates
usuarioSchema.index({ estado: 1, rol: 1, "coordenadas.coordinates": "2dsphere" }, { 
  name: "idx_usuarios_telemetria_geojson", 
  background: true 
});

// 🛡️ HOOK PRE-SAVE: Sincronización Bidireccional Homóloga y Cifrado
usuarioSchema.pre('save', async function (next) {
    const usuario = this;

    try {
        // Normalización de Nombres
        if (!usuario.fullName && usuario.nombre) {
            usuario.fullName = usuario.nombre;
        } else if (!usuario.nombre && usuario.fullName) {
            usuario.nombre = usuario.fullName;
        }

        // Guardas de Seguridad y Normalización Homóloga de Roles
        if (usuario.isModified('rol') && usuario.rol) {
            usuario.role = usuario.rol;
        } else if (usuario.isModified('role') && usuario.role) {
            usuario.rol = usuario.role;
        }

        // Guardas de Seguridad y Normalización Homóloga de Saldos Contables
        if (usuario.isModified('saldo')) {
            usuario.balance = usuario.saldo;
        } else if (usuario.isModified('balance')) {
            usuario.saldo = usuario.balance;
        }

        // Validación preventiva de la estructura del arreglo GeoJSON y resguardo geométrico
        if (!usuario.coordenadas || !Array.isArray(usuario.coordenadas.coordinates) || usuario.coordenadas.coordinates.length !== 2) {
            usuario.coordenadas = { type: 'Point', coordinates: [-73.3332, 9.5661] };
        }

        if (!usuario.isModified('password')) {
            return next();
        }

        const salt = await bcrypt.genSalt(10);
        usuario.password = await bcrypt.hash(usuario.password, salt);
        next();
    } catch (error) {
        return next(error);
    }
});

// 🛡️ MÉTODO COMPLEMENTARIO: Verificación de firmas criptográficas bajo bcrypt
usuarioSchema.methods.compararPassword = async function (passwordCandidato) {
    if (!passwordCandidato || !this.password) {
        return false;
    }
    try {
        return await bcrypt.compare(String(passwordCandidato), this.password);
    } catch (err) {
        console.error("🚨 [CIMCO-SECURITY-FATAL] Error en el handshake de comparación de credenciales hash:", err);
        return false;
    }
};

// 🔥 TRUCO MAESTRO: El tercer parámetro 'usuarios' blinda el ORM contra pluralizaciones en inglés (users)
const Usuario = mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema, 'usuarios');

export default Usuario;