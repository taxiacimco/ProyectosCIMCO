// Versión Arquitectura: V12.1 - Inyección Atómica de Modelo Pasajero y Corrección de ReferenceError
/**
 * Ubicación: backend/src/modules/auth/auth.controller.js
 * Misión: Controlador transaccional del núcleo Express con soporte polimórfico de Login y Registro Dual.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Conductor from '../../models/Conductor.js';
// 🚀 INYECCIÓN QUIRÚRGICA (Anti-Crash): Importación del modelo Pasajero requerida para operaciones DB.
import Pasajero from '../../models/Pasajero.js'; 

const JWT_SECRET = process.env.JWT_SECRET || 'Cimco_Master_Key_Secret_Tokens_2026_LaJagua';

/**
 * 🛰️ CONTROLADOR 1: LOGUEAR USUARIOS (Manteniendo la lógica máster intacta)
 */
export const loginUsuario = async (req, res) => {
    try {
        // 🛡️ GUARDA DE SEGURIDAD 1: (Anti-Undefined)
        if (!req.body) {
            return res.status(400).json({ success: false, message: 'Cuerpo de petición vacío u omitido.' });
        }

        const { email, identifier, password, rol } = req.body;
        const inputUser = (identifier || email || '').trim().toLowerCase();
        const rolLimpio = (rol || '').trim().toLowerCase();

        console.log(`[CIMCO-TELEMETRÍA] Intento de acceso en canal central para: ${inputUser} con rol [${rolLimpio}]`);

        // ESCENARIO CRÍTICO MÁSTER: Credencial Suprema del CEO
        if (inputUser === 'admin_master_cimco' && password === 'CimcoMaster2026!') {
            console.log('👑 [CIMCO-TELEMETRÍA] ¡ACCESO RAÍZ DETECTADO! Activando privilegios totales de infraestructura.');
            const tokenMaster = jwt.sign(
                { id: 'master_root_ceo', rol: 'admin' }, 
                JWT_SECRET, 
                { expiresIn: '2h' }
            );
            return res.status(200).json({
                success: true,
                message: 'Terminal Suprema activada con privilegios root.',
                token: tokenMaster,
                usuario: { id: 'master_root_ceo', nombre: 'CEO Principal Infraestructura', email: 'admin_master_cimco', rol: 'admin' }
            });
        }

        // CONTROLADOR DE ACCESO: CONDUCTORES (Vía MongoDB Atlas Mongoose)
        if (rolLimpio === 'conductor') {
            const conductor = await Conductor.findOne({ email: inputUser });
            if (!conductor) {
                console.log(`[CIMCO-TELEMETRÍA] ✕ Conductor '${inputUser}' no hallado en la base de datos.`);
                return res.status(401).json({ success: false, message: 'Las credenciales operativas no figuran en nuestro nodo central.' });
            }

            const passwordValido = await bcrypt.compare(password, conductor.password);
            if (!passwordValido) {
                console.log(`[CIMCO-TELEMETRÍA] ✕ Falla de contraseña para el conductor '${inputUser}'.`);
                return res.status(401).json({ success: false, message: 'Las credenciales operativas no figuran en nuestro nodo central.' });
            }

            console.log(`[CIMCO-TELEMETRÍA] ✓ Conductor '${inputUser}' autenticado de manera exitosa.`);
            const tokenConductor = jwt.sign(
                { id: conductor._id, rol: 'conductor' }, 
                JWT_SECRET, 
                { expiresIn: '24h' }
            );

            return res.status(200).json({
                success: true,
                message: 'Acceso autorizado al nodo de operaciones del conductor.',
                token: tokenConductor,
                usuario: { id: conductor._id, nombre: conductor.nombre, email: conductor.email, rol: 'conductor' }
            });
        }

        // CONTROLADOR DE ACCESO: PASAJEROS (Modo Adaptativo con Bypass Híbrido)
        if (rolLimpio === 'pasajero') {
            console.log('[CIMCO-TELEMETRÍA] 🧑‍🤝‍🧑 Nodo pasajero detectado (Modo Bypass Híbrido).');
            
            // 🛡️ GUARDA DE SEGURIDAD 2: Verificación de Existencia de Pasajero en DB Central (Mongoose) antes de aprobar
            const pasajeroRegistrado = await Pasajero.findOne({ telefono: inputUser });
            
            if (!pasajeroRegistrado) {
                 console.log(`[CIMCO-TELEMETRÍA] ✕ Pasajero con número '${inputUser}' no localizado en el nodo maestro.`);
                 return res.status(404).json({ success: false, message: 'El número telefónico no está registrado en el ecosistema.' });
            }
            
            const passwordValido = await bcrypt.compare(password, pasajeroRegistrado.password);
            if (!passwordValido) {
                console.log(`[CIMCO-TELEMETRÍA] ✕ Falla de validación criptográfica (password) para el pasajero.`);
                return res.status(401).json({ success: false, message: 'Credenciales de acceso inválidas.' });
            }

            const tokenPasajero = jwt.sign(
                { id: pasajeroRegistrado._id, rol: 'pasajero' }, 
                JWT_SECRET, 
                { expiresIn: '24h' }
            );

            return res.status(200).json({
                success: true,
                message: 'Pasajero validado en el ecosistema híbrido centralizado.',
                token: tokenPasajero,
                usuario: { 
                    id: pasajeroRegistrado._id,
                    nombre: pasajeroRegistrado.nombre, 
                    email: pasajeroRegistrado.email, 
                    rol: 'pasajero' 
                }
            });
        }

        return res.status(400).json({
            success: false,
            message: 'Rol no soportado por el motor de autenticación central.'
        });

    } catch (error) {
        console.error('❌ Error Crítico en pasarela de Login Central:', error);
        return res.status(500).json({ success: false, message: 'Fallo catastrófico en el nodo central de autenticación.' });
    }
};

