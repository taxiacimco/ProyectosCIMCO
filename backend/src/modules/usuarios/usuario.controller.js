// Versión Arquitectura: V19.6 - Delegación Centralizada de Excepciones mediante next(error)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\usuarios\usuario.controller.js
 * Misión: Control unificado de usuarios (Admin, Despachador, Pasajero, Staff), directorio global deduplicado, inyección sincrónica de UID Firebase Auth, blindaje del atributo UID contra colisiones de índice sparse (E11000), flujo financiero sin mutaciones dobles de saldo, ajuste polimórfico multi-colección y delegación centralizada de excepciones via next(error).
 */

import mongoose from 'mongoose';
import Usuario from '../../models/Usuario.js';
import Conductor from '../../models/Conductor.js';
import Pasajero from '../../models/Pasajero.js';
import HistorialSaldo from '../../models/HistorialSaldo.js';
import admin, { dbFirestore, FIRESTORE_PATHS } from '../../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Helper para registrar transacciones auditables en Firestore
 */
const registrarTransaccionFirestore = async ({
    idUsuario,
    rol,
    subrol,
    monto,
    saldoAnterior,
    saldoNuevo,
    tipoOperacion,
    autorizadoPor,
    referencia
}) => {
    try {
        const pathTransacciones = FIRESTORE_PATHS?.transactions || 'transacciones';
        await dbFirestore.collection(pathTransacciones).add({
            idUsuario: idUsuario?.toString(),
            rol,
            subrol: subrol || 'operador_taquilla',
            monto,
            saldoAnterior,
            saldoNuevo,
            tipoOperacion,
            autorizadoPor: autorizadoPor || 'SISTEMA',
            referencia: referencia || `TX-${Date.now()}`,
            timestamp: FieldValue.serverTimestamp(),
            fechaRegistro: new Date().toISOString()
        });
    } catch (error) {
        console.warn("⚠️ [FIRESTORE-TX-WARN] No se pudo registrar la transacción en Firestore:", error.message);
    }
};

// ==================================================================
// 1. GESTIÓN GENERAL Y DIRECTORIO GLOBAL DE USUARIOS
// ==================================================================

/**
 * 🌐 Directorio Global Centralizado y Anti-Duplicados
 * Retorna todos los actores del sistema unificados y limpios por ID/Email/Teléfono
 */
export const obtenerDirectorioGlobal = async (req, res, next) => {
    try {
        // Consultar la base de datos de usuarios excluyendo contraseñas
        const usuariosBrutos = await Usuario.find().select('-password').lean();

        // Mapa de deduplicación defensiva
        const mapaUnico = new Map();

        usuariosBrutos.forEach((u) => {
            // Generación de clave única usando _id, uid, o email/teléfono como salvaguarda
            const idKey = u._id ? u._id.toString() : (u.uid || u.email || u.telefono || u.telefonoMovil);

            if (idKey && !mapaUnico.has(idKey)) {
                // Normalización de orígenes y roles para visibilidad homogénea en UI
                const usuarioLimpio = {
                    ...u,
                    id: u._id ? u._id.toString() : u.uid,
                    rolNormalizado: (u.rol || u.role || 'pasajero').toLowerCase(),
                    origenColeccion: u.origenColeccion || 'USUARIOS'
                };
                mapaUnico.set(idKey, usuarioLimpio);
            }
        });

        const listaLimpia = Array.from(mapaUnico.values());

        return res.status(200).json({
            success: true,
            total: listaLimpia.length,
            usuarios: listaLimpia,
            data: listaLimpia
        });
    } catch (error) {
        console.error("❌ Error en obtenerDirectorioGlobal:", error);
        next(error);
    }
};

/**
 * 📋 Obtener listado de usuarios filtrado opcionalmente por rol
 */
export const obtenerUsuarios = async (req, res, next) => {
    try {
        const { rol } = req.query;
        const filtro = {};

        if (rol) {
            filtro.$or = [{ rol }, { role: rol }];
        }

        const usuarios = await Usuario.find(filtro).select('-password').lean();
        
        // Aplicar deduplicación por seguridad
        const mapaUnico = new Map();
        usuarios.forEach(u => {
            const key = u._id ? u._id.toString() : u.email;
            if (key && !mapaUnico.has(key)) mapaUnico.set(key, u);
        });

        const listaFiltrada = Array.from(mapaUnico.values());

        return res.status(200).json({ success: true, contador: listaFiltrada.length, data: listaFiltrada });
    } catch (error) {
        next(error);
    }
};

