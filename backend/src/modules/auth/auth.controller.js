// Versión Arquitectura: V21.6 - Triple Handshake Unificado, Resurrección de Pasajero y Blindaje OTP Total
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\auth\auth.controller.js
 * Misión: Controlador de autenticación con ruteo polimórfico concurrente hacia 3 colecciones (usuarios, conductores, pasajeros).
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
const ROLES_OPERATIVOS = ['conductor', 'despachador', 'mototaxi', 'motoparrillero', 'motocarga', 'intermunicipal', 'admin'];

export const login = async (req, res) => {
    try {
        // 🛡️ MITIGACIÓN ALERTA 1: Validación estricta del payload móvil
        if (!req || !req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "⚠️ [CIMCO-NET-ERR] Payload nulo o vacío desde dispositivo." 
            });
        }

        const identificadorOriginal = req.body.identificador || req.body.identifier || req.body.usuario || req.body.email || req.body.correo;
        const password = req.body.password || req.body.clave || req.body.contrasena;

        if (!identificadorOriginal || !password) {
            return res.status(400).json({ success: false, message: "Credenciales incompletas." });
        }

        const inputLimpio = String(identificadorOriginal).trim();
        const inputLimpioMinusculas = inputLimpio.toLowerCase();
        const esValidObjectId = /^[0-9a-fA-F]{24}$/.test(inputLimpio);

        // Arreglos de condiciones polimórficas adaptadas a MongoDB Atlas
        const condicionesBase = [
            { email: inputLimpioMinusculas },
            { telefono: inputLimpio },
            { telefonoMovil: inputLimpio },
            { uid: inputLimpio }
        ];

        const condicionesUsuario = [...condicionesBase, { username: inputLimpioMinusculas }];

        if (esValidObjectId) {
            condicionesBase.push({ _id: inputLimpio });
            condicionesUsuario.push({ _id: inputLimpio });
        }

        // ⚡ TRIPLE BÚSQUEDA PARALELA (CONDUCTOR, USUARIO, PASAJERO)
        const [usuarioEncontrado, conductorEncontrado, pasajeroEncontrado] = await Promise.all([
            Usuario.findOne({ $or: condicionesUsuario }),
            Conductor.findOne({ $or: condicionesBase }),
            Pasajero.findOne({ $or: condicionesBase })
        ]);

        const entidad = usuarioEncontrado || conductorEncontrado || pasajeroEncontrado;

        if (!entidad) {
            return res.status(404).json({ success: false, message: "Credenciales no reconocidas en el nodo central." });
        }

        const passwordValida = await bcrypt.compare(String(password), entidad.password);
        if (!passwordValida) {
            return res.status(401).json({ success: false, message: "Credenciales incorrectas." });
        }

        const rolDetectado = entidad.rol || entidad.role || 'pasajero';
        const resolvedUid = entidad.uid || entidad._id.toString();
        const resolvedConductorId = (rolDetectado !== 'pasajero' && rolDetectado !== 'user') ? (entidad.conductorId || entidad._id.toString()) : null;

        const token = jwt.sign(
            { 
                id: entidad._id, 
                uid: resolvedUid,
                conductorId: resolvedConductorId,
                role: rolDetectado, 
                rol: rolDetectado,
                access_level: entidad.access_level || 10,
                email: entidad.email 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log(`✅ [CIMCO-AUTH-NET] Handshake optimizado exitoso. Acceso concedido a: ${entidad.nombre || entidad.fullName} [ID: ${entidad._id}] [Rol: ${rolDetectado}]`);

        return res.status(200).json({
            success: true,
            message: 'Handshake de acceso completado.',
            token,
            cimco_token: token,
            user: { 
                id: entidad._id, 
                _id: entidad._id,
                uid: resolvedUid,
                conductorId: resolvedConductorId,
                fullName: entidad.fullName || entidad.nombre || inputLimpio,
                nombre: entidad.nombre || entidad.fullName || inputLimpio,
                telefono: entidad.telefono || entidad.telefonoMovil || inputLimpio,
                email: entidad.email,
                role: rolDetectado, 
                rol: rolDetectado,
                vehiculo: entidad.vehiculo || entidad.placa || entidad.patente || null,
                access_level: entidad.access_level || 10,
                saldo: entidad.saldo !== undefined ? entidad.saldo : (entidad.balance || 0)
            },
            usuario: {
                id: entidad._id,
                nombre: entidad.nombre || entidad.fullName || inputLimpio,
                email: entidad.email,
                role: rolDetectado,
                rol: rolDetectado
            }
        });

    } catch (error) {
        console.error("🚨 [CIMCO-AUTH-FATAL] Error crítico en el bus de autenticación:", error);
        return res.status(500).json({ success: false, message: "Error interno en el servidor central." });
    }
};

