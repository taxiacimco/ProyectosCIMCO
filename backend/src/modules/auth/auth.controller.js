// Versión Arquitectura: V21.29 - Extracción Polimórfica Defensiva de Parámetros de Login
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\auth\auth.controller.js
 * Misión: Controlador de autenticación con ruteo polimórfico concurrente hacia 3 colecciones (usuarios, conductores, pasajeros),
 * consulta de login dual ($or) con normalización telefónica anti-prefijo 57, eliminación de doble hashing en registro (delegado a pre-save),
 * flujo completo de recuperación vía OTP (solicitarOTP/forgotPassword y verificarOTPyRestablecer/resetPassword) y validaciones perimetrales.
 * Ajuste V21.29: Ampliación de la extracción polimórfica en req.body para capturar cualquier alias de entrada (loginInput, identifier, email, phone, telefono, celular) y prevenir falsos positivos de MISSING_FIELDS.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import Conductor from '../../models/Conductor.js';
import Usuario from '../../models/Usuario.js';
import Pasajero from '../../models/Pasajero.js';
import { dbFirestore, FIRESTORE_PATHS } from '../../config/firebase.js';

// 🔒 BLINDAJE DE FIRMA: Si la variable de entorno no está definida, el servidor aborta
if (!process.env.JWT_SECRET) {
    console.error("🚨 [CIMCO-FATAL] CONTROL DE SEGURIDAD CRÍTICO: 'JWT_SECRET' no está definido en las variables de entorno (.env).");
    process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// 🛡️ BÓVEDA OTP EN MEMORIA CON LIMPIEZA AUTOMÁTICA
const otpStore = new Map();

// Mapeo preciso de categorización de roles
const ROLES_CONDUCTORES = ['conductor', 'mototaxi', 'motoparrillero', 'motocarga', 'intermunicipal', 'conductor_intermunicipal'];
const ROLES_ADMINISTRATIVOS = ['despachador', 'admin', 'secretaria', 'staff', 'ceo'];
const ROLES_OPERATIVOS = [...ROLES_CONDUCTORES, ...ROLES_ADMINISTRATIVOS];

// Mantenimiento preventivo: Eliminación de OTPs expirados cada 10 minutos para evitar fugas de memoria
setInterval(() => {
    const ahora = Date.now();
    for (const [clave, datos] of otpStore.entries()) {
        if (ahora > datos.expira) {
            otpStore.delete(clave);
        }
    }
}, 10 * 60 * 1000);

/**
 * 📦 REGISTRO DE USUARIOS MULTIPROPÓSITO
 * Lógica anti-doble hashing: Se delega el cifrado al middleware pre('save') del modelo Mongoose.
 */
export const register = async (req, res) => {
    try {
        const body = req.body || {};
        const { 
            email, 
            telefono,
            telefonoMovil,
            password, 
            nombre, 
            fullName, 
            nombreCompleto, 
            rol, 
            role, 
            subrol, 
            placa, 
            numeroInterno, 
            cooperativa, 
            empresa,
            terminal_sede,
            terminalSede,
            access_level,
            accessLevel
        } = body;

        // 🛡️ VALIDACIÓN EXPLÍCITA DE CAMPOS CRÍTICOS OBLIGATORIOS (EMAIL Y TELÉFONO)
        const emailLimpioInput = email ? String(email).trim() : '';
        const telInput = (telefono || telefonoMovil || '').toString().trim();

        if (!emailLimpioInput || !telInput) {
            return res.status(400).json({ 
                success: false, 
                error: 'Correo y teléfono son campos obligatorios.',
                message: 'Correo y teléfono son campos obligatorios.' 
            });
        }

        // Normalización anti-undefined de datos personales y credenciales
        const nombreFinal = (nombre || fullName || nombreCompleto || '').toString().trim();
        const telFinal = telInput;
        const rolSuministrado = rol || role;

        if (!password || !nombreFinal || !rolSuministrado) {
            return res.status(400).json({ success: false, message: "Todos los campos obligatorios deben ser suministrados." });
        }

        const emailLimpio = emailLimpioInput.toLowerCase();
        const rolNormalizado = String(rolSuministrado).toLowerCase().trim();
        const subrolFinal = subrol ? String(subrol).toLowerCase().trim() : (rolNormalizado === 'conductor' ? 'mototaxi' : rolNormalizado);
        
        // Asignación extendida de sede / terminal
        const terminalSedeFinal = (terminal_sede || terminalSede || cooperativa || empresa || (ROLES_OPERATIVOS.includes(rolNormalizado) ? 'Particular' : 'TAXIA')).toString().trim();

        // Nivel de acceso sugerido/proporcionado
        const parsedAccessLevel = access_level !== undefined ? Number(access_level) : (accessLevel !== undefined ? Number(accessLevel) : undefined);

        // 📁 EXTRACCIÓN Y EXTRACTION SHIELDING DE ARCHIVOS MULTIPART/FORM-DATA (MULTER & REQ.FILES)
        const getFilePath = (fieldName) => {
            if (!req.files) return body[fieldName] || null;
            
            let fileObj = null;
            if (Array.isArray(req.files)) {
                fileObj = req.files.find(f => f.fieldname === fieldName);
            } else if (typeof req.files === 'object' && req.files[fieldName]) {
                fileObj = req.files[fieldName][0];
            }

            if (!fileObj) return body[fieldName] || null;
            return fileObj.path || fileObj.location || fileObj.filename || fileObj.url || body[fieldName] || null;
        };

        const foto_perfil = getFilePath('foto_perfil');
        const documento_cedula = getFilePath('documento_cedula');
        const documento_licencia = getFilePath('documento_licencia');
        const doc_tarjeta = getFilePath('doc_tarjeta');
        const doc_identificacion = getFilePath('doc_identificacion');

        // 🛡️ VALIDACIÓN PREVIA DE DUPLICADOS EN TODAS LAS COLECCIONES (CONCURRENTE)
        const [uExist, cExist, pExist] = await Promise.all([
            Usuario.findOne({ email: emailLimpio }),
            Conductor.findOne({ email: emailLimpio }),
            Pasajero.findOne({ email: emailLimpio })
        ]);

        if (uExist || cExist || pExist) {
            return res.status(400).json({ success: false, message: "El correo electrónico ya se encuentra registrado en el sistema." });
        }

        // Validación de Teléfono Duplicado
        const [uTel, cTel, pTel] = await Promise.all([
            Usuario.findOne({ $or: [{ telefonoMovil: telFinal }, { telefono: telFinal }] }),
            Conductor.findOne({ $or: [{ telefonoMovil: telFinal }, { telefono: telFinal }] }),
            Pasajero.findOne({ $or: [{ telefonoMovil: telFinal }, { telefono: telFinal }] })
        ]);

        if (uTel || cTel || pTel) {
            return res.status(400).json({ success: false, message: "El número telefónico ya está vinculado a otra cuenta." });
        }

        // 🛡️ SIN DOBLE HASHING: Se pasa la contraseña plana para que el Hook pre('save') la encripte
        const plainPassword = String(password);

        let nuevoUsuario;
        let esPasajero = false;
        let esConductor = false;

        // 🟢 ROL: PASAJERO (Aprobación e Ingreso Inmediato)
        if (rolNormalizado === 'pasajero') {
            nuevoUsuario = new Pasajero({
                nombre: nombreFinal,
                fullName: nombreFinal,
                email: emailLimpio,
                password: plainPassword,
                telefonoMovil: telFinal,
                telefono: telFinal,
                rol: 'pasajero',
                role: 'pasajero',
                isActive: true,
                estado: 'APROBADO',
                cooperativa: terminalSedeFinal,
                empresa: terminalSedeFinal,
                terminal_sede: terminalSedeFinal,
                saldo: 0,
                foto_perfil,
                doc_identificacion,
                documento_cedula: documento_cedula || doc_identificacion,
                access_level: parsedAccessLevel ?? 1
            });
            esPasajero = true;
        } 
        // 🔴 ROL: CONDUCTOR (Requiere Aprobación Manual por Admin/Secretaría)
        else if (ROLES_CONDUCTORES.includes(rolNormalizado)) {
            if (!placa || !numeroInterno) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Para el registro de un conductor se requiere la placa y el número interno del vehículo." 
                });
            }

            nuevoUsuario = new Conductor({
                nombre: nombreFinal,
                fullName: nombreFinal,
                email: emailLimpio,
                password: plainPassword,
                telefonoMovil: telFinal,
                telefono: telFinal,
                rol: rolNormalizado,
                role: rolNormalizado,
                subrol: subrolFinal,
                placa: String(placa).toUpperCase().trim(),
                numeroInterno: String(numeroInterno).trim(),
                cooperativa: terminalSedeFinal,
                empresa: terminalSedeFinal,
                terminal_sede: terminalSedeFinal,
                flota_id: 'GENERAL',
                
                // Atributos y Archivos Adjuntos
                foto_perfil,
                documento_cedula,
                documento_licencia,
                doc_tarjeta,
                doc_identificacion,
                access_level: parsedAccessLevel ?? 10,

                // 🔴 RETENCIÓN ADMINISTRATIVA: Nace PENDIENTE e INACTIVO hasta verificación manual
                estadoAdministrativo: 'PENDIENTE',
                estado: 'PENDIENTE',
                estadoOperativo: 'NO_DISPONIBLE',
                isActive: false,
                isOnline: false,
                saldo: 0
            });
            esConductor = true;
        } 
        // 🏢 OTROS ROLES DEL SISTEMA (Admins, Secretarías, Despachadores, Staff)
        else {
            const nivelPredeterminado = (rolNormalizado === 'admin' || rolNormalizado === 'ceo') ? 99 : (rolNormalizado === 'staff' ? 50 : (rolNormalizado === 'despachador' ? 30 : 10));

            nuevoUsuario = new Usuario({
                nombre: nombreFinal,
                fullName: nombreFinal,
                email: emailLimpio,
                password: plainPassword,
                telefonoMovil: telFinal,
                telefono: telFinal,
                rol: rolNormalizado,
                role: rolNormalizado,
                cooperativa: terminalSedeFinal,
                empresa: terminalSedeFinal,
                terminal_sede: terminalSedeFinal,
                isActive: true,
                estado: 'APROBADO',
                saldo: 0,
                balance: 0,
                foto_perfil,
                doc_identificacion,
                documento_cedula: documento_cedula || doc_identificacion,
                access_level: parsedAccessLevel ?? nivelPredeterminado
            });
        }

        // Persistencia primaria en MongoDB Atlas
        await nuevoUsuario.save();

        // 🛡️ SINCRONIZACIÓN HACIA FIREBASE FIRESTORE AISLADA EN TRY/CATCH SECUNDARIO (SIN ABORTAR MONGO)
        if (dbFirestore) {
            try {
                const coleccionFirestore = esPasajero 
                    ? (FIRESTORE_PATHS?.users || 'usuarios') 
                    : (esConductor ? (FIRESTORE_PATHS?.conductores || 'conductores') : (FIRESTORE_PATHS?.users || 'usuarios'));

                const payloadFirestore = {
                    uid: String(nuevoUsuario._id),
                    email: nuevoUsuario.email,
                    nombre: nuevoUsuario.nombre,
                    fullName: nuevoUsuario.nombre,
                    telefono: nuevoUsuario.telefonoMovil || nuevoUsuario.telefono,
                    rol: nuevoUsuario.rol,
                    subrol: nuevoUsuario.subrol || subrolFinal || null,
                    estado: nuevoUsuario.estado,
                    isActive: nuevoUsuario.isActive,
                    cooperativa: nuevoUsuario.cooperativa || 'Particular',
                    empresa: nuevoUsuario.empresa || 'Particular',
                    terminal_sede: nuevoUsuario.terminal_sede || 'Particular',
                    access_level: nuevoUsuario.access_level || 1,
                    foto_perfil: foto_perfil || null,
                    createdAt: new Date().toISOString()
                };

                if (esConductor) {
                    payloadFirestore.isOnline = false;
                    payloadFirestore.placa = nuevoUsuario.placa;
                    payloadFirestore.numeroInterno = nuevoUsuario.numeroInterno;
                    payloadFirestore.estadoAdministrativo = nuevoUsuario.estadoAdministrativo;
                    payloadFirestore.documento_cedula = documento_cedula || null;
                    payloadFirestore.documento_licencia = documento_licencia || null;
                    payloadFirestore.doc_tarjeta = doc_tarjeta || null;
                    payloadFirestore.doc_identificacion = doc_identificacion || null;
                }

                await dbFirestore.collection(coleccionFirestore).doc(String(nuevoUsuario._id)).set(payloadFirestore);

                // Denormalización de Billetera/Wallet en Firestore
                const pathBilleteras = FIRESTORE_PATHS?.wallets || 'billeteras';
                await dbFirestore.collection(pathBilleteras).doc(String(nuevoUsuario._id)).set({
                    id: String(nuevoUsuario._id),
                    nombreUsuario: nuevoUsuario.nombre,
                    rolUsuario: nuevoUsuario.rol,
                    balance: 0,
                    saldo: 0,
                    ultimaActualizacion: new Date().toISOString()
                });

            } catch (firestoreError) {
                console.warn("⚠️ [CIMCO-AUTH-SYNC-WARN] Falló el espejo en Firebase Firestore (Persistencia MongoDB exitosa):", firestoreError.message);
            }
        }

        // Respuesta diferenciada según la categoría del onboarding
        if (esConductor) {
            return res.status(201).json({
                success: true,
                message: "Registro recibido. Su cuenta está en revisión por la administración.",
                data: {
                    id: nuevoUsuario._id,
                    nombre: nuevoUsuario.nombre,
                    email: nuevoUsuario.email,
                    telefono: nuevoUsuario.telefonoMovil || nuevoUsuario.telefono,
                    rol: nuevoUsuario.rol,
                    estado: nuevoUsuario.estado,
                    isActive: nuevoUsuario.isActive,
                    terminal_sede: nuevoUsuario.terminal_sede || nuevoUsuario.cooperativa,
                    foto_perfil: nuevoUsuario.foto_perfil || null
                }
            });
        }

        return res.status(201).json({
            success: true,
            message: "Registro e ingreso completado con éxito.",
            data: {
                id: nuevoUsuario._id,
                nombre: nuevoUsuario.nombre,
                email: nuevoUsuario.email,
                telefono: nuevoUsuario.telefonoMovil || nuevoUsuario.telefono,
                rol: nuevoUsuario.rol,
                estado: nuevoUsuario.estado,
                isActive: nuevoUsuario.isActive,
                terminal_sede: nuevoUsuario.terminal_sede || nuevoUsuario.cooperativa,
                foto_perfil: nuevoUsuario.foto_perfil || null
            }
        });

    } catch (error) {
        console.error("🚨 [CIMCO-AUTH-REGISTER-FATAL] Error en el registro de usuarios:", error);

        // 🛑 INTERCEPCIÓN DE CLAVE DUPLICADA EN MONGO (code 11000)
        if (error.code === 11000 || error.code === '11000') {
            const campoDuplicado = Object.keys(error.keyPattern || error.keyValue || {})[0];
            const mensajeDuplicado = campoDuplicado 
                ? `El campo '${campoDuplicado}' ya se encuentra registrado en el sistema.` 
                : "El correo, teléfono o datos de identificación ya están vinculados a otra cuenta.";
            return res.status(400).json({ 
                success: false, 
                message: mensajeDuplicado,
                error: "DATO_DUPLICADO"
            });
        }

        return res.status(500).json({ success: false, message: "Error interno del servidor al procesar el registro." });
    }
};

