// Versión Arquitectura: V2.2 - Inyección de Telemetría con Blindaje Anti-Undefined
/**
 * Ubicación: backend/src/modules/conductores/conductor.controller.js
 * Misión: Gestión de conductores, telemetría de estado y recargas blindadas.
 */

import mongoose from 'mongoose';
import Conductor from '../../models/Conductor.js';
import HistorialSaldo from '../../models/HistorialSaldo.js';

// 📡 FUNCIÓN DE TELEMETRÍA: Obtener conductores activos
export const obtenerConductoresDisponibles = async (req, res) => {
    try {
        // 🛡️ GUARDA DE SEGURIDAD (Anti-Undefined)
        const disponibles = await Conductor.find({ estado: 'active' }).lean();
        
        if (!disponibles) {
            return res.status(404).json({ success: false, message: "No se encontraron conductores activos." });
        }

        res.status(200).json({ 
            success: true, 
            count: disponibles.length, 
            data: disponibles 
        });
    } catch (error) {
        console.error('❌ Error en telemetría de conductores:', error);
        res.status(500).json({ success: false, message: "Error en telemetría de conductores", error: error.message });
    }
};

export const registrarConductor = async (req, res) => {
    try {
        const { nombre, email, coordenadas, saldo, conductorId } = req.body;

        // 🛡️ GUARDA ANTI-UNDEFINED
        if (!nombre || !email) {
            return res.status(400).json({ success: false, message: 'Nombre y email son obligatorios.' });
        }

        const emailLimpio = email.trim().toLowerCase();
        const existeConductor = await Conductor.findOne({ email: emailLimpio });
        if (existeConductor) {
            return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado.' });
        }

        const nuevoConductor = new Conductor({
            conductorId: conductorId || `DRV-${Math.floor(Math.random() * 10000)}`,
            nombre: nombre.trim(),
            email: emailLimpio,
            coordenadas: coordenadas || { type: 'Point', coordinates: [-73.33, 9.55] },
            saldo: typeof saldo === 'number' && saldo >= 0 ? saldo : 0,
            estado: 'active'
        });

        await nuevoConductor.save();
        res.status(201).json({ success: true, data: nuevoConductor });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno de servidor', error: error.message });
    }
};

export const obtenerConductores = async (req, res) => {
    try {
        const lista = await Conductor.find({});
        res.status(200).json({ success: true, data: lista });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener conductores' });
    }
};

export const obtenerHistorialConductor = async (req, res) => {
    try {
        const { conductorId } = req.params;
        const historial = await HistorialSaldo.find({ conductorId });
        res.status(200).json({ success: true, data: historial });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener historial' });
    }
};

export const recargarBilleteraPorAdmin = async (req, res) => {
    try {
        const { conductorId, monto, administradorId, rol } = req.body;

        if (!conductorId || !monto || monto <= 0) {
            return res.status(400).json({ success: false, message: 'Datos de recarga inválidos.' });
        }

        const conductorPrevio = await Conductor.findOne({ conductorId });
        if (!conductorPrevio) {
            return res.status(404).json({ success: false, message: 'Conductor no encontrado.' });
        }

        const saldoAnterior = conductorPrevio.saldo || 0;
        
        if (rol === 'conductor') {
            const usuarioActualizado = await Conductor.findOneAndUpdate(
                { conductorId },
                { $inc: { saldo: monto } },
                { new: true }
            );

            const registroRecarga = new HistorialSaldo({
                conductorId: conductorPrevio.conductorId || conductorPrevio._id,
                viajeId: new mongoose.Types.ObjectId(), 
                tipo: 'recarga',
                monto: monto,
                saldoAnterior: saldoAnterior,
                saldoNuevo: usuarioActualizado.saldo,
                descripcion: `Recarga de saldo autorizada por el Administrador (ID: ${administradorId}). +$${monto} COP.`
            });
            await registroRecarga.save();

            res.status(200).json({
                success: true,
                message: `💰 ¡Recarga exitosa!`,
                nuevoSaldo: usuarioActualizado.saldo
            });
        } else {
            res.status(400).json({ success: false, message: 'Rol inválido.' });
        }
    } catch (error) {
        console.error('❌ Error en recargarBilleteraPorAdmin:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};