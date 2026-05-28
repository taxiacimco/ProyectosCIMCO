// Versión Arquitectura: V3.14 - Consolidación de Gateways Operativos y Blindaje de Conexión Industrial
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\server.js
 * Misión: Integración de red centralizada, habilitación de CORS, montaje de enrutadores del núcleo y diagnóstico analítico.
 * Estatus: Producción / Estabilidad V9.3.
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

// 🛡️ CONFIGURACIÓN CORS DE ARQUITECTURA
const corsOptions = {
    origin: 'http://localhost:5173', // Origen explícito de tu frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Aplicación de middlewares globales antes de las rutas
app.use(cors(corsOptions));
app.use(express.json());

// 🟢 ENDPOINT DE DIAGNÓSTICO (Health Check)
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'CIMCO-CORE operando al 100%',
        timestamp: new Date().toISOString()
    });
});

// 🛣️ MONTAJE FORMAL DE ENRUTADORES EN EL BUS DE DATOS EXPRESS
// 🛡️ Guarda de Seguridad Anti-Undefined implícita al enrutar
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