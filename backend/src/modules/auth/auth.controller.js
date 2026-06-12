// Versión Arquitectura: V18.1 - Fusión Atómica: Simetría de Payloads (Login/OTP) y Preservación de ACL Backend
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\auth\auth.controller.js
 * Misión: Unificar la simetría de payloads con el Frontend V9.3 sin destruir el Firewall ACL ni las rutas de registro existentes.
 * Ajuste: Se inyectan las llaves simétricas (inputUser, codigo, nuevaPassword) en los flujos de recuperación preservando la lógica base.
 * Corrección V18.1: Blindaje de instanciación Multi-Rol para Colección Operativa. Se fuerza el rol asignado en el constructor
 * para evitar que el esquema de Conductor degrade a Despachadores, Secretarias o Admins.
 * Regla de Oro: El backend NUNCA confía en el access_level del frontend.
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
 * Simetría Activa: Recibe { identifier, password } desde Login.jsx
 */
export const loginUsuario = async (req, res) => {
    try {
        // 🛡️ GUARDA DE SEGURIDAD: 400 Bad Request
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

        // 🛡️ 404 NOT FOUND: Crucial para la redirección predictiva del Frontend
        if (!usuario) {
            console.log(`❌ [CIMCO-AUTH] Acceso denegado: Identificador no encontrado (${identifier})`);
            return res.status(404).json({ success: false, message: 'Identificador no encontrado en el sector operativo.' });
        }

        const isMatch = await bcrypt.compare(password, usuario.password);
        
        // 🛡️ 401 UNAUTHORIZED: Clave incorrecta
        if (!isMatch) {
            console.log(`❌ [CIMCO-AUTH] Acceso denegado: Firma de clave incorrecta para (${identifier})`);
            return res.status(401).json({ success: false, message: 'Firma de seguridad incorrecta.' });
        }

        // 🛡️ EXTRACCIÓN DINÁMICA DE ROL, ROLE Y UID (Saneamiento Anti-Degradación)
        const rolExtraido = (usuario.role || usuario.rol || (esConductor ? 'conductor' : 'pasajero')).toLowerCase();
        const uidSeguro = usuario.uid || usuario._id.toString();
        
        // 🛡️ Resolución Estricta de Nivel de Acceso
        const nivelAcceso = usuario.access_level !== undefined ? usuario.access_level : (MAPEO_ACCESOS_BACKEND[rolExtraido] || 0);

        const payload = {
            id: usuario._id,
            uid: uidSeguro,
            role: rolExtraido,
            access_level: nivelAcceso
        };

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

        // 🛡️ 200 OK
        return res.status(200).json({
            success: true,
            message: 'Autenticación exitosa en el Nodo Central.',
            token,
            user: userData
        });

    } catch (error) {
        console.error("❌ [CIMCO-CORE] Falla sistémica en el Gateway de Login:", error);
        // 🛡️ 500 INTERNAL SERVER ERROR
        return res.status(500).json({ success: false, message: 'Falla interna en el nodo de autenticación.' });
    }
};

/**
 * 🛰️ CONTROLADOR: REGISTRO DE USUARIOS MULTI-ROL (Encriptación Blindada Local)
 * Mantenido intacto para preservar carga de Multer e inyecciones de base de datos
 */
export const registrarUsuario = async (req, res) => {
    try {
        // 🛡️ Guarda Anti-Undefined total sobre el payload
        const { 
            nombre, email, telefono, password, 
            rol, role, 
            placa, empresa, numero_interno, numeroInterno 
        } = req.body;

        // 🛡️ 400 BAD REQUEST: Validación Estructural
        if (!nombre || !email || !telefono || !password) {
            return res.status(400).json({ success: false, message: 'Datos críticos incompletos.' });
        }

        // 🛡️ HOMOLOGACIÓN DE IDENTIDAD
        const rolAsignado = (role || rol || 'pasajero').toLowerCase().trim();
        const esOperativo = ROLES_OPERATIVOS.includes(rolAsignado);

        // 🔐 FIREWALL ACL
        const nivelSeguridadForzado = MAPEO_ACCESOS_BACKEND[rolAsignado] || 0;

        const ModelToUse = esOperativo ? Conductor : Pasajero;
        const existente = await ModelToUse.findOne({ $or: [{ email: email.toLowerCase() }, { telefono }] });

        // 🛡️ 409 CONFLICT: Evita indexación duplicada en base de datos
        if (existente) {
            return res.status(409).json({ success: false, message: 'La unidad ya está indexada en la red.' });
        }

        // 📸 PROCESAMIENTO BINARIO (Multer Injection)
        let metadataFoto = null;
        if (req.file) {
            console.log(`📸 [CIMCO-BINARIO] Procesando archivo de perfil: ${req.file.originalname} | Size: ${req.file.size} bytes`);
            metadataFoto = 'BINARIO_EN_MEMORIA_PENDIENTE_DE_NUBE'; 
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Construcción del documento con parámetros unificados
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
                // 🔥 SOBREESCRITURA DE BLINDAJE: Forzamos el rol para evitar la degradación automática del esquema Mongoose
                role: rolAsignado,
                rol: rolAsignado,
                access_level: nivelSeguridadForzado,
                vehiculo: { placa: placa ? placa.toUpperCase().trim() : 'N/A' },
                empresa: empresa ? empresa.trim() : 'INDEPENDIENTE',
                // ⚡ CAPTURA SNAKE_CASE: Prioridad absoluta al nuevo estándar, con fallback legacy
                numeroInterno: numero_interno?.trim() || numeroInterno?.trim() || 'S/N'
            });
        } else {
            // El pasajero recibe la inyección de la metadata binaria de su foto si la adjuntó
            nuevoUsuario = new Pasajero({
                ...payloadBase,
                ...(metadataFoto && { fotoPerfilUrl: metadataFoto }) 
            });
        }

        await nuevoUsuario.save();
        
        console.log(`✅ [CIMCO-AUTH] Nuevo registro: ${nombre} | ROL: ${rolAsignado.toUpperCase()} | LVL: ${nivelSeguridadForzado}`);
        
        // 🛡️ 201 CREATED
        res.status(201).json({ success: true, message: 'Usuario indexado correctamente bajo protocolos seguros.' });
    } catch (error) {
        console.error("❌ [CIMCO-CORE] Error en registro de unidad:", error);
        // 🛡️ 500 INTERNAL SERVER ERROR
        res.status(500).json({ success: false, message: 'Error de persistencia en la base de datos.' });
    }
};

