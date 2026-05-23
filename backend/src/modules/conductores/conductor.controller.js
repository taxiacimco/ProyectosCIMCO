import mongoose from 'mongoose';
import Conductor from '../../models/Conductor.js';
import HistorialSaldo from '../../models/HistorialSaldo.js';

// 1. Controlador para registrar un nuevo conductor
export const registrarConductor = async (req, res) => {
    try {
        const { nombre, email, coordenadas, saldo } = req.body;

        const existeConductor = await Conductor.findOne({ email });
        if (existeConductor) {
            return res.status(400).json({
                success: false,
                message: 'El correo electrónico ya está registrado con otro conductor.'
            });
        }

        const nuevoConductor = new Conductor({
            nombre,
            email,
            coordenadas,
            saldo
        });

        await nuevoConductor.save();

        res.status(201).json({
            success: true,
            message: '🚀 ¡Mototaxi registrado con éxito en la nube de Atlas!',
            data: nuevoConductor
        });

    } catch (error) {
        console.error('❌ Error en registrarConductor:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al procesar el registro.',
            error: error.message
        });
    }
};

// 2. Controlador para obtener la lista de todos los conductores registrados
export const obtenerConductores = async (req, res) => {
    try {
        const conductores = await Conductor.find();
        
        res.status(200).json({
            success: true,
            count: conductores.length,
            data: conductores
        });
    } catch (error) {
        console.error('❌ Error en obtenerConductores:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la lista de conductores.',
            error: error.message
        });
    }
};

// 3. Obtener extracto o historial contable de un conductor específico
export const obtenerHistorialConductor = async (req, res) => {
    try {
        const { conductorId } = req.params;

        const historial = await HistorialSaldo.find({ conductorId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: historial.length,
            data: historial
        });
    } catch (error) {
        console.error('❌ Error en obtenerHistorialConductor:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el historial contable.',
            error: error.message
        });
    }
};

// 4. Módulo de Recargas AUTENTICADO con Token JWT
export const recargarBilleteraPorAdmin = async (req, res) => {
    try {
        const { usuarioId, rol, monto } = req.body;
        
        // Extraído quirúrgicamente del token validado por el middleware de seguridad
        const administradorId = req.usuario.id; 

        if (!monto || monto <= 0) {
            return res.status(400).json({
                success: false,
                message: 'El monto de la recarga debe ser un valor positivo mayor a cero.'
            });
        }

        let usuarioActualizado;
        let saldoAnterior = 0;

        if (rol === 'conductor') {
            const conductorPrevio = await Conductor.findById(usuarioId);
            if (!conductorPrevio) {
                return res.status(404).json({ success: false, message: 'El mototaxi no existe.' });
            }
            saldoAnterior = conductorPrevio.saldo;

            usuarioActualizado = await Conductor.findByIdAndUpdate(
                usuarioId,
                { $inc: { saldo: monto } },
                { new: true }
            );

            // Asentamos el movimiento con el ID del Admin que firmó el Token
            const registroRecarga = new HistorialSaldo({
                conductorId: usuarioId,
                viajeId: new mongoose.Types.ObjectId(), 
                tipo: 'recarga',
                monto: monto,
                saldoAnterior: saldoAnterior,
                saldoNuevo: usuarioActualizado.saldo,
                descripcion: `Recarga de saldo autorizada por el Administrador (ID Auth: ${administradorId}). Fondos inyectados: +$${monto} COP.`
            });
            await registroRecarga.save();

        } else if (rol === 'pasajero') {
            return res.status(200).json({
                success: true,
                message: `💸 [Módulo Seguro] Recarga de $${monto} pre-aprobada para Pasajero por el administrador.`
            });
        } else {
            return res.status(400).json({ success: false, message: 'Rol inválido. Use "conductor" o "pasajero".' });
        }

        res.status(200).json({
            success: true,
            message: `💰 ¡Recarga exitosa! Fondos acreditados bajo firma digital JWT del CEO.`,
            rolDestino: rol,
            saldoAnterior: saldoAnterior,
            nuevoSaldo: usuarioActualizado.saldo
        });

    } catch (error) {
        console.error('❌ Error en recargarBilleteraPorAdmin:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el motor financiero al procesar la recarga.',
            error: error.message
        });
    }
};