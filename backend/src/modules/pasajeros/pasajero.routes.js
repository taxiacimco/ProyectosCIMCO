// Versión Arquitectura: V20.06 - Sanitización y Preservación de Identificadores (_id / uid) en Payload y Parámetros de Rutas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\pasajeros\pasajero.routes.js
 * Misión: Exposición de endpoints para perfil, direcciones favoritas, historial, registro y billetera virtual de pasajeros con protección integral JWT para mutaciones.
 * Ajuste V20.06: Implementación de middleware de sanitización y preservación estricta de identificadores (_id, uid, id, usuarioId) en req.body, req.params y req.query para garantizar la consistencia en el emparejamiento entre colecciones.
 */

import { Router } from 'express';
import multer from 'multer';
import { 
    obtenerPasajeros,
    registrarPasajero,
    validarPasajeroUnico,
    obtenerPerfilPasajero, 
    actualizarPerfilPasajero, 
    agregarDireccionFavorita, 
    eliminarDireccionFavorita,
    obtenerHistorialViajesPasajero,
    obtenerSaldoPasajero,
    recargarSaldoPasajero
} from './pasajero.controller.js';
import { verificarToken, esAdmin } from '../../middleware/auth.middleware.js';

const router = Router();

/**
 * 🛡️ Middleware de Sanitización y Preservación de Identificadores (_id, uid, id, pasajeroId, usuarioId)
 * Garantiza que los identificadores de MongoDB y Firebase Auth se mantengan intactos, limpios de espacios
 * en blanco y sin transformaciones destructivas que rompan el cruce relacional en controladores.
 */
const sanitizarIdentificadoresPayload = (req, res, next) => {
    const sanitizarColeccion = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        const camposTarget = ['_id', 'uid', 'id', 'pasajeroId', 'usuarioId', 'targetId', 'direccionId'];
        
        camposTarget.forEach((campo) => {
            if (obj[campo] !== undefined && obj[campo] !== null) {
                if (typeof obj[campo] === 'string') {
                    const valorLimpio = obj[campo].trim();
                    if (valorLimpio.length > 0) {
                        obj[campo] = valorLimpio;
                    }
                }
            }
        });
    };

    try {
        if (req.params) sanitizarColeccion(req.params);
        if (req.body) sanitizarColeccion(req.body);
        if (req.query) sanitizarColeccion(req.query);
    } catch (err) {
        console.error('⚠️ [PASAJERO-ROUTES-SANITY] Error al sanitizar identificadores de la petición:', err);
    }

    next();
};

// Aplicación global del middleware de sanitización de identificadores para todas las rutas del módulo
router.use(sanitizarIdentificadoresPayload);

// 📷 CONFIGURACIÓN DE MULTER (Manejo de archivos multimedia binarios)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // Límite de 5MB por archivo
    },
    fileFilter: (req, file, cb) => {
        if (file && file.mimetype && file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('⚠️ El archivo enviado debe ser una imagen válida (JPEG, PNG, WEBP).'), false);
        }
    }
});

// Middleware helper que procesa upload.single de forma opcional (no interrumpe solicitudes puramente JSON)
const cargaFotoPerfilOpcional = (req, res, next) => {
    const uploadSingle = upload.fields([
        { name: 'fotoPerfil', maxCount: 1 },
        { name: 'foto_perfil', maxCount: 1 },
        { name: 'file', maxCount: 1 }
    ]);

    uploadSingle(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                code: 'MULTER_ERROR',
                message: `⚠️ Error en la subida de la imagen: ${err.message}`
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_FILE_TYPE',
                message: err.message
            });
        }
        next();
    });
};

// 📋 LECTURA GLOBAL DEDUPLICADA (ADMINISTRATIVA)
router.get('/', verificarToken, esAdmin, obtenerPasajeros);

// 📝 REGISTRO Y VALIDACIÓN DE UNICIDAD DE PASAJEROS (Soporte Multipart Opcional)
router.post('/', cargaFotoPerfilOpcional, validarPasajeroUnico, registrarPasajero);
router.post('/registro', cargaFotoPerfilOpcional, validarPasajeroUnico, registrarPasajero);
router.post('/registrar', cargaFotoPerfilOpcional, validarPasajeroUnico, registrarPasajero);
router.post('/validar-unico', validarPasajeroUnico);

// 💰 RUTAS DE SALDO Y BILLETERA (Protegidas con JWT)
router.get('/saldo/me', verificarToken, obtenerSaldoPasajero);
router.get('/saldo/:id', verificarToken, obtenerSaldoPasajero);
router.get('/saldo/uid/:uid', verificarToken, obtenerSaldoPasajero);
router.post('/saldo/recargar', verificarToken, esAdmin, recargarSaldoPasajero);

// 👤 GESTIÓN DE PERFIL CON ALIAS DE COMPATIBILIDAD Y PROTECCIÓN JWT
router.get('/perfil', verificarToken, obtenerPerfilPasajero);
router.put('/perfil', verificarToken, cargaFotoPerfilOpcional, actualizarPerfilPasajero);
router.patch('/perfil', verificarToken, cargaFotoPerfilOpcional, actualizarPerfilPasajero);

// 📍 GESTIÓN DE DIRECCIONES FAVORITAS (Protegidas con JWT)
router.post('/direcciones', verificarToken, agregarDireccionFavorita);
router.delete('/direcciones/:direccionId', verificarToken, eliminarDireccionFavorita);

// 📜 HISTORIAL DE TRAYECTOS
router.get('/historial/viajes', verificarToken, obtenerHistorialViajesPasajero);

// 🔍 RUTAS DINÁMICAS Y COMPATIBILIDAD CON ID / UID DE PARÁMETRO (Protegidas con JWT)
router.get('/:id', verificarToken, obtenerPerfilPasajero);
router.put('/:id', verificarToken, cargaFotoPerfilOpcional, actualizarPerfilPasajero);
router.patch('/:id', verificarToken, cargaFotoPerfilOpcional, actualizarPerfilPasajero);
router.post('/:id/direcciones', verificarToken, agregarDireccionFavorita);
router.delete('/:id/direcciones/:direccionId', verificarToken, eliminarDireccionFavorita);
router.get('/:id/historial', verificarToken, obtenerHistorialViajesPasajero);

export default router;