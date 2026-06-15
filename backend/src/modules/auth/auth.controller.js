// Versión Arquitectura: V18.2 - Cierre de Brecha de Escalada de Privilegios (Privilege Escalation)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\auth\auth.controller.js
 * Misión: Unificar la simetría de payloads con el Frontend V9.3 sin destruir el Firewall ACL ni las rutas de registro existentes.
 * Ajuste V18.2: Implementación de Lista Blanca en el registro público. Downgrade automático para bloquear inyecciones de rol 'admin', 'secretaria' o 'despachador' desde el cliente.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Conductor from '../../models/Conductor.js';
import Pasajero from '../../models/Pasajero.js';

const JWT_SECRET = process.env.JWT_SECRET || 'Cimco_Master_Key_Secret_Tokens_2026_LaJagua';

// 🛡️ BÓVEDA OTP EN MEMORIA
const otpStore = new Map();

// 🚀 DICCIONARIOS DE SEGMENTACIÓN MATRICIAL Y GOBERNANZA ESTRICTA
const ROLES_OPERATIVOS = ['conductor', 'despachador', 'mototaxi', 'motoparrillero', 'motocarga', 'intermunicipal', 'admin', 'secretaria', 'staff'];

// 🛡️ LISTA BLANCA DE REGISTRO PÚBLICO: Solo estos roles pueden autogestionarse sin un token superior
const ROLES_PUBLICOS_PERMITIDOS = ['pasajero', 'conductor', 'mototaxi', 'motoparrillero', 'motocarga'];

// 🔐 FIREWALL ACL BACKEND: El servidor dicta el nivel, no el cliente.
const MAPEO_ACCESOS_BACKEND = {
    'admin': 99,
    'secretaria': 50,
    'staff': 50,
    'despachador': 30,
    'intermunicipal': 20,
    'conductor': 10,
    'mototaxi': 10,
    'motoparrillero': 10,
    'motocarga': 10,
    'pasajero': 0
};

/**
 * 🛰️ CONTROLADOR: ACCESO AL NODO CENTRAL (loginUsuario)
 */
export const loginUsuario = async (req, res) => {
    try {
        if (!req || !req.body) {
            return res.status(400).json({ success: false, message: 'Solicitud mal formada.' });
        }

        const { identifier, password } = req.body;
        if (!identifier || !password) {
            return res.status(400).json({ success: false, message: 'Credenciales incompletas en el payload.' });
        }

        if (process.env.NODE_ENV !== 'production') {
            console.log(`[CIMCO-TRAFFIC] POST /api/auth/login | Payload Keys Recibidos:`, Object.keys(req.body));
        }

        let usuario = await Conductor.findOne({ $or: [{ email: identifier }, { telefono: identifier }] });
        let esConductor = true;

        if (!usuario) {
            usuario = await Pasajero.findOne({ $or: [{ email: identifier }, { telefono: identifier }] });
            esConductor = false;
        }

        if (!usuario) {
            console.log(`❌ [CIMCO-AUTH] Acceso denegado: Identificador no encontrado (${identifier})`);
            return res.status(404).json({ success: false, message: 'Identificador no encontrado en el sector operativo.' });
        }

        const isMatch = await bcrypt.compare(password, usuario.password);
        
        if (!isMatch) {
            console.log(`❌ [CIMCO-AUTH] Acceso denegado: Firma de clave incorrecta para (${identifier})`);
            return res.status(401).json({ success: false, message: 'Firma de seguridad incorrecta.' });
        }

        const rolExtraido = (usuario.role || usuario.rol || (esConductor ? 'conductor' : 'pasajero')).toLowerCase();
        const uidSeguro = usuario.uid || usuario._id.toString();
        const nivelAcceso = usuario.access_level !== undefined ? usuario.access_level : (MAPEO_ACCESOS_BACKEND[rolExtraido] || 0);

        const payload = { id: usuario._id, uid: uidSeguro, role: rolExtraido, access_level: nivelAcceso };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

        const userData = {
            id: usuario._id,
            uid: uidSeguro,
            nombre: usuario.nombre,
            telefono: usuario.telefono,
            email: usuario.email,
            role: rolExtraido,
            rol: rolExtraido, 
            access_level: nivelAcceso,
            estado: usuario.estado || 'activo'
        };

        console.log(`✅ [CIMCO-AUTH] Túnel de seguridad abierto para: ${userData.nombre} [${userData.role.toUpperCase()} - LVL ${userData.access_level}]`);

        return res.status(200).json({ success: true, message: 'Autenticación exitosa en el Nodo Central.', token, user: userData });

    } catch (error) {
        console.error("❌ [CIMCO-CORE] Falla sistémica en el Gateway de Login:", error);
        return res.status(500).json({ success: false, message: 'Falla interna en el nodo de autenticación.' });
    }
};