/**
 * 🛡️ Middleware/Función de Validación Anti-Duplicados previo al registro
 */
export const validarRegistroUnico = async (req, res, next) => {
    try {
        const { email, telefono, telefonoMovil, uid } = req.body;
        const telContacto = telefono || telefonoMovil;

        const condiciones = [];
        if (email) condiciones.push({ email: String(email).toLowerCase().trim() });
        if (telContacto) condiciones.push({ telefono: String(telContacto).trim() }, { telefonoMovil: String(telContacto).trim() });
        if (uid && String(uid).trim() !== '' && uid !== 'null' && uid !== 'undefined') {
            condiciones.push({ uid: String(uid).trim() });
        }

        if (condiciones.length > 0) {
            const usuarioExistente = await Usuario.findOne({ $or: condiciones }).lean();
            if (usuarioExistente) {
                return res.status(400).json({
                    success: false,
                    code: 'DUPLICATE_USER',
                    message: "⚠️ El correo electrónico, número de teléfono o UID ya está registrado en el sistema."
                });
            }
        }
        next();
    } catch (error) {
        if (error.code === 11000 || (error.name === 'MongoServerError' && error.code === 11000)) {
            return res.status(400).json({
                success: false,
                code: 'DUPLICATE_KEY_E11000',
                message: "⚠️ El correo, teléfono o UID ingresado ya pertenece a otro usuario."
            });
        }
        next(error);
    }
};

/**
 * 📝 Registrar / Crear Usuario (Admin, Secretaría, Despachador, Staff)
 * Inyección sincrónica de UID mediante Firebase Auth y blindaje contra colisiones de índice sparse E11000 por 'uid: null'
 */
export const registrarUsuario = async (req, res, next) => {
    try {
        const { nombre, email, telefono, telefonoMovil, password, uid, rol, role, subrol, terminal_id, codigoDespachador } = req.body;
        const telContacto = (telefonoMovil || telefono) ? String(telefonoMovil || telefono).trim() : undefined;
        const emailSanitizado = email ? String(email).toLowerCase().trim() : undefined;
        const rolFinal = String(rol || role || 'despachador').toLowerCase().trim();

        // 1. Validar campos obligatorios mínimos
        if (!nombre || (!emailSanitizado && !telContacto)) {
            return res.status(400).json({
                success: false,
                code: 'MISSING_REQUIRED_FIELDS',
                message: "⚠️ El nombre y al menos un método de contacto (correo o teléfono) son obligatorios."
            });
        }

        // 2. Sanitizar UID: Garantizar omisión limpia (undefined) si no se proporciona para permitir operar al índice sparse
        let targetUid = (uid && typeof uid === 'string' && uid.trim() !== '' && uid !== 'null' && uid !== 'undefined')
            ? uid.trim()
            : undefined;

        // 3. Comprobar duplicados previos en MongoDB
        const condiciones = [];
        if (emailSanitizado) condiciones.push({ email: emailSanitizado });
        if (telContacto) condiciones.push({ telefono: telContacto }, { telefonoMovil: telContacto });

        if (condiciones.length > 0) {
            const existeUsuario = await Usuario.findOne({ $or: condiciones }).lean();
            if (existeUsuario) {
                return res.status(400).json({
                    success: false,
                    code: 'DUPLICATE_USER',
                    message: "⚠️ El correo electrónico o número móvil ya pertenece a un usuario registrado."
                });
            }
        }

        // 4. Inyección sincrónica de UID con Firebase Auth si no viene proporcionado
        if (!targetUid && emailSanitizado && password) {
            try {
                // Formateo defensivo de teléfono a E.164 (+57 Colombia) si existe
                const telefonoE164 = telContacto ? `+57${telContacto.replace(/\D/g, '').slice(-10)}` : undefined;

                const userRecord = await admin.auth().createUser({
                    email: emailSanitizado,
                    password: String(password),
                    phoneNumber: telefonoE164,
                    displayName: String(nombre).trim()
                });

                targetUid = userRecord.uid;
            } catch (authErr) {
                console.error("❌ Error al crear credenciales en Firebase Auth:", authErr);
                return res.status(400).json({
                    success: false,
                    code: 'FIREBASE_AUTH_ERROR',
                    message: `No se pudo crear la cuenta en Firebase Auth: ${authErr.message}`
                });
            }
        }

        // 5. Construir objeto de usuario sin atributos null explícitos en campos indexados
        const usuarioData = {
            nombre: String(nombre).trim(),
            email: emailSanitizado,
            telefono: telContacto,
            telefonoMovil: telContacto,
            rol: rolFinal,
            subrol: subrol || 'general',
            saldo: 0,
            saldoWallet: 0
        };

        if (targetUid) {
            usuarioData.uid = targetUid;
        }

        if (password) {
            usuarioData.password = password;
        }

        if (terminal_id) {
            usuarioData.terminal_id = terminal_id;
        }

        if (codigoDespachador) {
            usuarioData.codigoDespachador = codigoDespachador;
        }

        const nuevoUsuario = new Usuario(usuarioData);
        await nuevoUsuario.save();

        // 6. Réplica inicial en Firebase Firestore
        try {
            const docFirestoreId = nuevoUsuario.uid || nuevoUsuario._id.toString();
            const coleccionUsuarios = FIRESTORE_PATHS?.users || 'usuarios';
            await dbFirestore.collection(coleccionUsuarios).doc(docFirestoreId).set({
                id: docFirestoreId,
                nombre: nuevoUsuario.nombre,
                email: nuevoUsuario.email || '',
                telefono: telContacto || '',
                telefonoMovil: telContacto || '',
                rol: nuevoUsuario.rol,
                subrol: nuevoUsuario.subrol || 'general',
                saldo: 0,
                saldoWallet: 0,
                createdAt: new Date().toISOString()
            }, { merge: true });
        } catch (fsErr) {
            console.warn("⚠️ [CIMCO-USUARIO-REG-FS-WARN] No se pudo replicar perfil inicial en Firestore:", fsErr.message);
        }

        return res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente.',
            data: nuevoUsuario,
            usuario: nuevoUsuario
        });

    } catch (error) {
        console.error("❌ [CIMCO-USUARIO-REG-ERROR] Error en registro de usuario:", error);

        if (error.code === 11000 || (error.name === 'MongoServerError' && error.code === 11000)) {
            const campoDuplicado = error.keyValue ? Object.keys(error.keyValue).join(', ') : 'correo, teléfono o UID';
            return res.status(400).json({
                success: false,
                code: 'DUPLICATE_KEY_E11000',
                message: `⚠️ El ${campoDuplicado} ingresado ya se encuentra registrado por otro usuario.`
            });
        }

        next(error);
    }
};

