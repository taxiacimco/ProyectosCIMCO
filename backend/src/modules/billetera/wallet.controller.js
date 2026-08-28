// Versión Arquitectura: V1.1 - Optimización de rendimiento mediante consultas paralelizadas con Promise.all() en wallet.controller.js

/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\billetera\wallet.controller.js
 * Misión: Proveer el controlador de saldo de billetera bajo sintaxis ES Modules nativa (`export const obtenerSaldo`),
 * optimizando la latencia de respuesta mediante la ejecución concurrente de lecturas en la base de datos via Promise.all().
 */

import mongoose from 'mongoose';

export const obtenerSaldo = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.uid;
        if (!userId) {
            return res.status(401).json({ success: false, message: "No autorizado. Token inválido o ausente." });
        }

        const db = mongoose.connection.db;
        if (!db) {
            return res.status(503).json({ success: false, message: "Base de datos no inicializada" });
        }

        // Paralelización de consultas secuenciales por UID
        const [usuarioUid, pasajeroUid, conductorUid] = await Promise.all([
            db.collection('usuarios').findOne({ uid: userId }),
            db.collection('pasajeros').findOne({ uid: userId }),
            db.collection('conductores').findOne({ uid: userId })
        ]);

        let usuario = usuarioUid || pasajeroUid || conductorUid;

        if (!usuario) {
            // Intento secundario paralelizado buscando por ObjectId si el uid no arrojó resultados
            try {
                if (mongoose.Types.ObjectId.isValid(userId)) {
                    const objectId = new mongoose.Types.ObjectId(userId);
                    const [usuarioId, pasajeroId, conductorId] = await Promise.all([
                        db.collection('usuarios').findOne({ _id: objectId }),
                        db.collection('pasajeros').findOne({ _id: objectId }),
                        db.collection('conductores').findOne({ _id: objectId })
                    ]);
                    usuario = usuarioId || pasajeroId || conductorId;
                }
            } catch (e) {
                // El ID no tiene formato ObjectId válido, se ignora
            }
        }

        if (!usuario) {
            return res.status(404).json({ success: false, message: "Usuario no encontrado en los registros del sistema." });
        }

        const saldoActual = usuario.saldo ?? usuario.billetera?.saldo ?? 0;

        return res.status(200).json({
            success: true,
            saldo: saldoActual,
            moneda: 'COP'
        });

    } catch (error) {
        console.error("🚨 [WALLET-CONTROLLER-ERROR]:", error);
        return res.status(500).json({ success: false, error: error?.message || "Error interno del servidor al consultar saldo." });
    }
};