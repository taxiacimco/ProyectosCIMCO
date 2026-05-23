import express from 'express';
import { loginUsuario } from './auth.controller.js';

const router = express.Router();

// Ruta POST: /api/auth/login
router.post('/login', loginUsuario);

export default router;