/**
 * Alias explícito de creación para compatibilidad con rutas legacy / API
 */
export const crearUsuario = registrarUsuario;

/**
 * 👤 Obtener usuario por ID, UID o desde la sesión activa (req.user)
 */
export const obtenerUsuarioPorId = async (req, res, next) => {
    try {
        const targetId = req.params.id || req.params.uid || req.user?.id || req.user?._id || req.user?.uid;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de usuario ausente." });
        }

        const usuario = await Usuario.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                { uid: targetId }
            ]
        }).select('-password').lean();

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        return res.status(200).json({ success: true, data: usuario, usuario });
    } catch (error) {
        next(error);
    }
};

/**
 * 🔄 Actualizar datos de usuario con sincronización a Firestore y saneamiento de UID
 */
export const actualizarUsuario = async (req, res, next) => {
    try {
        const targetId = req.params.id || req.params.uid || req.user?.id || req.user?._id || req.user?.uid;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de usuario ausente para actualización." });
        }

        const updateData = { ...req.body };
        delete updateData.password; // Prevenir mutación directa de credenciales sin hash

        // Sanitización de UID en actualizaciones para evitar inyección de null / cadenas vacías que alteren índices sparse
        if (updateData.uid !== undefined) {
            if (!updateData.uid || updateData.uid === 'null' || updateData.uid === 'undefined' || String(updateData.uid).trim() === '') {
                delete updateData.uid;
            } else {
                updateData.uid = String(updateData.uid).trim();
            }
        }

        const usuario = await Usuario.findOneAndUpdate(
            {
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                    { uid: targetId }
                ]
            },
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password').lean();

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        // Espejo en Firebase Firestore
        try {
            const docFirestoreId = usuario.uid || usuario._id.toString();
            const coleccionUsuarios = FIRESTORE_PATHS?.users || 'usuarios';

            const payloadFs = {};
            if (usuario.nombre) payloadFs.nombre = usuario.nombre;
            if (usuario.email) payloadFs.email = usuario.email;
            if (usuario.telefonoMovil || usuario.telefono) payloadFs.telefono = usuario.telefonoMovil || usuario.telefono;
            if (usuario.rol || usuario.role) payloadFs.rol = usuario.rol || usuario.role;

            await dbFirestore.collection(coleccionUsuarios).doc(docFirestoreId).set(payloadFs, { merge: true });
        } catch (fsErr) {
            console.warn("⚠️ [CIMCO-USUARIO-SYNC-WARN] Error al replicar actualización en Firestore:", fsErr.message);
        }

        return res.status(200).json({ success: true, message: 'Usuario actualizado correctamente', data: usuario, usuario });
    } catch (error) {
        if (error.code === 11000 || (error.name === 'MongoServerError' && error.code === 11000)) {
            const campoDuplicado = error.keyValue ? Object.keys(error.keyValue).join(', ') : 'correo, teléfono o UID';
            return res.status(400).json({
                success: false,
                code: 'DUPLICATE_KEY_E11000',
                message: `⚠️ El ${campoDuplicado} ingresado ya está asignado a otro usuario.`
            });
        }
        next(error);
    }
};

