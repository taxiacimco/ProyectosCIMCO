// Versión Arquitectura: V16.5 - Modelo Usuario con Extensión Despachador Terminal y Billetera Unificada
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\models\Usuario.js
 * Misión: Definir la estructura unificada para la entidad de Usuarios (Admin, Despachador, Pasajero, Staff) en MongoDB Atlas.
 * Integridad: Fusión Atómica. Preserva sincronización bidireccional (rol ↔ role, saldo ↔ balance), hashing bcrypt,
 * campos de geolocalización GeoJSON y agrega atributos dedicados para la gestión de despachadores de terminales (terminal_id, codigoDespachador).
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
    // 🛡️ CAMPO PARA LOGROS DE AUTENTICACIÓN
    isActive: {
        type: Boolean,
        default: true
    },
    // 🚀 ATRIBUTOS DE PERTENENCIA OPERATIVA HOMOLOGADOS
    cooperativa: {
        type: String,
        trim: true,
        default: 'Particular'
    },
    empresa: {
        type: String,
        trim: true,
        default: 'Particular'
    },
    // 🏢 ATRIBUTOS ESPECÍFICOS DE DESPACHADOR DE TERMINAL
    terminal_id: {
        type: String,
        trim: true,
        default: null
    },
    codigoDespachador: {
        type: String,
        trim: true,
        sparse: true
    },
    // 🧭 FORMATO GEOJSON POINT NATIVO
    coordenadas: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [-73.3332, 9.5661] } // [longitud, latitud]
    },
    // Campos específicos para compatibilidad polimórfica
    cooperativa_nombre: String,
    flota_id: String,
    placa: String,
    numeroInterno: String
}, {
    timestamps: true,
    versionKey: false
});

// Índices optimizados
usuarioSchema.index({ uid: 1 }, { sparse: true });
usuarioSchema.index({ estado: 1, rol: 1, "coordenadas.coordinates": "2dsphere" }, { 
  name: "idx_usuarios_telemetria_geojson", 
  background: true 
});

// 🛠️ HOOK PRE-SAVE: Sincronización Bidireccional Homóloga y Cifrado
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

        // Sanitización financiera anti-undefined o nulos
        if (isNaN(usuario.saldo) || usuario.saldo < 0) {
            usuario.saldo = 0;
            usuario.balance = 0;
        }

        // Validación preventiva de la estructura del arreglo GeoJSON
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

// 🛡️ MÉTODO COMPLEMENTARIO: Verificación de firmas criptográficas
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

const Usuario = mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema, 'usuarios');

export default Usuario;