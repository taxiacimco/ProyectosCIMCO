// Versión Arquitectura: V16.5 - Controlador de Usuarios y Despachadores de Terminal
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\usuarios\usuario.controller.js
 * Misión: Control unificado de usuarios (Admin, Despachador, Pasajero, Staff) y asignación de terminales.
 */

import mongoose from 'mongoose';
import Usuario from '../../models/Usuario.js';

// ==================================================================
// 1. GESTIÓN GENERAL DE USUARIOS
// ==================================================================

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

export const obtenerUsuarioPorId = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid;
        if (!targetId) {
            return res.status(400).json({ success: false, message: "⚠️ Identificador ausente." });
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

        return res.status(200).json({ success: true, data: usuario });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const actualizarUsuario = async (req, res) => {
    try {
        const targetId = req.params.id || req.params.uid;
        const updateData = { ...req.body };
        
        delete updateData.password; // Evitar mutación directa de credenciales sin hash

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

        return res.status(200).json({ success: true, message: 'Usuario actualizado correctamente', data: usuario });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================================================================
// 2. GESTIÓN ESPECÍFICA DE DESPACHADORES Y TERMINALES
// ==================================================================

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

export const asignarTerminalDespachador = async (req, res) => {
    try {
        const { despachadorId, terminal_id, codigoDespachador } = req.body;

        if (!despachadorId || !terminal_id) {
            return res.status(400).json({ success: false, message: "⚠️ `despachadorId` y `terminal_id` son requeridos." });
        }

        const usuario = await Usuario.findOneAndUpdate(
            {
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(despachadorId) ? despachadorId : null },
                    { uid: despachadorId }
                ]
            },
            { 
                $set: { 
                    terminal_id, 
                    codigoDespachador: codigoDespachador || `DSP-${Date.now().toString().slice(-4)}`
                } 
            },
            { new: true }
        ).select('-password').lean();

        if (!usuario) {
            return res.status(404).json({ success: false, message: "Despachador no encontrado." });
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