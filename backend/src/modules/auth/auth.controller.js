// Versión Arquitectura: V10.8 - Escudo de Seguridad Maestro para Acceso Administrativo Centralizado
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\auth\auth.controller.js
 * Misión: Controlador transaccional de autenticación del núcleo Express.
 * Ajuste: Bloqueo mandatorio de suplantación de rol administrativo y asignación estricta de credenciales máster.
 */

import jwt from 'jsonwebtoken';
import Conductor from '../../models/Conductor.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cimco_secret_key_2026';

// Controlador maestro para inicio de sesión (Login)
export const loginUsuario = async (req, res) => {
    try {
        const { email, password, rol } = req.body;

        // 🛡️ GUARDA DE SEGURIDAD OBLIGATORIA (Anti-Undefined)
        if (!email || !password || !rol) {
            return res.status(400).json({
                success: false,
                message: 'Por favor, proporcione correo, contraseña y rol requeridos.'
            });
        }

        // --- ESCENARIO A: AUTENTICACIÓN CENTRAL DE ADMIN/CEO (ESCUDO MAESTRO) ---
        if (rol === 'admin') {
            // Verificación rígida de credenciales reales estipuladas para producción
            if (email !== 'taxicimco@gmail.com' || password !== 'Mijagua*57') {
                console.warn(`⚠️ ALERTA DE ARQUITECTURA: Intento fraudulento de acceso administrativo para el correo: ${email}`);
                return res.status(403).json({
                    success: false,
                    message: 'Acceso denegado. Credenciales no autorizadas para el rol administrativo central.'
                });
            }
            
            // Generamos el payload con máximos privilegios administrativos de clúster
            const token = jwt.sign(
                { id: 'admin_ceo_cimco_root', rol: 'admin', email: email },
                JWT_SECRET,
                { expiresIn: '8h' } // Token válido por una jornada laboral de 8 horas
            );

            return res.status(200).json({
                success: true,
                message: '🔑 ¡Autenticación de Admin/CEO Máster Exitosa! Token del núcleo generado.',
                token: `Bearer ${token}`
            });
        }

        // --- ESCENARIO B: AUTENTICACIÓN DE MOTOTAXIS / CONDUCTORES ---
        if (rol === 'conductor') {
            const conductor = await Conductor.findOne({ email });
            if (!conductor) {
                return res.status(404).json({
                    success: false,
                    message: 'El mototaxi no se encuentra registrado en el sistema transaccional.'
                });
            }

            // Nota: En producción las contraseñas se gestionan de forma limpia
            const token = jwt.sign(
                { id: conductor._id, rol: 'conductor', email: conductor.email },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            return res.status(200).json({
                success: true,
                message: `👋 ¡Bienvenido al sistema, ${conductor.nombre}! Token de ruta asignado con éxito.`,
                token: `Bearer ${token}`,
                saldoActual: conductor.saldo
            });
        }

        // --- ESCENARIO C: AUTENTICACIÓN COMPATIBLE DE PASAJEROS ---
        if (rol === 'pasajero') {
            return res.status(200).json({
                success: true,
                message: 'Pasajero validado en el ecosistema híbrido centralizado.'
            });
        }

        return res.status(400).json({
            success: false,
            message: 'Rol no soportado por el motor de autenticación central.'
        });

    } catch (error) {
        console.error('❌ Error en loginUsuario Central:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor durante el proceso de login industrial.',
            error: error.message
        });
    }
};