// Versión Arquitectura: V20.0 - Integración Opción Multer/Upload Middleware para Gestión Multimedia de Perfil
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\pasajeros\pasajero.routes.js
 * Misión: Exposición de endpoints para perfil, direcciones favoritas, historial, registro y billetera virtual de pasajeros.
 * Ajuste V20.0: Integración condicional y segura de middleware de carga multipart/form-data (Multer) en endpoints de perfil y registro ('/perfil', '/:id', '/', '/registro'), permitiendo la recepción transparente de binarios de imagen (foto_perfil / fotoPerfil) manteniendo compatibilidad con payloads JSON.
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

// 📷 CONFIGURACIÓN DE MULTER (Manejo de archivos multimedia binarios)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // Límite de 5MB por archivo
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
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

// 💰 RUTAS DE SALDO Y BILLETERA (Definidas antes de parámetros dinámicos)
router.get('/saldo/me', verificarToken, obtenerSaldoPasajero);
router.get('/saldo/:id', verificarToken, obtenerSaldoPasajero);
router.post('/saldo/recargar', verificarToken, esAdmin, recargarSaldoPasajero);

// 👤 GESTIÓN DE PERFIL CON ALIAS DE COMPATIBILIDAD Y SOPORTE DE IMÁGENES
router.get('/perfil', verificarToken, obtenerPerfilPasajero);
router.put('/perfil', verificarToken, cargaFotoPerfilOpcional, actualizarPerfilPasajero);

// 📍 GESTIÓN DE DIRECCIONES FAVORITAS
router.post('/direcciones', verificarToken, agregarDireccionFavorita);
router.delete('/direcciones/:direccionId', verificarToken, eliminarDireccionFavorita);

// 📜 HISTORIAL DE TRAYECTOS
router.get('/historial/viajes', verificarToken, obtenerHistorialViajesPasajero);

// 🔍 RUTAS DINÁMICAS Y COMPATIBILIDAD CON ID DE PARÁMETRO
router.get('/:id', verificarToken, obtenerPerfilPasajero);
router.put('/:id', verificarToken, cargaFotoPerfilOpcional, actualizarPerfilPasajero);
router.post('/:id/direcciones', verificarToken, agregarDireccionFavorita);
router.delete('/:id/direcciones/:direccionId', verificarToken, eliminarDireccionFavorita);
router.get('/:id/historial', verificarToken, obtenerHistorialViajesPasajero);

export default router;