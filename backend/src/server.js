// Versión Arquitectura: V4.3 - Consolidación de Políticas CORS y Gateways Operativos
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\server.js
 * Misión: Integración de red centralizada, habilitación explícita de CORS para Frontend Vite, montaje de enrutadores del núcleo y diagnóstico analítico.
 * Estatus: Producción / Estabilidad V9.3 - Preparado para flujos QR e Inyecciones de Tesorería.
 */
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

// 🚀 INYECCIÓN DE ENRUTADORES DEL SISTEMA
import authRoutes from './modules/auth/auth.routes.js';
import conductorRoutes from './modules/conductores/conductor.routes.js';
import viajeRoutes from './modules/viajes/viaje.routes.js';

dotenv.config();
const app = express();

// 🛡️ CONFIGURACIÓN CORS DE ARQUITECTURA (Inyección Atómica Aplicada)
const corsOptions = {
    origin: 'http://localhost:5173', // Permitir peticiones explícitas desde el puerto nativo de Vite
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Aplicación de middlewares globales antes de las rutas
app.use(cors(corsOptions));
app.use(express.json());

// 📡 MIDDLEWARE GLOBAL DE TELEMETRÍA (Diagnóstico de Payload)
app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log(`[CIMCO-TRAFFIC] ${req.method} ${req.originalUrl} | Payload Keys Recibidos:`, Object.keys(req.body));
    }
    next();
});

// 🟢 ENDPOINT DE DIAGNÓSTICO (Health Check)
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'CIMCO-CORE operando al 100%',
        timestamp: new Date().toISOString()
    });
});

// 🛣️ MONTAJE FORMAL DE ENRUTADORES EN EL BUS DE DATOS EXPRESS
app.use('/api/auth', authRoutes);
app.use('/api/conductores', conductorRoutes);
app.use('/api/viajes', viajeRoutes);

// URI Centralizada desde variables de entorno
const URI = process.env.MONGODB_URI;
const opcionesConexion = {
    serverSelectionTimeoutMS: 10000, 
    socketTimeoutMS: 45000,
    family: 4, 
    directConnection: false,
    retryWrites: true, 
    w: 'majority'      
};

/**
 * Función de conexión blindada de base de datos y escucha del puerto
 */
async function conectar() {
    console.log('📡 [CIMCO-DATABASE] Iniciando conexión blindada...');
    
    // 🛡️ GUARDA DE SEGURIDAD ANTI-UNDEFINED
    if (!URI) {
        console.error('⚠️ ALERTA DE ARQUITECTURA: MONGO_URI no está definida en el entorno.');
        return;
    }

    try {
        await mongoose.connect(URI, opcionesConexion);
        console.log('✅ [CIMCO-DATABASE] ¡CONEXIÓN ESTABLECIDA EXITOSAMENTE con MongoDB Atlas!');
        
        // 🔍 DIAGNÓSTICO DE TELEMETRÍA VISUAL
        console.log('🛣️ [CIMCO-TELEMETRÍA] Gateways Operativos en el Bus de Express:');
        console.log('   ├─ GET  /api/health (Endpoint de Diagnóstico)');
        console.log('   ├─ ALL  /api/auth/*');
        console.log('   ├─ ALL  /api/conductores/*');
        console.log('   └─ ALL  /api/viajes/*');

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🚀 [CIMCO-CORE] Servidor industrial operando con éxito en el puerto ${PORT}`);
        });

    } catch (error) {
        console.error('❌ ERROR CRÍTICO DE RED:', error.message);
    }
}

conectar();