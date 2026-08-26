// Versión Arquitectura: V1.0 - Conversión de wallet.controller.js a ES Modules con exportación nativa
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\billetera\wallet.controller.js
 * Misión: Proveer el controlador de saldo de billetera bajo sintaxis ES Modules nativa (`export const obtenerSaldo`), 
 * resolviendo el error de importación en el archivo de rutas.
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

        let usuario = await db.collection('usuarios').findOne({ uid: userId }) ||
                      await db.collection('pasajeros').findOne({ uid: userId }) ||
                      await db.collection('conductores').findOne({ uid: userId });

        if (!usuario) {
            // Intento secundario buscando por ObjectId si el uid no arrojó resultados
            try {
                const objectId = new mongoose.Types.ObjectId(userId);
                usuario = await db.collection('usuarios').findOne({ _id: objectId }) ||
                          await db.collection('pasajeros').findOne({ _id: objectId }) ||
                          await db.collection('conductores').findOne({ _id: objectId });
            } catch (e) {
                // El ID no tiene formato ObjectId válido, se ignora
            }
        }

        if (!usuario) {
            return res.status(404).json({ success: false, message: "Usuario no encontrado en los registros del sistema." });
        }

        const saldoActual = usuario.saldo || usuario.billetera?.saldo || 0;

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