/**
 * 🛰️ CONTROLADOR: REGISTRO DE USUARIOS MULTI-ROL (Encriptación Blindada Local)
 */
export const registrarUsuario = async (req, res) => {
    try {
        const { nombre, email, telefono, password, rol, role, placa, empresa, numero_interno, numeroInterno } = req.body;

        if (!nombre || !email || !telefono || !password) {
            return res.status(400).json({ success: false, message: 'Datos críticos incompletos.' });
        }

        let rolAsignado = (role || rol || 'pasajero').toLowerCase().trim();

        // 🛡️ CIERRE DE BRECHA: Bloqueo de Escalada de Privilegios
        if (!ROLES_PUBLICOS_PERMITIDOS.includes(rolAsignado)) {
            console.warn(`⚠️ [CIMCO-SECURITY] Inyección de rol bloqueada. Rol solicitado: ${rolAsignado}. Downgrade aplicado a pasajero.`);
            rolAsignado = 'pasajero'; // Degradación inmediata del atacante
        }

        const esOperativo = ROLES_OPERATIVOS.includes(rolAsignado);
        const nivelSeguridadForzado = MAPEO_ACCESOS_BACKEND[rolAsignado] || 0;

        const ModelToUse = esOperativo ? Conductor : Pasajero;
        const existente = await ModelToUse.findOne({ $or: [{ email: email.toLowerCase() }, { telefono }] });

        if (existente) {
            return res.status(409).json({ success: false, message: 'La unidad ya está indexada en la red.' });
        }

        let metadataFoto = null;
        if (req.file) {
            console.log(`📸 [CIMCO-BINARIO] Procesando archivo de perfil: ${req.file.originalname} | Size: ${req.file.size} bytes`);
            metadataFoto = 'BINARIO_EN_MEMORIA_PENDIENTE_DE_NUBE'; 
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const payloadBase = {
            nombre: nombre.trim(),
            email: email.toLowerCase().trim(),
            telefono: telefono.trim(),
            password: hashedPassword,
            role: rolAsignado,
            rol: rolAsignado, 
            access_level: nivelSeguridadForzado
        };

        let nuevoUsuario;

        if (esOperativo) {
            nuevoUsuario = new Conductor({
                ...payloadBase,
                vehiculo: { placa: placa ? placa.toUpperCase().trim() : 'N/A' },
                empresa: empresa ? empresa.trim() : 'INDEPENDIENTE',
                numeroInterno: numero_interno?.trim() || numeroInterno?.trim() || 'S/N'
            });
        } else {
            nuevoUsuario = new Pasajero({
                ...payloadBase,
                ...(metadataFoto && { fotoPerfilUrl: metadataFoto }) 
            });
        }

        await nuevoUsuario.save();
        
        console.log(`✅ [CIMCO-AUTH] Nuevo registro: ${nombre} | ROL: ${rolAsignado.toUpperCase()} | LVL: ${nivelSeguridadForzado}`);
        res.status(201).json({ success: true, message: 'Usuario indexado correctamente bajo protocolos seguros.' });
    } catch (error) {
        console.error("❌ [CIMCO-CORE] Error en registro de unidad:", error);
        res.status(500).json({ success: false, message: 'Error de persistencia en la base de datos.' });
    }
};

/**
 * 🛰️ CONTROLADOR: VERIFICACIÓN TELEFÓNICA
 */
export const verificarTelefono = async (req, res) => {
    try {
        const { telefono } = req.body;
        if (!telefono) return res.status(400).json({ success: false, message: 'Teléfono requerido.' });
        
        const conductor = await Conductor.findOne({ telefono });
        const pasajero = await Pasajero.findOne({ telefono });
        
        if (conductor || pasajero) return res.status(200).json({ success: true, existe: true });
        return res.status(200).json({ success: true, existe: false });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error de red en el nodo de verificación.' });
    }
};

/**
 * 🛰️ CONTROLADOR: RECUPERACIÓN OTP
 */
export const solicitarRecuperacion = async (req, res) => {
    try {
        const { inputUser } = req.body;
        
        if (!inputUser) return res.status(400).json({ success: false, message: 'El identificador es obligatorio para solicitar OTP.' });

        let usuario = await Conductor.findOne({ $or: [{ email: inputUser }, { telefono: inputUser }] });
        if (!usuario) {
            usuario = await Pasajero.findOne({ $or: [{ email: inputUser }, { telefono: inputUser }] });
        }

        if (!usuario) return res.status(404).json({ success: false, message: 'Unidad no localizada en los registros de CIMCO.' });

        const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();
        
        otpStore.set(inputUser, { codigo: codigoOTP, expira: Date.now() + 15 * 60 * 1000 });

        console.log(`🔑 [CIMCO-SECURITY] Código OTP generado para ${inputUser}: ${codigoOTP}`);

        return res.status(200).json({ success: true, message: 'Código de seguridad emitido. Revise su terminal móvil/email.', dev_otp: codigoOTP });
        
    } catch (error) {
        console.error("❌ [CIMCO-CORE] Error al solicitar recuperación OTP:", error);
        return res.status(500).json({ success: false, message: 'Servicio de bóveda no disponible.' });
    }
};

/**
 * 🛰️ CONTROLADOR: RESTABLECER CLAVE CON OTP
 */
export const restablecerClave = async (req, res) => {
    try {
        const { inputUser, codigo, nuevaPassword } = req.body;

        if (!inputUser || !codigo || !nuevaPassword) return res.status(400).json({ success: false, message: 'Payload incompleto para restablecimiento.' });

        const registroOTP = otpStore.get(inputUser);

        if (!registroOTP || registroOTP.codigo !== codigo) return res.status(401).json({ success: false, message: 'El código OTP es inválido o no coincide.' });

        if (Date.now() > registroOTP.expira) {
            otpStore.delete(inputUser);
            return res.status(401).json({ success: false, message: 'El código OTP ha expirado por tiempo límite de seguridad.' });
        }

        const salt = await bcrypt.genSalt(10);
        const newHashedPassword = await bcrypt.hash(nuevaPassword, salt);

        let modificado = await Conductor.findOneAndUpdate({ $or: [{ email: inputUser }, { telefono: inputUser }] }, { password: newHashedPassword });

        if (!modificado) {
            modificado = await Pasajero.findOneAndUpdate({ $or: [{ email: inputUser }, { telefono: inputUser }] }, { password: newHashedPassword });
        }

        otpStore.delete(inputUser);

        console.log(`🔒 [CIMCO-SECURITY] Credenciales actualizadas con éxito mediante OTP para: ${inputUser}`);

        return res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente en la base de datos central de TAXIA CIMCO.' });

    } catch (error) {
        console.error("❌ [CIMCO-CORE] Error en restablecimiento de clave:", error);
        return res.status(500).json({ success: false, message: 'Error interno en la actualización de credenciales.' });
    }
};