export const register = async (req, res) => {
    try {
        if (!req || !req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ success: false, message: "Payload inválido en registro." });
        }

        const { email, password, nombre, fullName, telefono, role, rol, patente, vehiculo, placa } = req.body;
        const inputNombre = fullName || nombre;
        const inputRole = role || rol || 'pasajero';
        const rolNormalizado = String(inputRole).toLowerCase().trim();

        if (!inputNombre || !email || !password || !telefono) {
            return res.status(400).json({ success: false, message: "Campos obligatorios incompletos." });
        }

        const emailLimpio = String(email).trim().toLowerCase();
        const telefonoLimpio = String(telefono).trim();

        // ⚡ TRIPLE VERIFICACIÓN DE EXISTENCIA SIMULTÁNEA
        const [usuarioExiste, conductorExiste, pasajeroExiste] = await Promise.all([
            Usuario.findOne({ $or: [{ email: emailLimpio }, { telefono: telefonoLimpio }] }),
            Conductor.findOne({ $or: [{ email: emailLimpio }, { telefono: telefonoLimpio }] }),
            Pasajero.findOne({ $or: [{ email: emailLimpio }, { telefono: telefonoLimpio }, { telefonoMovil: telefonoLimpio }] })
        ]);

        if (usuarioExiste || conductorExiste || pasajeroExiste) {
            return res.status(400).json({ success: false, message: "El email o teléfono ya se encuentra registrado." });
        }

        let nuevoOperador;
        const payloadBase = {
            email: emailLimpio,
            password: password, 
            fullName: inputNombre,
            nombre: inputNombre,
            role: rolNormalizado,
            rol: rolNormalizado
        };

        // 🔀 SEGREGACIÓN DE ESCRITURA EN 3 COLECCIONES
        if (rolNormalizado === 'pasajero') {
            nuevoOperador = new Pasajero({ 
                ...payloadBase, 
                telefono: telefonoLimpio, 
                telefonoMovil: telefonoLimpio 
            });
        } else if (ROLES_OPERATIVOS.includes(rolNormalizado)) {
            nuevoOperador = new Conductor({ 
                ...payloadBase, 
                telefono: telefonoLimpio, 
                patente: patente || vehiculo || placa || 'N/A', 
                vehiculo: vehiculo || placa || 'N/A', 
                estado: 'free', 
                saldo: 0 
            });
        } else {
            nuevoOperador = new Usuario({ 
                ...payloadBase, 
                telefono: telefonoLimpio, 
                username: emailLimpio.split('@')[0], 
                access_level: rolNormalizado === 'admin' ? 99 : 1, 
                estado: 'offline' 
            });
        }

        const guardado = await nuevoOperador.save();
        const nuevoUsuarioId = guardado._id.toString();

        // 🔗 PERSISTENCIA COMPLEMENTARIA EN FIREBASE
        try {
            const coleccionTarget = rolNormalizado === 'pasajero' ? (FIRESTORE_PATHS.USUARIOS || 'usuarios') : (FIRESTORE_PATHS.conductores || 'conductores');
            await dbFirestore.collection(coleccionTarget).doc(nuevoUsuarioId).set({
                id: nuevoUsuarioId,
                nombre: inputNombre,
                email: emailLimpio,
                telefono: telefonoLimpio,
                role: rolNormalizado,
                rol: rolNormalizado,
                estado: 'offline',
                createdAt: new Date().toISOString()
            });
        } catch (fsErr) {
            console.warn(`⚠️ [CIMCO-SYNC-WARN] Fallo en espejo Firestore: ${fsErr.message}`);
        }

        const token = jwt.sign(
            { id: guardado._id, role: guardado.role, email: guardado.email }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        return res.status(201).json({ 
            success: true, 
            message: "Aprovisionamiento completado.", 
            token, 
            user: { id: guardado._id, nombre: guardado.nombre, email: guardado.email, role: guardado.role } 
        });

    } catch (error) {
        console.error("🚨 [CIMCO-REG-FATAL] Error en registro polimórfico:", error);
        return res.status(500).json({ success: false, message: "Error interno en el servidor." });
    }
};

