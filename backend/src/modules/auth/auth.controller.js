// Versión Arquitectura: V17.0 - Fusión Atómica: Extracción Dinámica de Rol y Blindaje UID para Firebase
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\auth\auth.controller.js
 * Misión: Analizar, auditar y blindar el controlador central para sincronizarlo al 100% con los frontends.
 * Ajuste: Extracción estricta de 'rol' y 'uid' desde el documento original para compatibilidad con Firestore.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Conductor from '../../models/Conductor.js';
import Pasajero from '../../models/Pasajero.js';

const JWT_SECRET = process.env.JWT_SECRET || 'Cimco_Master_Key_Secret_Tokens_2026_LaJagua';

// 🛡️ BÓVEDA OTP EN MEMORIA
const otpStore = new Map();

// 🚀 DICCIONARIOS DE SEGMENTACIÓN MATRICIAL
const rolesOperativos = ['conductor', 'despachador', 'mototaxi', 'motoparrillero', 'motocarga'];

/**
 * 🛰️ CONTROLADOR: ACCESO AL NODO CENTRAL (loginUsuario)
 */
export const loginUsuario = async (req, res) => {
    try {
        // 🛡️ GUARDA DE SEGURIDAD (Anti-Undefined)
        if (!req || !req.body) {
            return res.status(400).json({ success: false, message: 'Solicitud mal formada.' });
        }

        const { identifier, password } = req.body;
        if (!identifier || !password) {
            return res.status(400).json({ success: false, message: 'Credenciales incompletas.' });
        }

        console.log(`[CIMCO-TRAFFIC] POST /api/auth/login | Payload Keys Recibidos:`, Object.keys(req.body));

        let usuario = await Conductor.findOne({ $or: [{ email: identifier }, { telefono: identifier }] });
        let esConductor = true;

        if (!usuario) {
            usuario = await Pasajero.findOne({ $or: [{ email: identifier }, { telefono: identifier }] });
            esConductor = false;
        }

        if (!usuario) {
            console.log(`❌ [CIMCO-AUTH] Acceso denegado: Identificador no encontrado (${identifier})`);
            return res.status(401).json({ success: false, message: 'Credenciales inválidas en el sector operativo.' });
        }

        const isMatch = await bcrypt.compare(password, usuario.password);
        if (!isMatch) {
            console.log(`❌ [CIMCO-AUTH] Acceso denegado: Firma de clave incorrecta para (${identifier})`);
            return res.status(401).json({ success: false, message: 'Firma de seguridad incorrecta.' });
        }

        // 🛡️ EXTRACCIÓN DINÁMICA DE ROL Y UID (Para compatibilidad con Firebase)
        const rolExtraido = usuario.rol || (esConductor ? 'conductor' : 'pasajero');
        const uidSeguro = usuario.uid || usuario._id.toString();

        const payload = {
            id: usuario._id,
            uid: uidSeguro,
            rol: rolExtraido
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

        const userData = {
            id: usuario._id,
            uid: uidSeguro,
            nombre: usuario.nombre,
            telefono: usuario.telefono,
            email: usuario.email,
            rol: rolExtraido,
            estado: usuario.estado || 'activo'
        };

        console.log(`✅ [CIMCO-AUTH] Túnel de seguridad abierto para: ${userData.nombre} [${userData.rol.toUpperCase()}]`);

        return res.status(200).json({
            success: true,
            message: 'Autenticación exitosa en el Nodo Central.',
            token,
            user: userData
        });

    } catch (error) {
        console.error("❌ [CIMCO-CORE] Falla sistémica en el Gateway de Login:", error);
        return res.status(500).json({ success: false, message: 'Error de procesamiento en la central.' });
    }
};

/**
 * 🛰️ CONTROLADOR: REGISTRO DE USUARIOS MULTI-ROL (Encriptación Blindada Local)
 */
export const registrarUsuario = async (req, res) => {
    try {
        const { nombre, email, telefono, password, rol, placa } = req.body;

        if (!nombre || !email || !telefono || !password) {
            return res.status(400).json({ success: false, message: 'Datos incompletos.' });
        }

        const esOperativo = rolesOperativos.includes(rol);

        const ModelToUse = esOperativo ? Conductor : Pasajero;
        const existente = await ModelToUse.findOne({ $or: [{ email }, { telefono }] });

        if (existente) {
            return res.status(400).json({ success: false, message: 'La unidad ya está indexada.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const nuevoUsuario = esOperativo 
            ? new Conductor({ nombre, email, telefono, password: hashedPassword, rol, vehiculo: { placa: placa || 'N/A' } })
            : new Pasajero({ nombre, email, telefono, password: hashedPassword, rol: 'pasajero' });

        await nuevoUsuario.save();
        res.status(201).json({ success: true, message: 'Usuario indexado correctamente.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error en el registro.' });
    }
};

/**
 * 🛰️ CONTROLADOR: VERIFICACIÓN TELEFÓNICA (Módulo Phone-First)
 */
export const verificarTelefono = async (req, res) => {
    try {
        const { telefono } = req.body;
        if (!telefono) return res.status(400).json({ success: false, message: 'Teléfono requerido.' });
        
        const conductor = await Conductor.findOne({ telefono });
        const pasajero = await Pasajero.findOne({ telefono });
        
        if (conductor || pasajero) {
            return res.status(200).json({ success: true, existe: true });
        }
        return res.status(200).json({ success: true, existe: false });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error de red.' });
    }
};

/**
 * 🛰️ CONTROLADOR: RECUPERACIÓN OTP
 */
export const solicitarRecuperacion = async (req, res) => {
    try {
        const { identificador } = req.body;
        if (!identificador) {
            return res.status(400).json({ success: false, message: 'Se requiere un correo o teléfono para rastrear la unidad.' });
        }

        let usuario = await Conductor.findOne({ $or: [{ email: identificador }, { telefono: identificador }] });
        if (!usuario) {
            usuario = await Pasajero.findOne({ $or: [{ email: identificador }, { telefono: identificador }] });
        }

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Unidad no localizada en los registros de CIMCO.' });
        }

        const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();
        
        otpStore.set(identificador, {
            codigo: codigoOTP,
            expira: Date.now() + 15 * 60 * 1000 
        });

        console.log(`🔑 [CIMCO-SECURITY] Código OTP generado para ${identificador}: ${codigoOTP}`);

        return res.status(200).json({ 
            success: true, 
            message: 'Código de seguridad emitido. Revise su terminal móvil/email.',
            dev_otp: codigoOTP 
        });
        
    } catch (error) {
        console.error("❌ [CIMCO-CORE] Error al solicitar recuperación:", error);
        return res.status(500).json({ success: false, message: 'Fallo en la emisión de seguridad.' });
    }
};

/**
 * 🛰️ CONTROLADOR: RESTABLECER CLAVE CON OTP
 */
export const restablecerClave = async (req, res) => {
    try {
        const { usuarioIdentificador, otpRecibido, nuevaPassword } = req.body;

        if (!usuarioIdentificador || !otpRecibido || !nuevaPassword) {
            return res.status(400).json({ success: false, message: 'Parámetros de restablecimiento incompletos.' });
        }

        const registroOTP = otpStore.get(usuarioIdentificador);

        if (!registroOTP || registroOTP.codigo !== otpRecibido) {
            return res.status(401).json({ success: false, message: 'El código OTP es inválido o no coincide.' });
        }

        if (Date.now() > registroOTP.expira) {
            otpStore.delete(usuarioIdentificador);
            return res.status(401).json({ success: false, message: 'El código OTP ha expirado por tiempo límite de seguridad.' });
        }

        const salt = await bcrypt.genSalt(10);
        const newHashedPassword = await bcrypt.hash(nuevaPassword, salt);

        let modificado = await Conductor.findOneAndUpdate(
            { $or: [{ email: usuarioIdentificador }, { telefono: usuarioIdentificador }] },
            { password: newHashedPassword }
        );

        if (!modificado) {
            modificado = await Pasajero.findOneAndUpdate(
                { $or: [{ email: usuarioIdentificador }, { telefono: usuarioIdentificador }] },
                { password: newHashedPassword }
            );
        }

        otpStore.delete(usuarioIdentificador);

        console.log(`🔒 [CIMCO-SECURITY] Credenciales actualizadas con éxito mediante OTP para: ${usuarioIdentificador}`);

        return res.status(200).json({
            success: true,
            message: 'Contraseña actualizada correctamente en la base de datos central de TAXIA CIMCO.'
        });

    } catch (error) {
        console.error("❌ [CIMCO-CORE] Error en restablecimiento de clave:", error);
        return res.status(500).json({ success: false, message: 'Error de escritura en el segmento de seguridad.' });
    }
};