/**
 * 🗑️ Eliminar usuario por ID o UID
 */
export const eliminarUsuario = async (req, res, next) => {
    try {
        const targetId = req.params.id || req.params.uid;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de usuario ausente para eliminación." });
        }

        const usuarioEliminado = await Usuario.findOneAndDelete({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                { uid: targetId }
            ]
        });

        if (!usuarioEliminado) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        return res.status(200).json({ success: true, message: 'Usuario eliminado correctamente' });
    } catch (error) {
        next(error);
    }
};

// ==================================================================
// 2. GESTIÓN ESPECÍFICA DE DESPACHADORES Y TERMINALES
// ==================================================================

/**
 * 🎧 Obtener todos los usuarios con rol de despachador
 */
export const obtenerDespachadores = async (req, res, next) => {
    try {
        const despachadores = await Usuario.find({
            $or: [{ rol: 'despachador' }, { role: 'despachador' }]
        }).select('-password').lean();

        return res.status(200).json({ success: true, contador: despachadores.length, data: despachadores });
    } catch (error) {
        next(error);
    }
};

/**
 * 🏢 Asignar Terminal y Código Operativo a Despachador (con réplica a Firestore)
 */
export const asignarTerminalDespachador = async (req, res, next) => {
    try {
        const { despachadorId, id, uid, terminal_id, codigoDespachador } = req.body;
        const targetId = despachadorId || id || uid;

        if (!targetId || !terminal_id) {
            return res.status(400).json({ success: false, message: "⚠️ `despachadorId` y `terminal_id` son requeridos." });
        }

        const codigoGenerado = codigoDespachador || `DSP-${Date.now().toString().slice(-4)}`;

        const usuario = await Usuario.findOneAndUpdate(
            {
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                    { uid: targetId }
                ]
            },
            { 
                $set: { 
                    terminal_id, 
                    codigoDespachador: codigoGenerado
                } 
            },
            { new: true }
        ).select('-password').lean();

        if (!usuario) {
            return res.status(404).json({ success: false, message: "Despachador no encontrado." });
        }

        // Réplica defensiva a Firestore para despachadores
        try {
            const docFirestoreId = usuario.uid || usuario._id.toString();
            const coleccionUsuarios = FIRESTORE_PATHS?.users || 'usuarios';

            await dbFirestore.collection(coleccionUsuarios).doc(docFirestoreId).set({
                terminal_id,
                codigoDespachador: codigoGenerado,
                ultimaActualizacion: new Date().toISOString()
            }, { merge: true });
        } catch (fsErr) {
            console.warn("⚠️ Error replicando terminal de despachador a Firestore:", fsErr.message);
        }

        return res.status(200).json({
            success: true,
            message: "Terminal asignada con éxito al despachador.",
            data: usuario
        });
    } catch (error) {
        next(error);
    }
};

// ==================================================================
// 3. BILLETERA Y FINANZAS DE DESPACHADORES Y AJUSTES GLOBAL POLIMÓRFICOS
// ==================================================================

/**
 * 💰 Consultar saldo del despachador
 */
