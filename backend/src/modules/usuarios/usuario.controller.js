// Versión Arquitectura: V16.10 - Sincronización Firestore y Control Unificado de Usuarios/Despachadores
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\usuarios\usuario.controller.js
 * Misión: Control unificado de usuarios (Admin, Despachador, Pasajero, Staff) y asignación de terminales.
 * Ajuste V16.10: Formateo estricto de identificadores, sanitización defensiva de datos y réplica síncrona en Firestore.
 */

import mongoose from 'mongoose';
import Usuario from '../../models/Usuario.js';
import { dbFirestore, FIRESTORE_PATHS } from '../../config/firebase.js';

// ==================================================================
// 1. GESTIÓN GENERAL DE USUARIOS
// ==================================================================

/**
 * 📋 Obtener listado de usuarios filtrado opcionalmente por rol
 */
export const obtenerUsuarios = async (req, res) => {
    try {
        const { rol } = req.query;
        const filtro = {};

        if (rol) {
            filtro.$or = [{ rol }, { role: rol }];
        }

        const usuarios = await Usuario.find(filtro).select('-password').lean();
        return res.status(200).json({ success: true, contador: usuarios.length, data: usuarios });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 👤 Obtener usuario por ID, UID o desde la sesión activa (req.user)
 */
export const obtenerUsuarioPorId = async (req, res) => {
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
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 🔄 Actualizar datos de usuario con sincronización a Firestore
 */
export const actualizarUsuario = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid || req.user?.id || req.user?._id || req.user?.uid;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador de usuario ausente para actualización." });
        }

        const updateData = { ...req.body };
        delete updateData.password; // Prevenir mutación directa de credenciales sin hash

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
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 🗑️ Eliminar usuario por ID o UID
 */
export const eliminarUsuario = async (req, res) => {
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
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================================================================
// 2. GESTIÓN ESPECÍFICA DE DESPACHADORES Y TERMINALES
// ==================================================================

/**
 * 🎧 Obtener todos los usuarios con rol de despachador
 */
export const obtenerDespachadores = async (req, res) => {
    try {
        const despachadores = await Usuario.find({
            $or: [{ rol: 'despachador' }, { role: 'despachador' }]
        }).select('-password').lean();

        return res.status(200).json({ success: true, contador: despachadores.length, data: despachadores });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 🏢 Asignar Terminal y Código Operativo a Despachador (con réplica a Firestore)
 */
export const asignarTerminalDespachador = async (req, res) => {
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
        return res.status(500).json({ success: false, message: error.message });
    }
};