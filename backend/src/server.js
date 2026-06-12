// Versión Arquitectura: V4.4 - Actualización de Directivas CORS para Orígenes Híbridos (Vite & Ngrok)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\server.js
 * Misión: Integración de red centralizada, habilitación explícita de CORS multiplexado para Frontend Vite y túneles Ngrok, montaje de enrutadores del núcleo y diagnóstico analítico.
 * Estatus: Producción / Estabilidad V9.3 - Preparado para flujos QR, Inyecciones de Tesorería y Handshakes seguros.
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
// Se expande la matriz de orígenes para permitir el desarrollo local y el puente de telemetría por Ngrok
const corsOptions = {
    origin: [
        'http://localhost:5173', 
        'https://globosely-appreciative-zander.ngrok-free.dev'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Aplicación de middlewares globales antes de las rutas
app.use(cors(corsOptions));
app.use(express.json());

// 📡 MIDDLEWARE GLOBAL DE TELEMETRÍA (Diagnóstico de Payload Preservado)
app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log(`[CIMCO-TRAFFIC] ${req.method} ${req.originalUrl} | Payload Keys Recibidos:`, Object.keys(req.body));
    }
    next();
});

// 🟢 ENDPOINT DE DIAGNÓSTICO DE SALUD PERIMETRAL (Health Check)
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'CIMCO-CORE operando al 100%',
        timestamp: new Date().toISOString(),
        ecosistema: 'TAXIA CIMCO',
        nodo: 'La Jagua de Ibirico'
    });
});

// 🛣️ MONTAJE FORMAL DE ENRUTADORES EN EL BUS DE DATOS EXPRESS
app.use('/api/auth', authRoutes);
app.use('/api/conductores', conductorRoutes);
app.use('/api/viajes', viajeRoutes);

// 🔌 CAPA DE CONEXIÓN DE DATOS Y ENTORNO INDUSTRIAL
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

        // Preservamos el puerto 3000 de la arquitectura original para evitar fallos de enlace
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🚀 [CIMCO-CORE] Servidor industrial operando con éxito en el puerto ${PORT}`);
            console.log(`🌐 [CIMCO-CORS] Aduana de Red configurada para: [${corsOptions.origin.join(', ')}]`);
        });

    } catch (error) {
        console.error('❌ [CIMCO-CORRUPCIÓN] Fallo crítico en el arranque del ecosistema:', error.message);
        process.exit(1);
    }
}

// Inicializar el ciclo de vida del Servidor
conectar();

export default app;