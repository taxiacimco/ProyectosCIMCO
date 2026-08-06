import { Router } from 'express';
import { exportarDirectorioExcel } from './excel.controller.js';
import { verificarToken, esAdminCentral } from '../../middleware/auth.middleware.js';

const router = Router();

// Ruta protegida: Solo administradores centrales pueden descargar el directorio global
router.get('/directorio', verificarToken, esAdminCentral, exportarDirectorioExcel);

export default router;