/**
 * 🛰️ CONTROLADOR 2: REGISTRAR USUARIOS (Cierre de Círculo Dual Firebase + MongoDB)
 */
export const registrarUsuario = async (req, res) => {
    try {
        const { nombre, telefono, email, password, rol } = req.body;
        const rolLimpio = (rol || 'pasajero').trim().toLowerCase();

        console.log(`[CIMCO-REGISTRO] Solicitud de inserción dual recibida para: ${email || telefono} [Rol: ${rolLimpio}]`);

        // Encriptación de seguridad reglamentaria para persistencia interna
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let usuarioGuardado = null;

        if (rolLimpio === 'conductor') {
            // Verificar duplicados en la colección de Conductores
            const existeConductor = await Conductor.findOne({ email: email.toLowerCase() });
            if (existeConductor) {
                return res.status(400).json({ success: false, message: 'El correo operativo ya se encuentra asignado a un Conductor.' });
            }

            usuarioGuardado = await Conductor.create({
                nombre,
                email: email.toLowerCase(),
                telefono,
                password: hashedPassword,
                role: 'conductor',
                estado: 'activo'
            });
        } else {
            // Predeterminado: Registro en la colección de Pasajeros
            const existePasajero = await Pasajero.findOne({ telefono });
            if (existePasajero) {
                return res.status(400).json({ success: false, message: 'El número telefónico ya se encuentra registrado en el nodo de pasajeros.' });
            }

            usuarioGuardado = await Pasajero.create({
                nombre,
                telefono,
                email: (email || `${telefono}@taxiacimco.com`).toLowerCase(),
                password: hashedPassword,
                role: 'pasajero'
            });
        }

        return res.status(201).json({
            success: true,
            message: `Registro inyectado con éxito en el nodo MongoDB (${rolLimpio}).`,
            usuario: {
                id: usuarioGuardado._id,
                nombre: usuarioGuardado.nombre,
                rol: rolLimpio
            }
        });

    } catch (error) {
        console.error('❌ Error Crítico en nodo de Registro Express:', error);
        return res.status(500).json({ success: false, message: 'Error interno al sincronizar el usuario en el clúster central.' });
    }
};