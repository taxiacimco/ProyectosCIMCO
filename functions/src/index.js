import { loadEnv } from './config/env/env.loader.js';
loadEnv(); 

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { onRequest } from "firebase-functions/v2/https";

// Inicialización de Firebase Admin
import './firebase/firebase-init.js'; 
import mainRouter from './routes/main.router.js';

const app = express();

// Middlewares de seguridad y utilidad
app.use(helmet({ crossOriginResourcePolicy: false })); 

app.use(cors({ 
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(morgan('dev')); 
app.use(express.json()); 

// Rutas principales
app.use('/api', mainRouter);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Ruta [${req.method}] ${req.originalUrl} no encontrada en TAXIA CIMCO.` 
  });
});

/**
 * EXPORTACIÓN PARA FIREBASE
 * Esta es la entrada que el emulador y Google Cloud usan.
 */
export const api = onRequest({
  region: "us-central1",
  memory: "256MiB",
  maxInstances: 10,
  cors: true 
}, app);

/**
 * SERVIDOR PARA DESARROLLO LOCAL (Standalone)
 * Solo se activa si NO estamos dentro del emulador de Firebase o Cloud Functions.
 */
const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
const isCloudFunctions = !!process.env.FUNCTION_TARGET || !!process.env.FUNCTION_NAME;

if (!isEmulator && !isCloudFunctions) {
  const PORT = process.env.PORT || 8123;
  app.listen(PORT, () => {
    console.log('---------------------------------------------------------');
    console.log(`🚀 TAXIA CIMCO API (Standalone): http://localhost:${PORT}`);
    console.log('---------------------------------------------------------');
  });
}