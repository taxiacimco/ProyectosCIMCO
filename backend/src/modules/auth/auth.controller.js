// Versión Arquitectura: V21.23 - Integración Atómica Onboarding con Captura Extendida de Archivos (Req.Files) y Atributos por Rol
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\auth\auth.controller.js
 * Misión: Controlador de autenticación con ruteo polimórfico concurrente hacia 3 colecciones (usuarios, conductores, pasajeros),
 * extracción e integración de subdocumentos/archivos (req.files), atributos extendidos (terminal_sede, access_level)
 * e implementación del flujo diferido de activación (Conductores nacen PENDIENTES/Inactivos; Pasajeros nacen APROBADOS/Activos).
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
 * 📦 REGISTRO DE USUARIOS MULTIPROPÓSITO (POLIMÓRFICO CON CAPTURA MULTIPART/FILES Y FLUJO DIFERIDO DE APROBACIÓN)
 */
export const register = async (req, res) => {
    try {
        const body = req.body || {};
        const { 
            email, 
            password, 
            nombre, 
            fullName, 
            nombreCompleto, 
            telefonoMovil, 
            telefono, 
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

        // Normalización anti-undefined de datos personales
        const nombreFinal = (nombre || fullName || nombreCompleto || '').toString().trim();
        const telFinal = (telefonoMovil || telefono || '').toString().trim();
        const rolSuministrado = rol || role;

        if (!email || !password || !nombreFinal || !telFinal || !rolSuministrado) {
            return res.status(400).json({ success: false, message: "Todos los campos obligatorios deben ser suministrados." });
        }

        const emailLimpio = String(email).toLowerCase().trim();
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

        // 🛡️ VALIDACIÓN DE DUPLICADOS EN TODAS LAS COLECCIONES (CONCURRENTE)
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

        const hashedPassword = await bcrypt.hash(password, 10);

        let nuevoUsuario;
        let esPasajero = false;
        let esConductor = false;

        // 🟢 ROL: PASAJERO (Aprobación e Ingreso Inmediato)
        if (rolNormalizado === 'pasajero') {
            nuevoUsuario = new Pasajero({
                nombre: nombreFinal,
                fullName: nombreFinal,
                email: emailLimpio,
                password: hashedPassword,
                passwordHash: hashedPassword,
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
                password: hashedPassword,
                passwordHash: hashedPassword,
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
                password: hashedPassword,
                passwordHash: hashedPassword,
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

        await nuevoUsuario.save();

        // Sincronización hacia Firebase Firestore con Denormalización Saneada de Billetera y Archivos
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
                    telefono: nuevoUsuario.telefonoMovil,
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

                // Denormalización de Billetera/Wallet en Firestore para evitar fallas del frontend
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
                console.warn("⚠️ [CIMCO-AUTH-SYNC-WARN] Falló el espejo en Firebase Firestore:", firestoreError.message);
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
                rol: nuevoUsuario.rol,
                estado: nuevoUsuario.estado,
                isActive: nuevoUsuario.isActive,
                terminal_sede: nuevoUsuario.terminal_sede || nuevoUsuario.cooperativa,
                foto_perfil: nuevoUsuario.foto_perfil || null
            }
        });

    } catch (error) {
        console.error("🚨 [CIMCO-AUTH-REGISTER-FATAL] Error en el registro de usuarios:", error);
        return res.status(500).json({ success: false, message: "Error interno del servidor al procesar el registro." });
    }
};

/**
 * 🔑 INICIO DE SESIÓN POLIMÓRFICO CON TRIPLE COMPROBACIÓN SÍNCRONA
 */
export const login = async (req, res) => {
    try {
        const { identifier, password } = req.body || {};

        if (!identifier || !password) {
            return res.status(400).json({ success: false, message: "Debe proveer un identificador (correo o teléfono) y su contraseña." });
        }

        const inputLimpio = String(identifier).trim();
        const esCorreo = inputLimpio.includes('@');

        let consulta = {};
        if (esCorreo) {
            consulta.email = inputLimpio.toLowerCase();
        } else {
            // Consulta polimórfica para soportar tanto 'telefonoMovil' como 'telefono'
            consulta = {
                $or: [
                    { telefonoMovil: inputLimpio },
                    { telefono: inputLimpio }
                ]
            };
        }

        // Ejecución Concurrente del Triple Handshake de Búsqueda
        const [usuarioAdmin, usuarioConductor, usuarioPasajero] = await Promise.all([
            Usuario.findOne(consulta),
            Conductor.findOne(consulta),
            Pasajero.findOne(consulta)
        ]);

        const cuentaEncontrada = usuarioAdmin || usuarioConductor || usuarioPasajero;

        if (!cuentaEncontrada) {
            return res.status(401).json({ success: false, message: "Credenciales de acceso incorrectas o inexistentes." });
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
            return res.status(403).json({ success: false, message: "Esta cuenta se encuentra inactiva o suspendida. Contacte soporte administrativo." });
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

        // Validación atómica de la clave mediante Bcrypt
        const passwordValido = await bcrypt.compare(password, hashAlmacenada);
        if (!passwordValido) {
            return res.status(401).json({ success: false, message: "Credenciales de acceso incorrectas o inexistentes." });
        }

        // Generación del Token JWT Operativo de TAXIA CIMCO
        const token = jwt.sign(
            { 
                id: cuentaEncontrada._id,
                _id: cuentaEncontrada._id,
                rol: cuentaEncontrada.rol || cuentaEncontrada.role || 'pasajero'
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.status(200).json({
            success: true,
            message: "Acreditación exitosa.",
            token,
            user: {
                id: cuentaEncontrada._id,
                nombre: cuentaEncontrada.nombre,
                email: cuentaEncontrada.email,
                rol: cuentaEncontrada.rol || cuentaEncontrada.role || 'pasajero',
                estado: cuentaEncontrada.estado,
                telefonoMovil: cuentaEncontrada.telefonoMovil || cuentaEncontrada.telefono || "",
                cooperativa: cuentaEncontrada.cooperativa || cuentaEncontrada.empresa || "",
                terminal_sede: cuentaEncontrada.terminal_sede || cuentaEncontrada.cooperativa || "",
                access_level: cuentaEncontrada.access_level || 1,
                foto_perfil: cuentaEncontrada.foto_perfil || null
            }
        });

    } catch (error) {
        console.error("🚨 [CIMCO-AUTH-LOGIN-FATAL] Error en el proceso de autenticación:", error);
        return res.status(500).json({ success: false, message: "Error interno del servidor durante el inicio de sesión." });
    }
};

/**
 * 📡 SOLICITUD DE OTP PARA RESTABLECIMIENTO DE ACCESO
 */
export const solicitarOTP = async (req, res) => {
    try {
        const { identifier } = req.body || {};
        if (!identifier) {
            return res.status(400).json({ success: false, message: "El identificador (correo o teléfono móvil) es requerido." });
        }

        const inputLimpio = String(identifier).trim();
        const esCorreo = inputLimpio.includes('@');

        let consulta = {};
        if (esCorreo) {
            consulta.email = inputLimpio.toLowerCase();
        } else {
            consulta = {
                $or: [
                    { telefonoMovil: inputLimpio },
                    { telefono: inputLimpio }
                ]
            };
        }

        // Búsqueda en los tres dominios de datos
        const [u, c, p] = await Promise.all([
            Usuario.findOne(consulta),
            Conductor.findOne(consulta),
            Pasajero.findOne(consulta)
        ]);

        const usuarioExistente = u || c || p;

        if (!usuarioExistente) {
            return res.status(404).json({ success: false, message: "No se localizó ninguna cuenta asociada a dicho identificador." });
        }

        const telefonoContacto = usuarioExistente.telefonoMovil || usuarioExistente.telefono;

        // Generación de código numérico de 6 dígitos
        const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Registrar OTP en la bóveda volátil con tiempo de expiración (5 minutos)
        otpStore.set(telefonoContacto, {
            codigo: codigoOTP,
            expira: Date.now() + 5 * 60 * 1000,
            usuarioId: usuarioExistente._id
        });

        console.log(`🔑 [CIMCO-OTP-GATEWAY] Código generado para ${telefonoContacto}: [ ${codigoOTP} ] (Válido por 5 minutos)`);

        return res.status(200).json({ 
            success: true, 
            message: "Código de verificación generado con éxito.",
            debugOtp: process.env.NODE_ENV !== 'production' ? codigoOTP : undefined
        });

    } catch (error) {
        console.error("🚨 [CIMCO-AUTH-OTP-FATAL] Fallo en la pasarela de recuperación OTP:", error);
        return res.status(500).json({ success: false, message: "Error interno al gestionar la recuperación de acceso." });
    }
};

/**
 * 🛠️ VERIFICACIÓN DE OTP Y REESCRITURA DE CREDENCIALES
 */
export const verificarOTPyRestablecer = async (req, res) => {
    try {
        const { identifier, codigo, nuevaPassword } = req.body || {};

        if (!identifier || !codigo || !nuevaPassword) {
            return res.status(400).json({ success: false, message: "Faltan parámetros requeridos para completar la reescritura." });
        }

        const inputLimpio = String(identifier).trim();
        const esCorreo = inputLimpio.includes('@');

        let consulta = {};
        if (esCorreo) {
            consulta.email = inputLimpio.toLowerCase();
        } else {
            consulta = {
                $or: [
                    { telefonoMovil: inputLimpio },
                    { telefono: inputLimpio }
                ]
            };
        }

        // Localizar el usuario en primer lugar
        const [u, c, p] = await Promise.all([
            Usuario.findOne(consulta),
            Conductor.findOne(consulta),
            Pasajero.findOne(consulta)
        ]);

        const usuario = u || c || p;

        if (!usuario) {
            return res.status(404).json({ success: false, message: "Identificador de cuenta inválido." });
        }

        const telefonoContacto = usuario.telefonoMovil || usuario.telefono;
        const registroOTP = otpStore.get(telefonoContacto);

        if (!registroOTP) {
            return res.status(400).json({ success: false, message: "No se ha solicitado ningún código para este número o ya expiró." });
        }

        if (Date.now() > registroOTP.expira) {
            otpStore.delete(telefonoContacto);
            return res.status(400).json({ success: false, message: "El código de verificación ha expirado. Solicite uno nuevo." });
        }

        if (registroOTP.codigo !== String(codigo).trim()) {
            return res.status(400).json({ success: false, message: "Código de verificación incorrecto." });
        }

        const newHashedPassword = await bcrypt.hash(nuevaPassword, 10);

        const condicionesUsuario = [
            { _id: usuario._id },
            { email: inputLimpio.toLowerCase() },
            { telefonoMovil: inputLimpio },
            { telefono: inputLimpio }
        ];

        const payloadUpdate = {
            password: newHashedPassword,
            passwordHash: newHashedPassword
        };

        let modificado = await Usuario.findOneAndUpdate(
            { $or: condicionesUsuario }, 
            payloadUpdate,
            { new: true }
        );
        
        if (!modificado) {
            modificado = await Conductor.findOneAndUpdate(
                { $or: condicionesUsuario }, 
                payloadUpdate,
                { new: true }
            );
        }

        if (!modificado) {
            modificado = await Pasajero.findOneAndUpdate(
                { $or: condicionesUsuario },
                payloadUpdate,
                { new: true }
            );
        }

        if (!modificado) {
            return res.status(404).json({ success: false, message: "No se encontró ninguna entidad vinculada a este identificador." });
        }

        otpStore.delete(telefonoContacto);
        console.log(`🔒 [CIMCO-SECURITY] Credenciales actualizadas vía OTP en Colección Central para: ${telefonoContacto}`);

        return res.status(200).json({ success: true, message: "Contraseña actualizada correctamente." });

    } catch (error) {
        console.error("🚨 [CIMCO-AUTH-RESET-FATAL] Error en reescritura de credenciales:", error);
        return res.status(500).json({ success: false, message: "Error interno al reescribir la contraseña." });
    }
};

/**
 * 📡 VERIFICACIÓN DE DISPONIBILIDAD TELEFÓNICA
 */
export const verificarTelefono = async (req, res) => {
    try {
        if (!req.body || (!req.body.telefono && !req.body.telefonoMovil)) {
            return res.status(400).json({ success: false, message: "Número telefónico no suministrado." });
        }
        
        const telBusqueda = String(req.body.telefono || req.body.telefonoMovil).trim();
        const consultaTel = { $or: [{ telefonoMovil: telBusqueda }, { telefono: telBusqueda }] };

        const [u, c, p] = await Promise.all([
            Usuario.findOne(consultaTel),
            Conductor.findOne(consultaTel),
            Pasajero.findOne(consultaTel)
        ]);

        if (u || c || p) {
            return res.status(200).json({ success: true, disponible: false, message: "El teléfono ya se encuentra en uso." });
        }

        return res.status(200).json({ success: true, disponible: true, message: "Teléfono apto para vinculación." });
    } catch (error) {
        console.error("🚨 [CIMCO-VALIDATION-FATAL] Error en escaneo de red:", error);
        return res.status(500).json({ success: false, message: "Error de validación interna." });
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
        const nombreLimpio = nombre ? String(nombre).trim() : undefined;
        const telefonoLimpio = telefonoMovil ? String(telefonoMovil).trim() : undefined;
        const terminalAsignada = terminal_sede || cooperativa || empresa || undefined;

        let modeloTarget;
        let esPasajero = false;
        let esConductor = false;

        const rolNormalizado = rolExtraido ? String(rolExtraido).toLowerCase().trim() : '';

        // Mapeo preciso de selección de modelo
        if (rolNormalizado === 'pasajero') {
            modeloTarget = Pasajero;
            esPasajero = true;
        } else if (ROLES_CONDUCTORES.includes(rolNormalizado)) {
            modeloTarget = Conductor;
            esConductor = true;
        } else {
            // Usuarios del sistema: Despachadores, Admins, CEOs y roles generales
            modeloTarget = Usuario;
        }

        const updateData = {};
        if (nombreLimpio) {
            updateData.nombre = nombreLimpio;
            updateData.fullName = nombreLimpio;
        }
        if (telefonoLimpio) {
            updateData.telefonoMovil = telefonoLimpio;
            updateData.telefono = telefonoLimpio;
        }
        
        if (terminalAsignada) {
            updateData.cooperativa = terminalAsignada;
            updateData.empresa = terminalAsignada;
            updateData.terminal_sede = terminalAsignada;
        }

        // Extracción de fotos o documentos si vienen en updateProfile vía multipart
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

        let usuarioActualizado = await modeloTarget.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true }
        );

        // Fallback Seguro Polimórfico en caso de que el rol suministrado difiera de la colección real
        if (!usuarioActualizado) {
            const [uFallback, cFallback, pFallback] = await Promise.all([
                Usuario.findById(userId),
                Conductor.findById(userId),
                Pasajero.findById(userId)
            ]);
            
            if (uFallback) { 
                usuarioActualizado = await Usuario.findByIdAndUpdate(userId, { $set: updateData }, { new: true }); 
                esPasajero = false; esConductor = false; 
            } else if (cFallback) { 
                usuarioActualizado = await Conductor.findByIdAndUpdate(userId, { $set: updateData }, { new: true }); 
                esPasajero = false; esConductor = true; 
            } else if (pFallback) { 
                usuarioActualizado = await Pasajero.findByIdAndUpdate(userId, { $set: updateData }, { new: true }); 
                esPasajero = true; esConductor = false; 
            }
        }

        if (!usuarioActualizado) {
            return res.status(404).json({ success: false, message: "El usuario no fue localizado en el núcleo de base de datos." });
        }

        // Reflejo en Firebase Firestore
        if (dbFirestore) {
            try {
                const coleccionTarget = esPasajero 
                    ? (FIRESTORE_PATHS?.users || 'usuarios') 
                    : (esConductor ? (FIRESTORE_PATHS?.conductores || 'conductores') : (FIRESTORE_PATHS?.users || 'usuarios'));

                const firestoreUpdate = {};
                if (nombreLimpio) {
                    firestoreUpdate.nombre = nombreLimpio;
                    firestoreUpdate.fullName = nombreLimpio;
                }
                if (telefonoLimpio) {
                    firestoreUpdate.telefono = telefonoLimpio;
                    firestoreUpdate.telefonoMovil = telefonoLimpio;
                }
                
                if (terminalAsignada) {
                    firestoreUpdate.cooperativa = terminalAsignada;
                    firestoreUpdate.empresa = terminalAsignada;
                    firestoreUpdate.terminal_sede = terminalAsignada;
                }

                if (updateData.foto_perfil) {
                    firestoreUpdate.foto_perfil = updateData.foto_perfil;
                }

                await dbFirestore.collection(coleccionTarget).doc(String(userId)).set(firestoreUpdate, { merge: true });

                if (nombreLimpio) {
                    const pathBilleteras = FIRESTORE_PATHS?.wallets || 'billeteras';
                    await dbFirestore.collection(pathBilleteras).doc(String(userId)).set({
                        nombreUsuario: nombreLimpio,
                        ultimaActualizacion: new Date().toISOString()
                    }, { merge: true });
                }

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
        return res.status(500).json({ success: false, message: "Error interno al procesar los ajustes de perfil." });
    }
};

export default {
    register,
    login,
    solicitarOTP,
    verificarOTPyRestablecer,
    verificarTelefono,
    updateProfile
};