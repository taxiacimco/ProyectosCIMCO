// Versión Arquitectura: V10.4 - Consolidación de Rutas Híbridas y Blindaje CORS
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { conectarDB } from './config/db.js';
import conductorRoutes from './modules/conductores/conductor.routes.js';
import viajeRoutes from './modules/viajes/viaje.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import Viaje from './models/Viaje.js';

dotenv.config();

const app = express();

// 🛡️ CONTROL DE ACCESO GLOBAL (CORS) - BLINDAJE DE SEGURIDAD
const allowedOrigins = [
    'http://localhost:5173',
    'https://globosely-appreciative-zander.ngrok-free.dev'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('⚠️ Acceso bloqueado por política CORS de CIMCO'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 🔌 Inyección de Módulos Core
app.use('/api/auth', authRoutes);
app.use('/api/conductores', conductorRoutes);
app.use('/api/viajes', viajeRoutes);

// Ruta Health Check
app.get('/api/health', (req, res) => {
    res.json({ success: true, status: "online", core: "TAXIA-CIMCO-BACKEND" });
});

const PORT = process.env.PORT || 3000;
conectarDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 TAXIA-CIMCO CORE ACTIVO EN PUERTO: ${PORT}`);
    });
});