/**
 * 🛰️ CONTROLADOR: VERIFICACIÓN TELEFÓNICA (Módulo Phone-First)
 */
export const verificarTelefono = async (req, res) => {
    try {
        const { telefono } = req.body;
        // 🛡️ 400 BAD REQUEST
        if (!telefono) return res.status(400).json({ success: false, message: 'Teléfono requerido.' });
        
        const conductor = await Conductor.findOne({ telefono });
        const pasajero = await Pasajero.findOne({ telefono });
        
        // 🛡️ 200 OK: Resoluciones lógicas
        if (conductor || pasajero) {
            return res.status(200).json({ success: true, existe: true });
        }
        return res.status(200).json({ success: true, existe: false });
    } catch (error) {
        // 🛡️ 500 INTERNAL SERVER ERROR
        res.status(500).json({ success: false, message: 'Error de red en el nodo de verificación.' });
    }
};

/**
 * 🛰️ CONTROLADOR: RECUPERACIÓN OTP
 * Simetría Activa: Recibe { inputUser } desde ForgotPassword.jsx
 */
export const solicitarRecuperacion = async (req, res) => {
    try {
        const { inputUser } = req.body;
        
        // 🛡️ 400 BAD REQUEST
        if (!inputUser) {
            return res.status(400).json({ success: false, message: 'El identificador es obligatorio para solicitar OTP.' });
        }

        let usuario = await Conductor.findOne({ $or: [{ email: inputUser }, { telefono: inputUser }] });
        if (!usuario) {
            usuario = await Pasajero.findOne({ $or: [{ email: inputUser }, { telefono: inputUser }] });
        }

        // 🛡️ 404 NOT FOUND
        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Unidad no localizada en los registros de CIMCO.' });
        }

        const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();
        
        otpStore.set(inputUser, {
            codigo: codigoOTP,
            expira: Date.now() + 15 * 60 * 1000 
        });

        console.log(`🔑 [CIMCO-SECURITY] Código OTP generado para ${inputUser}: ${codigoOTP}`);

        // 🛡️ 200 OK
        return res.status(200).json({ 
            success: true, 
            message: 'Código de seguridad emitido. Revise su terminal móvil/email.',
            dev_otp: codigoOTP 
        });
        
    } catch (error) {
        console.error("❌ [CIMCO-CORE] Error al solicitar recuperación OTP:", error);
        // 🛡️ 500 INTERNAL SERVER ERROR
        return res.status(500).json({ success: false, message: 'Servicio de bóveda no disponible.' });
    }
};

/**
 * 🛰️ CONTROLADOR: RESTABLECER CLAVE CON OTP
 * Simetría Activa: Recibe { inputUser, codigo, nuevaPassword } desde ForgotPassword.jsx
 */
export const restablecerClave = async (req, res) => {
    try {
        const { inputUser, codigo, nuevaPassword } = req.body;

        // 🛡️ 400 BAD REQUEST
        if (!inputUser || !codigo || !nuevaPassword) {
            return res.status(400).json({ success: false, message: 'Payload incompleto para restablecimiento.' });
        }

        const registroOTP = otpStore.get(inputUser);

        // 🛡️ 401 UNAUTHORIZED
        if (!registroOTP || registroOTP.codigo !== codigo) {
            return res.status(401).json({ success: false, message: 'El código OTP es inválido o no coincide.' });
        }

        // 🛡️ 401 UNAUTHORIZED
        if (Date.now() > registroOTP.expira) {
            otpStore.delete(inputUser);
            return res.status(401).json({ success: false, message: 'El código OTP ha expirado por tiempo límite de seguridad.' });
        }

        const salt = await bcrypt.genSalt(10);
        const newHashedPassword = await bcrypt.hash(nuevaPassword, salt);

        let modificado = await Conductor.findOneAndUpdate(
            { $or: [{ email: inputUser }, { telefono: inputUser }] },
            { password: newHashedPassword }
        );

        if (!modificado) {
            modificado = await Pasajero.findOneAndUpdate(
                { $or: [{ email: inputUser }, { telefono: inputUser }] },
                { password: newHashedPassword }
            );
        }

        otpStore.delete(inputUser);

        console.log(`🔒 [CIMCO-SECURITY] Credenciales actualizadas con éxito mediante OTP para: ${inputUser}`);

        // 🛡️ 200 OK
        return res.status(200).json({
            success: true,
            message: 'Contraseña actualizada correctamente en la base de datos central de TAXIA CIMCO.'
        });

    } catch (error) {
        console.error("❌ [CIMCO-CORE] Error en restablecimiento de clave:", error);
        // 🛡️ 500 INTERNAL SERVER ERROR
        return res.status(500).json({ success: false, message: 'Error interno en la actualización de credenciales.' });
    }
};