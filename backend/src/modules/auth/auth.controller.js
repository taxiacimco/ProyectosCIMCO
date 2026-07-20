// Versión Arquitectura: V21.16 - Blindaje de Tipos y Guardas en Mapeo de Variables de Perfil
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\auth\auth.controller.js
 * Misión: Controlador de autenticación con ruteo polimórfico concurrente hacia 3 colecciones (usuarios, conductores, pasajeros).
 * Ajuste V21.16: Integración quirúrgica y blindaje estricto anti-undefined en los métodos de mapeo del payload dentro de updateProfile.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// 🚀 GOBERNANZA DE IMPORTACIONES: Resolución nativa de Subpath Imports e Inclusión de Pasajero
import Conductor from '#models/Conductor.js';
import Usuario from '#models/Usuario.js';
import Pasajero from '#models/Pasajero.js';
import { dbFirestore, FIRESTORE_PATHS } from '#config/firebase.js';

// 🔒 BLINDAJE DE FIRMA: Si la variable de entorno no está definida, el servidor aborta
if (!process.env.JWT_SECRET) {
    console.error("🚨 [CIMCO-FATAL] CONTROL DE SEGURIDAD CRÍTICO: 'JWT_SECRET' no está definido en las variables de entorno (.env).");
    process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// 🛡️ BÓVEDA OTP EN MEMORIA
const otpStore = new Map();
const ROLES_OPERATIVOS = ['conductor', 'despachador', 'mototaxi', 'motoparrillero', 'motocarga', 'intermunicipal'];

/**
 * 📦 REGISTRO DE USUARIOS MULTIPROPÓSITO (POLIMÓRFICO)
 */
export const register = async (req, res) => {
    try {
        const { email, password, nombre, telefonoMovil, rol, cooperativa, empresa } = req.body || {};

        if (!email || !password || !nombre || !telefonoMovil || !rol) {
            return res.status(400).json({ success: false, message: "Todos los campos obligatorios deben ser suministrados." });
        }

        const emailLimpio = String(email).toLowerCase().trim();
        const rolNormalizado = String(rol).toLowerCase().trim();
        const terminalAsignada = cooperativa || empresa || (ROLES_OPERATIVOS.includes(rolNormalizado) ? 'Particular' : 'TAXIA');

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
            Usuario.findOne({ telefonoMovil }),
            Conductor.findOne({ telefonoMovil }),
            Pasajero.findOne({ telefonoMovil })
        ]);

        if (uTel || cTel || pTel) {
            return res.status(400).json({ success: false, message: "El número telefónico ya está vinculado a otra cuenta." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let nuevoUsuario;
        let esPasajero = false;
        let esConductor = false;

        if (rolNormalizado === 'pasajero') {
            nuevoUsuario = new Pasajero({
                nombre,
                email: emailLimpio,
                password: hashedPassword,
                telefonoMovil,
                rol: 'pasajero',
                isActive: true,
                cooperativa: 'Particular',
                empresa: 'Particular'
            });
            esPasajero = true;
        } else if (ROLES_OPERATIVOS.includes(rolNormalizado)) {
            nuevoUsuario = new Conductor({
                nombre,
                email: emailLimpio,
                password: hashedPassword,
                telefonoMovil,
                rol: rolNormalizado,
                cooperativa: terminalAsignada,
                empresa: terminalAsignada,
                isActive: true,
                isOnline: false
            });
            esConductor = true;
        } else {
            nuevoUsuario = new Usuario({
                nombre,
                email: emailLimpio,
                password: hashedPassword,
                telefonoMovil,
                rol: rolNormalizado,
                cooperativa: terminalAsignada,
                empresa: terminalAsignada,
                isActive: true
            });
        }

        await nuevoUsuario.save();

        // Sincronización hacia Firebase Firestore con Denormalización Saneada de Wallet
        try {
            const coleccionFirestore = esPasajero 
                ? (FIRESTORE_PATHS?.users || 'usuarios') 
                : (esConductor ? (FIRESTORE_PATHS?.conductores || 'conductores') : (FIRESTORE_PATHS?.users || 'usuarios'));

            const payloadFirestore = {
                uid: String(nuevoUsuario._id),
                email: nuevoUsuario.email,
                nombre: nuevoUsuario.nombre,
                telefono: nuevoUsuario.telefonoMovil,
                rol: nuevoUsuario.rol,
                isActive: true,
                cooperativa: nuevoUsuario.cooperativa || 'Particular',
                empresa: nuevoUsuario.empresa || 'Particular',
                createdAt: new Date().toISOString()
            };

            if (esConductor) {
                payloadFirestore.isOnline = false;
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

        return res.status(201).json({
            success: true,
            message: "Registro completado con éxito.",
            user: {
                id: nuevoUsuario._id,
                nombre: nuevoUsuario.nombre,
                email: nuevoUsuario.email,
                rol: nuevoUsuario.rol
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
            consulta.telefonoMovil = inputLimpio;
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

        if (!cuentaEncontrada.isActive) {
            return res.status(403).json({ success: false, message: "Esta cuenta se encuentra suspendida. Contacte soporte administrativo." });
        }

        const passwordValido = await bcrypt.compare(password, cuentaEncontrada.password);
        if (!passwordValido) {
            return res.status(401).json({ success: false, message: "Credenciales de acceso incorrectas o inexistentes." });
        }

        // Generación del Token JWT Operativo de TAXIA CIMCO
        const token = jwt.sign(
            { 
                id: cuentaEncontrada._id, 
                rol: cuentaEncontrada.rol || 'pasajero'
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
                rol: cuentaEncontrada.rol || 'pasajero',
                telefonoMovil: cuentaEncontrada.telefonoMovil,
                cooperativa: cuentaEncontrada.cooperativa || cuentaEncontrada.empresa || ""
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
            consulta.telefonoMovil = inputLimpio;
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

        // Generación de código numérico de 6 dígitos
        const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Registrar OTP en la bóveda volátil con tiempo de expiración (5 minutos)
        otpStore.set(usuarioExistente.telefonoMovil, {
            codigo: codigoOTP,
            expira: Date.now() + 5 * 60 * 1000,
            usuarioId: usuarioExistente._id
        });

        console.log(`🔑 [CIMCO-OTP-GATEWAY] Código generado para ${usuarioExistente.telefonoMovil}: [ ${codigoOTP} ] (Válido por 5 minutos)`);

        return res.status(200).json({ 
            success: true, 
            message: "Código de verificación generado con éxito.",
            debugOtp: process.env.NODE_ENV !== 'production' ? codigoOTP : undefined // Expuesto solo en fase de laboratorio
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
            consulta.telefonoMovil = inputLimpio;
        }

        // Localizar el usuario en primer lugar para obtener su número telefónico de correspondencia OTP
        const [u, c, p] = await Promise.all([
            Usuario.findOne(consulta),
            Conductor.findOne(consulta),
            Pasajero.findOne(consulta)
        ]);

        const usuario = u || c || p;

        if (!usuario) {
            return res.status(404).json({ success: false, message: "Identificador de cuenta inválido." });
        }

        const registroOTP = otpStore.get(usuario.telefonoMovil);

        if (!registroOTP) {
            return res.status(400).json({ success: false, message: "No se ha solicitado ningún código para este número o ya expiró." });
        }

        if (Date.now() > registroOTP.expira) {
            otpStore.delete(usuario.telefonoMovil);
            return res.status(400).json({ success: false, message: "El código de verificación ha expirado. Solicite uno nuevo." });
        }

        if (registroOTP.codigo !== String(codigo).trim()) {
            return res.status(400).json({ success: false, message: "Código de verificación incorrecto." });
        }

        // Todo correcto: Encriptar la nueva contraseña
        const newHashedPassword = await bcrypt.hash(nuevaPassword, 10);

        const condicionesUsuario = [
            { _id: usuario._id },
            { email: inputLimpio.toLowerCase() },
            { telefonoMovil: inputLimpio }
        ];
        const condicionesConductor = [
            { _id: usuario._id },
            { email: inputLimpio.toLowerCase() },
            { telefonoMovil: inputLimpio }
        ];
        const condicionesPasajero = [
            { _id: usuario._id },
            { email: inputLimpio.toLowerCase() },
            { telefonoMovil: inputLimpio }
        ];

        // ⚡ ACTUALIZACIÓN CONCURRENTE SEGREGADA Y SECUENCIAL
        let modificado = await Usuario.findOneAndUpdate(
            { $or: condicionesUsuario }, 
            { password: newHashedPassword },
            { new: true }
        );
        
        if (!modificado) {
            modificado = await Conductor.findOneAndUpdate(
                { $or: condicionesConductor }, 
                { password: newHashedPassword },
                { new: true }
            );
        }

        if (!modificado) {
            modificado = await Pasajero.findOneAndUpdate(
                { $or: condicionesPasajero },
                { password: newHashedPassword },
                { new: true }
            );
        }

        if (!modificado) {
            return res.status(404).json({ success: false, message: "No se encontró ninguna entidad vinculada a este identificador." });
        }

        otpStore.delete(usuario.telefonoMovil);
        console.log(`🔒 [CIMCO-SECURITY] Credenciales actualizadas vía OTP en Colección Central para: ${usuario.telefonoMovil}`);

        return res.status(200).json({ success: true, message: "Contraseña actualizada correctamente." });

    } catch (error) {
        console.error("🚨 [CIMCO-AUTH-RESET-FATAL] Error en reescritura de credenciales:", error);
        return res.status(500).json({ success: false, message: "Error interno al reescribir la contraseña." });
    }
};

/**
 * 📡 VERIFICACIÓN DE DISPONIBILIDAD TELEFÓNICA (MIGRADO Y EXPUESTO)
 */
export const verificarTelefono = async (req, res) => {
    try {
        if (!req.body || (!req.body.telefono && !req.body.telefonoMovil)) {
            return res.status(400).json({ success: false, message: "Número telefónico no suministrado." });
        }
        
        const telBusqueda = String(req.body.telefono || req.body.telefonoMovil).trim();

        // ⚡ TRIPLE HANDSHAKE DE VERIFICACIÓN TELEFÓNICA
        const [u, c, p] = await Promise.all([
            Usuario.findOne({ telefonoMovil: telBusqueda }),
            Conductor.findOne({ telefonoMovil: telBusqueda }),
            Pasajero.findOne({ telefonoMovil: telBusqueda })
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
 * 🔄 ACTUALIZACIÓN DE DATOS DE PERFIL (POLIMÓRFICO CONCURRENTE)
 * Modifica los datos del usuario logueado en Mongo y replica de inmediato en Firebase Firestore.
 */
export const updateProfile = async (req, res) => {
    try {
        const { id, rol } = req.user || req.body || {}; 
        const userId = id || req.body?.userId;

        if (!userId) {
            return res.status(400).json({ success: false, message: "No se encontró un identificador de sesión válido." });
        }

        const { nombre, telefonoMovil, cooperativa, empresa } = req.body || {};
        const nombreLimpio = nombre ? String(nombre).trim() : undefined;
        const telefonoLimpio = telefonoMovil ? String(telefonoMovil).trim() : undefined;
        const terminalAsignada = cooperativa || empresa || undefined;

        // 1. Identificar el modelo target usando resolución estricta
        let modeloTarget;
        let esPasajero = false;
        let esConductor = false;

        const rolNormalizado = rol ? String(rol).toLowerCase().trim() : 'pasajero';

        if (rolNormalizado === 'pasajero') {
            modeloTarget = Pasajero;
            esPasajero = true;
        } else if (ROLES_OPERATIVOS.includes(rolNormalizado)) {
            modeloTarget = Conductor;
            esConductor = true;
        } else {
            modeloTarget = Usuario;
        }

        // 2. Preparar payload de actualización para MongoDB
        const updateData = {};
        if (nombreLimpio) updateData.nombre = nombreLimpio;
        if (telefonoLimpio) updateData.telefonoMovil = telefonoLimpio;
        
        // Sincronización incondicional de cooperativa y empresa en Mongoose para evitar descartes de variables indexadas
        if (terminalAsignada) {
            updateData.cooperativa = terminalAsignada;
            updateData.empresa = terminalAsignada;
        }

        let usuarioActualizado = await modeloTarget.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true }
        );

        // Fallback por si hay descalce de rol en el Token: búsqueda secuencial de emergencia
        if (!usuarioActualizado) {
            const [uFallback, cFallback, pFallback] = await Promise.all([
                Usuario.findById(userId),
                Conductor.findById(userId),
                Pasajero.findById(userId)
            ]);
            
            if (uFallback) { usuarioActualizado = await Usuario.findByIdAndUpdate(userId, { $set: updateData }, { new: true }); esPasajero = false; esConductor = false; }
            else if (cFallback) { usuarioActualizado = await Conductor.findByIdAndUpdate(userId, { $set: updateData }, { new: true }); esPasajero = false; esConductor = true; }
            else if (pFallback) { usuarioActualizado = await Pasajero.findByIdAndUpdate(userId, { $set: updateData }, { new: true }); esPasajero = true; esConductor = false; }
        }

        if (!usuarioActualizado) {
            return res.status(404).json({ success: false, message: "El usuario no fue localizado en el núcleo de base de datos." });
        }

        // 3. Sincronizar concurrentemente en Firebase Firestore usando set-merge defensivo
        try {
            const coleccionTarget = esPasajero 
                ? (FIRESTORE_PATHS?.users || 'usuarios') 
                : (esConductor ? (FIRESTORE_PATHS?.conductores || 'conductores') : (FIRESTORE_PATHS?.users || 'usuarios'));

            const firestoreUpdate = {};
            if (nombreLimpio) firestoreUpdate.nombre = nombreLimpio;
            if (nombreLimpio) firestoreUpdate.fullName = nombreLimpio; 
            if (telefonoLimpio) firestoreUpdate.telefono = telefonoLimpio;
            if (telefonoLimpio) firestoreUpdate.telefonoMovil = telefonoLimpio;
            
            if (terminalAsignada) {
                firestoreUpdate.cooperativa = terminalAsignada;
                firestoreUpdate.empresa = terminalAsignada;
            }

            // set con merge evita excepciones si por algún motivo no existía el registro en Firestore
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

        return res.status(200).json({
            success: true,
            message: "Perfil de central actualizado con éxito en todos los nodos de datos.",
            user: {
                id: usuarioActualizado._id,
                nombre: usuarioActualizado.nombre,
                email: usuarioActualizado.email,
                rol: usuarioActualizado.rol || usuarioActualizado.role || rolNormalizado,
                telefonoMovil: usuarioActualizado.telefonoMovil,
                cooperativa: usuarioActualizado.cooperativa || usuarioActualizado.empresa || ""
            }
        });

    } catch (error) {
        console.error("🚨 [CIMCO-PROFILE-UPDATE-FATAL] Error crítico en la pasarela de actualización:", error);
        return res.status(500).json({ success: false, message: "Error interno al procesar los ajustes de perfil." });
    }
};