export const obtenerSaldoDespachador = async (req, res, next) => {
    try {
        const targetId = req.params.id || req.user?.id || req.user?._id;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de despachador ausente." });
        }

        const usuario = await Usuario.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                { uid: targetId }
            ]
        }).select('saldo saldoWallet nombre rol role').lean();

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Despachador no encontrado.' });
        }

        const saldoFinal = usuario.saldoWallet ?? usuario.saldo ?? 0;

        return res.status(200).json({
            success: true,
            saldo: saldoFinal,
            saldoWallet: saldoFinal,
            data: usuario
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 💳 Recargar saldo a Despachador con incremento atómico ($inc) y auditoría en Firestore
 */
export const recargarSaldoDespachador = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { despachadorId, id, uid, monto, referencia, nota } = req.body;
        const targetId = despachadorId || id || uid;
        const montoNum = parseFloat(monto);
        const adminId = req.user?.id || req.user?._id || 'ADMIN_CENTRAL';

        if (!targetId || isNaN(montoNum) || montoNum <= 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: "Monto e ID de despachador válidos son requeridos." });
        }

        // Incremento atómico ($inc) unificado sobre ambos campos para evitar doble mutación no sincronizada
        const despachadorAnterior = await Usuario.findOneAndUpdate(
            { 
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                    { uid: targetId }
                ],
                $and: [
                    { $or: [{ rol: 'despachador' }, { role: 'despachador' }] }
                ]
            },
            { $inc: { saldo: montoNum, saldoWallet: montoNum } },
            { new: false, session } // Retorna estado anterior para auditoría
        );

        if (!despachadorAnterior) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: "Despachador no encontrado o rol no válido." });
        }

        const saldoAnterior = Number(despachadorAnterior.saldoWallet ?? despachadorAnterior.saldo ?? 0);
        const saldoNuevo = saldoAnterior + montoNum;

        // Registro de Historial en MongoDB
        const nuevoHistorial = new HistorialSaldo({
            conductor: despachadorAnterior._id,
            tipo: 'recarga_despachador',
            monto: montoNum,
            saldoAnterior,
            saldoNuevo,
            referencia: referencia || `DSP-${Date.now()}`,
            descripcion: nota || 'Recarga autorizada para despachador'
        });
        await nuevoHistorial.save({ session });

        await session.commitTransaction();
        session.endSession();

        const docFirestoreId = despachadorAnterior.uid || despachadorAnterior._id.toString();

        // Espejo de Billetera en Firestore
        try {
            const pathBilleteras = FIRESTORE_PATHS?.wallets || 'billeteras';
            await dbFirestore.collection(pathBilleteras).doc(docFirestoreId).set({
                id: docFirestoreId,
                nombreUsuario: despachadorAnterior.nombre,
                saldo: saldoNuevo,
                saldoWallet: saldoNuevo,
                balance: saldoNuevo,
                ultimaActualizacion: new Date().toISOString()
            }, { merge: true });
        } catch (fsWalletErr) {
            console.warn("⚠️ Error actualizando billetera en Firestore:", fsWalletErr.message);
        }

        // Auditoría centralizada Firestore
        await registrarTransaccionFirestore({
            idUsuario: docFirestoreId,
            rol: 'despachador',
            subrol: 'operador_taquilla',
            monto: montoNum,
            saldoAnterior,
            saldoNuevo,
            tipoOperacion: 'RECARGA_DESPACHADOR',
            autorizadoPor: adminId,
            referencia: referencia || `DSP-${Date.now()}`
        });

        return res.status(200).json({
            success: true,
            message: `Saldo acreditado al despachador. Nuevo saldo: $${saldoNuevo} COP`,
            saldoNuevo,
            saldoActual: saldoNuevo,
            data: { saldoNuevo }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

/**
 * 💳 AJUSTE TRANSACCIONAL DE BILLETERA (Búsqueda Polimórfica Multi-Colección)
 */
export const ajustarSaldoBilletera = async (req, res, next) => {
    try {
        const { usuarioId, idTarget, monto, concepto, rol } = req.body;
        const targetId = usuarioId || idTarget || req.params.id;

        if (!targetId) {
            return res.status(400).json({ success: false, message: "El ID del destinatario es requerido." });
        }

        const montoNumerico = Number(monto);
        if (isNaN(montoNumerico) || montoNumerico === 0) {
            return res.status(400).json({ success: false, message: "Monto inválido para el ajuste." });
        }

        // 1️⃣ BÚSQUEDA POLIMÓRFICA CONCURRENTE EN LAS 3 COLECCIONES
        const isObjectId = mongoose.Types.ObjectId.isValid(targetId);
        const queryCond = isObjectId ? { _id: targetId } : { uid: targetId };

        const [usuarioAdmin, usuarioConductor, usuarioPasajero] = await Promise.all([
            Usuario.findOne(queryCond),
            Conductor.findOne(queryCond),
            Pasajero.findOne(queryCond)
        ]);

        // Identificar en cuál colección existe el objetivo
        const entidadDestino = usuarioAdmin || usuarioConductor || usuarioPasajero;

        if (!entidadDestino) {
            return res.status(404).json({ 
                success: false, 
                message: "Usuario no encontrado en ninguna colección del sistema." 
            });
        }

        // 2️⃣ CÁLCULO Y ACTUALIZACIÓN DE SALDO
        const saldoActual = Number(entidadDestino.saldoWallet ?? entidadDestino.saldo ?? entidadDestino.balance ?? 0);
        const nuevoSaldo = saldoActual + montoNumerico;

        entidadDestino.saldo = nuevoSaldo;
        if (entidadDestino.saldoWallet !== undefined || entidadDestino.saldoWallet === null) entidadDestino.saldoWallet = nuevoSaldo;
        if (entidadDestino.balance !== undefined || entidadDestino.balance === null) entidadDestino.balance = nuevoSaldo;

        await entidadDestino.save();

        const docFirestoreId = entidadDestino.uid || entidadDestino._id.toString();

        // Espejo de Billetera en Firebase Firestore
        try {
            const pathBilleteras = FIRESTORE_PATHS?.wallets || 'billeteras';
            await dbFirestore.collection(pathBilleteras).doc(docFirestoreId).set({
                id: docFirestoreId,
                nombreUsuario: entidadDestino.nombre || entidadDestino.nombres || 'Usuario TAXIA',
                saldo: nuevoSaldo,
                saldoWallet: nuevoSaldo,
                balance: nuevoSaldo,
                ultimaActualizacion: new Date().toISOString()
            }, { merge: true });
        } catch (fsWalletErr) {
            console.warn("⚠️ [FIRESTORE-WALLET-WARN] Error actualizando billetera:", fsWalletErr.message);
        }

        // Auditoría centralizada en Firestore
        await registrarTransaccionFirestore({
            idUsuario: docFirestoreId,
            rol: entidadDestino.rol || entidadDestino.role || rol || 'usuario',
            subrol: entidadDestino.subrol || 'general',
            monto: montoNumerico,
            saldoAnterior: saldoActual,
            saldoNuevo: nuevoSaldo,
            tipoOperacion: montoNumerico > 0 ? 'RECARGA_POLIMORFICA' : 'DEBITO_POLIMORFICO',
            autorizadoPor: req.user?.id || req.user?._id || 'SISTEMA',
            referencia: concepto || `AJUSTE-POLI-${Date.now()}`
        });

        return res.status(200).json({
            success: true,
            message: "Ajuste de billetera procesado con éxito.",
            saldoAnterior: saldoActual,
            nuevoSaldo: nuevoSaldo,
            usuario: {
                id: entidadDestino._id,
                nombre: entidadDestino.nombre || entidadDestino.nombres,
                rol: entidadDestino.rol || entidadDestino.role || rol
            }
        });

    } catch (error) {
        console.error("🚨 [CIMCO-WALLET-FATAL] Error al ajustar saldo de billetera:", error);
        next(error);
    }
};

/**
 * 💰 Ajuste Manual de Saldo (Abono / Débito - CEO)
 * Permite abonar saldo o realizar devoluciones/débitos a cualquier usuario mediante actualización atómica $inc de Mongoose.
 */
export const recargarSaldo = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const targetId = req.params.id || req.body.id || req.body.uid;
        const { monto, tipoOperacion = 'RECARGA', motivo = 'Ajuste Gerencial' } = req.body;
        const adminId = req.user?.id || req.user?._id || 'ADMIN_CENTRAL';

        const montoNumerico = parseFloat(monto);
        if (!targetId || isNaN(montoNumerico) || montoNumerico <= 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ 
                success: false, 
                message: "⚠️ Debe proporcionar un ID de usuario válido y un monto mayor a 0." 
            });
        }

        // Evaluación de saldo previo para evitar inconsistencias o descubiertos en operaciones de débito
        const usuarioExistente = await Usuario.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
                { uid: targetId }
            ]
        }).session(session).lean();

        if (!usuarioExistente) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: "⚠️ Usuario no encontrado." });
        }

        const saldoAnterior = Number(usuarioExistente.saldoWallet ?? usuarioExistente.saldo ?? 0);
        let deltaSaldo = montoNumerico;

        // Validación estricta para Débito/Devolución
        if (tipoOperacion === 'DEBITO') {
            if (saldoAnterior < montoNumerico) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    message: `⚠️ Saldo insuficiente para realizar la devolución. Saldo disponible: $${saldoAnterior.toLocaleString('es-CO')} COP.`
                });
            }
            deltaSaldo = -montoNumerico;
        }

        // Normalización mediante un único operador $inc en la consulta Mongoose (Sincronización atómica de saldoWallet y saldo)
        const usuarioActualizado = await Usuario.findOneAndUpdate(
            { _id: usuarioExistente._id },
            { $inc: { saldoWallet: deltaSaldo, saldo: deltaSaldo } },
            { new: true, session }
        );

        const saldoNuevo = Number(usuarioActualizado.saldoWallet ?? usuarioActualizado.saldo ?? (saldoAnterior + deltaSaldo));

        // Registrar Historial auditable en MongoDB
        const nuevoHistorial = new HistorialSaldo({
            conductor: usuarioActualizado._id,
            usuarioId: usuarioActualizado._id,
            tipo: tipoOperacion === 'DEBITO' ? 'debito_manual' : 'recarga_manual',
            monto: deltaSaldo,
            saldoAnterior,
            saldoNuevo,
            referencia: `AJUSTE-${Date.now()}`,
            descripcion: tipoOperacion === 'DEBITO' 
                ? `Devolución de Saldo / Débito: ${motivo}` 
                : `Abono de Saldo / Recarga: ${motivo}`
        });
        await nuevoHistorial.save({ session });

        await session.commitTransaction();
        session.endSession();

        const docFirestoreId = usuarioActualizado.uid || usuarioActualizado._id.toString();

        // Espejo de Billetera en Firebase Firestore
        try {
            const pathBilleteras = FIRESTORE_PATHS?.wallets || 'billeteras';
            await dbFirestore.collection(pathBilleteras).doc(docFirestoreId).set({
                id: docFirestoreId,
                nombreUsuario: usuarioActualizado.nombre,
                saldo: saldoNuevo,
                saldoWallet: saldoNuevo,
                balance: saldoNuevo,
                ultimaActualizacion: new Date().toISOString()
            }, { merge: true });
        } catch (fsWalletErr) {
            console.warn("⚠️ [FIRESTORE-WALLET-WARN] Error actualizando billetera:", fsWalletErr.message);
        }

        // Auditoría centralizada en Firestore
        await registrarTransaccionFirestore({
            idUsuario: docFirestoreId,
            rol: usuarioActualizado.rol || usuarioActualizado.role || 'usuario',
            subrol: usuarioActualizado.subrol || 'general',
            monto: deltaSaldo,
            saldoAnterior,
            saldoNuevo,
            tipoOperacion: tipoOperacion === 'DEBITO' ? 'DEBITO_GERENCIAL' : 'RECARGA_GERENCIAL',
            autorizadoPor: adminId,
            referencia: `AJUSTE-${Date.now()}`
        });

        return res.status(200).json({
            success: true,
            message: tipoOperacion === 'DEBITO' 
                ? `Devolución de $${montoNumerico.toLocaleString('es-CO')} COP procesada. Nuevo saldo: $${saldoNuevo.toLocaleString('es-CO')} COP`
                : `Abono de $${montoNumerico.toLocaleString('es-CO')} COP acreditado. Nuevo saldo: $${saldoNuevo.toLocaleString('es-CO')} COP`,
            saldoNuevo,
            saldoActual: saldoNuevo,
            data: { saldoNuevo }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("❌ Error en recargarSaldo:", error);
        next(error);
    }
};

export default {
    obtenerDirectorioGlobal,
    obtenerUsuarios,
    validarRegistroUnico,
    registrarUsuario,
    crearUsuario,
    obtenerUsuarioPorId,
    actualizarUsuario,
    eliminarUsuario,
    obtenerDespachadores,
    asignarTerminalDespachador,
    obtenerSaldoDespachador,
    recargarSaldoDespachador,
    ajustarSaldoBilletera,
    recargarSaldo
};