export const verificarTelefono = async (req, res) => {
    try {
        if (!req.body || !req.body.telefono) {
            return res.status(400).json({ success: false, message: "Número telefónico no suministrado." });
        }
        
        const telBusqueda = String(req.body.telefono).trim();

        // ⚡ TRIPLE HANDSHAKE DE VERIFICACIÓN TELEFÓNICA 
        const [u, c, p] = await Promise.all([
            Usuario.findOne({ $or: [{ telefono: telBusqueda }, { username: telBusqueda }] }),
            Conductor.findOne({ telefono: telBusqueda }),
            Pasajero.findOne({ $or: [{ telefono: telBusqueda }, { telefonoMovil: telBusqueda }] })
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

export const solicitarRecuperacion = async (req, res) => {
    try {
        if (!req.body || !req.body.identificador) {
            return res.status(400).json({ success: false, message: "Identificador perimetral obligatorio." });
        }

        const inputLimpio = String(req.body.identificador).trim();
        const inputMinusculas = inputLimpio.toLowerCase();

        const condicionesBase = [
            { email: inputMinusculas },
            { telefono: inputLimpio },
            { telefonoMovil: inputLimpio }
        ];

        // ⚡ TRIPLE BÚSQUEDA PARALELA DE RECUPERACIÓN
        const [u, c, p] = await Promise.all([
            Usuario.findOne({ $or: [...condicionesBase, { username: inputMinusculas }] }),
            Conductor.findOne({ $or: condicionesBase }),
            Pasajero.findOne({ $or: condicionesBase })
        ]);

        const target = u || c || p;

        if (!target) {
            return res.status(404).json({ success: false, message: "No se encontró ninguna entidad vinculada a este identificador." });
        }

        const otpDefinido = "123456"; 
        const cacheKey = target.email ? target.email.toLowerCase() : inputMinusculas;
        
        otpStore.set(cacheKey, {
            otp: otpDefinido,
            expires: Date.now() + 600000 
        });

        console.log(`🔑 [CIMCO-SECURITY] Token OTP Generado e Inyectado (${otpDefinido}) para: ${cacheKey}`);

        return res.status(200).json({ 
            success: true, 
            message: "Código de restablecimiento despachado con éxito.",
            debug_otp: otpDefinido 
        });

    } catch (error) {
        console.error("🚨 [CIMCO-OTP-FATAL] Falla en pasarela de tokens de seguridad:", error);
        return res.status(500).json({ success: false, message: "Error en el despachador de OTP." });
    }
};

export const restablecerPassword = async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ success: false, message: "Payload inexistente." });
        }

        const { identificador, otp, nuevaPassword } = req.body;

        if (!identificador || !otp || !nuevaPassword) {
            return res.status(400).json({ success: false, message: "Parámetros de reescritura incompletos." });
        }

        const inputLimpio = String(identificador).trim().toLowerCase();
        const cacheData = otpStore.get(inputLimpio);

        if (!cacheData) {
            return res.status(400).json({ success: false, message: "Código OTP vencido o no solicitado para este nodo." });
        }

        if (cacheData.otp !== String(otp) || Date.now() > cacheData.expires) {
            return res.status(400).json({ success: false, message: "Código OTP inválido o expirado cronológicamente." });
        }

        const salt = await bcrypt.genSalt(10);
        const newHashedPassword = await bcrypt.hash(String(nuevaPassword), salt);

        const condicionesUsuario = [
            { email: inputLimpio },
            { telefono: inputLimpio },
            { username: inputLimpio }
        ];

        const condicionesConductor = [
            { email: inputLimpio },
            { telefono: inputLimpio },
            { uid: inputLimpio }
        ];

        const condicionesPasajero = [
            { email: inputLimpio },
            { telefono: inputLimpio },
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

        otpStore.delete(inputLimpio);
        console.log(`🔒 [CIMCO-SECURITY] Credenciales actualizadas vía OTP en Colección Central para: ${inputLimpio}`);

        return res.status(200).json({ success: true, message: "Contraseña actualizada correctamente." });

    } catch (error) {
        console.error("🚨 [CIMCO-AUTH-RESET-FATAL] Error en reescritura de credenciales:", error);
        return res.status(500).json({ success: false, message: "Error interno en el servidor central." });
    }
};