/**
 * 🔑 INICIO DE SESIÓN DUAL (CORREO O CELULAR) CON TRIPLE COMPROBACIÓN Y SELECT('+PASSWORD')
 */
export const login = async (req, res) => {
    try {
        const body = req.body || {};
        const loginInput = body.loginInput || body.identifier || body.email || body.phone || body.telefono || body.celular;
        const password = body.password;

        if (!loginInput || !password) {
            return res.status(400).json({ 
                success: false, 
                code: 'MISSING_FIELDS',
                message: "Por favor ingresa tu celular/correo y contraseña." 
            });
        }

        const cleanInput = String(loginInput).trim().toLowerCase();
        const digitsOnly = cleanInput.replace(/\D/g, '');

        // Construcción de consulta dual con tolerancias de prefijo internacional (57) y números limpios
        const queryConditions = [
            { email: cleanInput },
            { telefono: cleanInput },
            { telefonoMovil: cleanInput }
        ];

        if (digitsOnly) {
            queryConditions.push({ telefono: digitsOnly });
            queryConditions.push({ telefonoMovil: digitsOnly });
            queryConditions.push({ telefono: `57${digitsOnly}` });
            queryConditions.push({ telefonoMovil: `57${digitsOnly}` });
        }

        const consulta = { $or: queryConditions };

        // Búsqueda concurrente polimórfica
        const [usuarioAdmin, usuarioConductor, usuarioPasajero] = await Promise.all([
            Usuario.findOne(consulta).select('+password +passwordHash'),
            Conductor.findOne(consulta).select('+password +passwordHash'),
            Pasajero.findOne(consulta).select('+password +passwordHash')
        ]);

        const cuentaEncontrada = usuarioAdmin || usuarioConductor || usuarioPasajero;

        // 1️⃣ VALIDACIÓN 1: El usuario NO existe en ninguna colección
        if (!cuentaEncontrada) {
            return res.status(404).json({ 
                success: false, 
                code: 'USER_NOT_FOUND',
                message: "No existe una cuenta asociada a este correo o celular." 
            });
        }

        // 🔴 BLOQUEO POR REVISIÓN PENDIENTE / SUSPENSIÓN
        const estadoEvaluado = cuentaEncontrada.estado ? String(cuentaEncontrada.estado).toUpperCase() : '';
        const estadoAdmin = cuentaEncontrada.estadoAdministrativo ? String(cuentaEncontrada.estadoAdministrativo).toUpperCase() : '';

        if (estadoEvaluado === 'PENDIENTE' || estadoAdmin === 'PENDIENTE') {
            return res.status(403).json({ 
                success: false, 
                code: 'ACCOUNT_PENDING_APPROVAL',
                message: "Su cuenta está en proceso de revisión por la Secretaría / Administración. Intente nuevamente tras la aprobación." 
            });
        }

        const estaActivo = cuentaEncontrada.isActive !== undefined ? cuentaEncontrada.isActive : (['activo', 'APROBADO', 'active'].includes(cuentaEncontrada.estado));

        if (!estaActivo) {
            return res.status(403).json({ 
                success: false, 
                message: "Esta cuenta se encuentra inactiva o suspendida. Contacte soporte administrativo." 
            });
        }

        // 🛡️ COMPUERTA DEFENSIVA ANTI-CRASH: Verificar existencia de la hash de la clave
        const hashAlmacenada = cuentaEncontrada.password || cuentaEncontrada.passwordHash;

        if (!hashAlmacenada) {
            console.warn(`⚠️ [CIMCO-AUTH-WARN] La cuenta ID ${cuentaEncontrada._id} (${cuentaEncontrada.email}) carece de contraseña encriptada.`);
            return res.status(401).json({ 
                success: false, 
                message: "El usuario no tiene una contraseña configurada o activa." 
            });
        }

        // 2️⃣ VALIDACIÓN 2: Verificación de Contraseña
        const passwordMatch = await bcrypt.compare(String(password), hashAlmacenada);

        if (!passwordMatch) {
            return res.status(401).json({ 
                success: false, 
                code: 'INVALID_PASSWORD',
                message: "La contraseña ingresada es incorrecta." 
            });
        }

        // 3️⃣ GENERACIÓN DE TOKEN JWT DE PRODUCCIÓN
        const rolFinal = cuentaEncontrada.rol || cuentaEncontrada.role || 'pasajero';

        const tokenPayload = {
            id: String(cuentaEncontrada._id),
            uid: String(cuentaEncontrada._id),
            email: cuentaEncontrada.email,
            rol: rolFinal,
            subrol: cuentaEncontrada.subrol || null,
            terminal_sede: cuentaEncontrada.terminal_sede || cuentaEncontrada.cooperativa || null
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

        return res.status(200).json({
            success: true,
            message: "Autenticación exitosa.",
            token,
            user: {
                id: cuentaEncontrada._id,
                nombre: cuentaEncontrada.nombre || cuentaEncontrada.fullName,
                email: cuentaEncontrada.email,
                telefono: cuentaEncontrada.telefonoMovil || cuentaEncontrada.telefono,
                rol: rolFinal,
                subrol: cuentaEncontrada.subrol || null,
                estado: cuentaEncontrada.estado,
                isActive: cuentaEncontrada.isActive,
                terminal_sede: cuentaEncontrada.terminal_sede || cuentaEncontrada.cooperativa,
                foto_perfil: cuentaEncontrada.foto_perfil || null
            }
        });

    } catch (error) {
        console.error("🚨 [CIMCO-AUTH-LOGIN-FATAL] Error crítico durante el inicio de sesión:", error);
        return res.status(500).json({ success: false, message: "Error interno en el servidor de autenticación." });
    }
};

/**
 * 📲 SOLICITUD DE CÓDIGO OTP (RECUPERACIÓN DE CONTRASEÑA)
 */
export const solicitarOTP = async (req, res) => {
    try {
        const body = req.body || {};
        const loginInput = body.loginInput || body.identifier || body.email || body.telefono;

        if (!loginInput) {
            return res.status(400).json({ 
                success: false, 
                message: "El identificador (correo o teléfono celular) es requerido." 
            });
        }

        const cleanInput = String(loginInput).trim().toLowerCase();
        const digitsOnly = cleanInput.replace(/\D/g, '');

        const queryConditions = [
            { email: cleanInput },
            { telefono: cleanInput },
            { telefonoMovil: cleanInput }
        ];

        if (digitsOnly) {
            queryConditions.push({ telefono: digitsOnly });
            queryConditions.push({ telefonoMovil: digitsOnly });
            queryConditions.push({ telefono: `57${digitsOnly}` });
            queryConditions.push({ telefonoMovil: `57${digitsOnly}` });
        }

        const consulta = { $or: queryConditions };

        // Búsqueda en los tres dominios de datos
        const [u, c, p] = await Promise.all([
            Usuario.findOne(consulta),
            Conductor.findOne(consulta),
            Pasajero.findOne(consulta)
        ]);

        const usuarioExistente = u || c || p;

        if (!usuarioExistente) {
            return res.status(404).json({ 
                success: false, 
                message: "No se localizó ninguna cuenta asociada a dicho identificador." 
            });
        }

        const telefonoContacto = usuarioExistente.telefono || usuarioExistente.telefonoMovil || cleanInput;

        // Generación de código numérico de 6 dígitos
        const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();

        // Registrar OTP en la bóveda volátil con tiempo de expiración (15 minutos)
        otpStore.set(telefonoContacto, {
            codigo: codigoOTP,
            expira: Date.now() + 15 * 60 * 1000,
            usuarioId: usuarioExistente._id
        });

        console.log(`🔑 [CIMCO-OTP] Código generado para ${telefonoContacto}: ${codigoOTP}`);

        return res.status(200).json({
            success: true,
            message: "Código de recuperación generado correctamente.",
            codigoDesarrollo: process.env.NODE_ENV === 'development' ? codigoOTP : undefined
        });

    } catch (error) {
        console.error("🚨 [CIMCO-OTP-SOLICITAR-FATAL] Error generando OTP:", error);
        return res.status(500).json({ success: false, message: "Error interno al procesar la solicitud de OTP." });
    }
};

export const forgotPassword = solicitarOTP;

/**
 * 🔒 VERIFICACIÓN DE OTP Y RESTABLECIMIENTO DE CONTRASEÑA
 */
export const verificarOTPyRestablecer = async (req, res) => {
    try {
        const body = req.body || {};
        const loginInput = body.loginInput || body.identifier || body.email || body.telefono;
        const codigo = body.codigo || body.otp;
        const nuevaPassword = body.nuevaPassword || body.password || body.newPassword;

        if (!loginInput || !codigo || !nuevaPassword) {
            return res.status(400).json({ 
                success: false, 
                message: "El identificador, el código OTP y la nueva contraseña son requeridos." 
            });
        }

        const cleanInput = String(loginInput).trim().toLowerCase();
        const digitsOnly = cleanInput.replace(/\D/g, '');

        const queryConditions = [
            { email: cleanInput },
            { telefono: cleanInput },
            { telefonoMovil: cleanInput }
        ];

        if (digitsOnly) {
            queryConditions.push({ telefono: digitsOnly });
            queryConditions.push({ telefonoMovil: digitsOnly });
            queryConditions.push({ telefono: `57${digitsOnly}` });
            queryConditions.push({ telefonoMovil: `57${digitsOnly}` });
        }

        const consulta = { $or: queryConditions };

        // Localizar el usuario
        const [u, c, p] = await Promise.all([
            Usuario.findOne(consulta),
            Conductor.findOne(consulta),
            Pasajero.findOne(consulta)
        ]);

        const usuario = u || c || p;

        if (!usuario) {
            return res.status(404).json({ 
                success: false, 
                message: "Identificador de cuenta inválido." 
            });
        }

        const telefonoContacto = usuario.telefono || usuario.telefonoMovil || cleanInput;
        const registroOTP = otpStore.get(telefonoContacto);

        if (!registroOTP) {
            return res.status(400).json({ 
                success: false, 
                message: "No se ha solicitado ningún código para esta cuenta o ya expiró." 
            });
        }

        if (Date.now() > registroOTP.expira) {
            otpStore.delete(telefonoContacto);
            return res.status(400).json({ 
                success: false, 
                message: "El código de verificación ha expirado. Solicite uno nuevo." 
            });
        }

        if (registroOTP.codigo !== String(codigo).trim()) {
            return res.status(400).json({ 
                success: false, 
                message: "Código de verificación o OTP incorrecto." 
            });
        }

        // Reescritura usando .save() para activar hooks pre-save de hash
        usuario.password = String(nuevaPassword);
        if (usuario.passwordHash !== undefined) {
            usuario.passwordHash = String(nuevaPassword);
        }

        await usuario.save();
        otpStore.delete(telefonoContacto);

        console.log(`🔒 [CIMCO-SECURITY] Credenciales actualizadas correctamente para: ${telefonoContacto}`);

        return res.status(200).json({
            success: true,
            message: "Contraseña restablecida exitosamente. Ya puede iniciar sesión."
        });

    } catch (error) {
        console.error("🚨 [CIMCO-RESET-PASSWORD-FATAL] Error restableciendo contraseña:", error);

        if (error.code === 11000 || error.code === '11000') {
            return res.status(400).json({ 
                success: false, 
                message: "Error de duplicidad al actualizar las credenciales.",
                error: "DATO_DUPLICADO"
            });
        }

        return res.status(500).json({ success: false, message: "Error interno al procesar el restablecimiento de contraseña." });
    }
};

export const resetPassword = verificarOTPyRestablecer;

/**
 * 📱 COMPROBACIÓN DE DISPONIBILIDAD DE TELÉFONO (CHECK-PHONE)
 */
export const checkPhone = async (req, res) => {
    try {
        const body = req.body || {};
        const telefonoInput = body.telefono || body.telefonoMovil;

        if (!telefonoInput) {
            return res.status(400).json({ 
                success: false, 
                message: 'El número de teléfono es requerido.' 
            });
        }

        const telBusqueda = String(telefonoInput).trim();
        const consultaTel = { $or: [{ telefonoMovil: telBusqueda }, { telefono: telBusqueda }] };

        const [u, c, p] = await Promise.all([
            Usuario.findOne(consultaTel),
            Conductor.findOne(consultaTel),
            Pasajero.findOne(consultaTel)
        ]);

        const usuarioExistente = u || c || p;

        if (usuarioExistente) {
            return res.json({ 
                success: true, 
                existe: true, 
                disponible: false, 
                message: 'El teléfono ya se encuentra registrado.' 
            });
        }

        return res.json({ 
            success: true, 
            existe: false, 
            disponible: true, 
            message: 'Línea disponible para registro.' 
        });

    } catch (error) {
        console.error("❌ [CIMCO-AUTH-ERROR] Error en check-phone:", error);
        return res.status(500).json({ success: false, message: 'Error interno en el servidor de autenticación.' });
    }
};

/**
 * 🔄 ACTUALIZACIÓN DE DATOS DE PERFIL (POLIMÓRFICO CONCURRENTE CORREGIDO)
 */
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id || req.user?.uid || req.body?.id || req.body?.userId;
        const rolExtraido = req.user?.rol || req.body?.rol;

        if (!userId) {
            return res.status(400).json({ success: false, message: "No se encontró un identificador de sesión válido." });
        }

        const { nombre, telefonoMovil, cooperativa, empresa, terminal_sede } = req.body || {};

        const updateData = {};
        if (nombre) {
            updateData.nombre = String(nombre).trim();
            updateData.fullName = String(nombre).trim();
        }
        if (telefonoMovil) {
            updateData.telefonoMovil = String(telefonoMovil).trim();
            updateData.telefono = String(telefonoMovil).trim();
        }

        const sedeFinal = terminal_sede || cooperativa || empresa;
        if (sedeFinal) {
            updateData.cooperativa = String(sedeFinal).trim();
            updateData.empresa = String(sedeFinal).trim();
            updateData.terminal_sede = String(sedeFinal).trim();
        }

        if (req.files) {
            const getFilePath = (fieldName) => {
                let fileObj = null;
                if (Array.isArray(req.files)) {
                    fileObj = req.files.find(f => f.fieldname === fieldName);
                } else if (typeof req.files === 'object' && req.files[fieldName]) {
                    fileObj = req.files[fieldName][0];
                }
                return fileObj ? (fileObj.path || fileObj.location || fileObj.filename || fileObj.url) : null;
            };

            const foto = getFilePath('foto_perfil');
            const cedula = getFilePath('documento_cedula');
            const licencia = getFilePath('documento_licencia');
            const tarjeta = getFilePath('doc_tarjeta');
            const docId = getFilePath('doc_identificacion');

            if (foto) updateData.foto_perfil = foto;
            if (cedula) updateData.documento_cedula = cedula;
            if (licencia) updateData.documento_licencia = licencia;
            if (tarjeta) updateData.doc_tarjeta = tarjeta;
            if (docId) updateData.doc_identificacion = docId;
        }

        // Selección del modelo según el rol
        const rolNormalizado = rolExtraido ? String(rolExtraido).toLowerCase().trim() : '';
        let modeloTarget = Usuario;

        if (rolNormalizado === 'pasajero') {
            modeloTarget = Pasajero;
        } else if (ROLES_CONDUCTORES.includes(rolNormalizado)) {
            modeloTarget = Conductor;
        }

        let usuarioActualizado = await modeloTarget.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true }
        );

        // Fallback Seguro Polimórfico en caso de que el rol suministrado no coincida con la colección real
        if (!usuarioActualizado) {
            usuarioActualizado = await Usuario.findByIdAndUpdate(userId, { $set: updateData }, { new: true }) ||
                                 await Conductor.findByIdAndUpdate(userId, { $set: updateData }, { new: true }) ||
                                 await Pasajero.findByIdAndUpdate(userId, { $set: updateData }, { new: true });
        }

        if (!usuarioActualizado) {
            return res.status(404).json({ success: false, message: "No se encontró la cuenta de usuario para actualizar." });
        }

        // Sincronización secundaria hacia Firebase Firestore (Aislada en Try/Catch)
        if (dbFirestore) {
            try {
                const esPasajero = usuarioActualizado.rol === 'pasajero' || usuarioActualizado.role === 'pasajero';
                const esConductor = ROLES_CONDUCTORES.includes(usuarioActualizado.rol) || ROLES_CONDUCTORES.includes(usuarioActualizado.role);

                const coleccionFirestore = esPasajero 
                    ? (FIRESTORE_PATHS?.users || 'usuarios') 
                    : (esConductor ? (FIRESTORE_PATHS?.conductores || 'conductores') : (FIRESTORE_PATHS?.users || 'usuarios'));

                await dbFirestore.collection(coleccionFirestore).doc(String(usuarioActualizado._id)).set({
                    nombre: usuarioActualizado.nombre,
                    fullName: usuarioActualizado.nombre,
                    telefono: usuarioActualizado.telefonoMovil || usuarioActualizado.telefono,
                    cooperativa: usuarioActualizado.cooperativa || 'Particular',
                    empresa: usuarioActualizado.empresa || 'Particular',
                    terminal_sede: usuarioActualizado.terminal_sede || 'Particular',
                    ...(usuarioActualizado.foto_perfil ? { foto_perfil: usuarioActualizado.foto_perfil } : {}),
                    updatedAt: new Date().toISOString()
                }, { merge: true });

            } catch (firestoreErr) {
                console.warn(`⚠️ [CIMCO-UPDATE-SYNC-WARN] Error de replicación en Firebase: ${firestoreErr.message}`);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Perfil de central actualizado con éxito en todos los nodos de datos.",
            user: {
                id: usuarioActualizado._id,
                nombre: usuarioActualizado.nombre,
                email: usuarioActualizado.email,
                rol: usuarioActualizado.rol || usuarioActualizado.role || rolNormalizado,
                telefonoMovil: usuarioActualizado.telefonoMovil || usuarioActualizado.telefono || "",
                cooperativa: usuarioActualizado.cooperativa || usuarioActualizado.empresa || "",
                terminal_sede: usuarioActualizado.terminal_sede || usuarioActualizado.cooperativa || "",
                foto_perfil: usuarioActualizado.foto_perfil || null
            }
        });

    } catch (error) {
        console.error("🚨 [CIMCO-PROFILE-UPDATE-FATAL] Error crítico en la pasarela de actualización:", error);

        if (error.code === 11000 || error.code === '11000') {
            return res.status(400).json({ 
                success: false, 
                message: "El correo o teléfono ingresado ya está en uso por otra cuenta.",
                error: "DATO_DUPLICADO"
            });
        }

        return res.status(500).json({ success: false, message: "Error interno al procesar los ajustes de perfil." });
    }
};

export default {
    register,
    login,
    solicitarOTP,
    forgotPassword,
    verificarOTPyRestablecer,
    resetPassword,
    checkPhone,
    updateProfile
};