// Versión Arquitectura: V6.13 - Adaptación para Despliegue en Railway e Inyección CORS Cloudflare
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\server.js
 * Misión: Integración de red centralizada, habilitación de CORS dinámico para Proxies y orquestación de sockets modularizados.
 * Ajuste V6.13: Vinculación a interfaz 0.0.0.0 para Railway e inyección del dominio oficial de producción en CORS.
 */

import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';

// 🚀 INYECCIÓN DE ENRUTADORES DEL SISTEMA Y GESTOR DE SOCKETS
import authRoutes from '#modules/auth/auth.routes.js';
import conductorRoutes from '#modules/conductores/conductor.routes.js';
import viajeRoutes from '#modules/viajes/viaje.routes.js';
// ⚡ NUEVA IMPORTACIÓN MODULAR CON GOBERNANZA JWT
import { inicializarSockets } from '#modules/sockets/socket.manager.js';

const app = express();
const httpServer = http.createServer(app);

const logLocal = (msg) => {
    console.log(`[${new Date().toLocaleString('es-CO')}] ${msg}`);
};

// 📡 CONFIGURACIÓN MAESTRA DE CORS (Mapeo simétrico con variables de entorno e inyección del dominio oficial)
const origenesPermitidos = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',  
    'http://127.0.0.1:4173',  
    process.env.CLIENT_ORIGIN_LOCAL,   
    process.env.CLIENT_ORIGIN_IP,      
    'http://192.168.100.34:5173',     
    'http://192.168.100.34:4173',     
    process.env.CLIENT_ORIGIN_TUNNEL,  
    'https://globosely-appreciative-zander.ngrok-free.dev',
    'https://app.taxiacimco.com' // 🌐 ¡DOMINIO OFICIAL DE PRODUCCIÓN INYECTADO!
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        
        if (origenesPermitidos.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            logLocal(`🚨 [CIMCO-CORS-VIOLATION] Intrusión bloqueada desde origen no autorizado: ${origin}`);
            callback(new Error('No permitido por políticas de seguridad CORS TAXIA CIMCO'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

// ==================================================================\\
// ⚡ MIDDLEWARES PERIMETRALES Y CAPAS DE CONFIGURACIÓN
// ==================================================================\\
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    const originHeader = req.headers.origin || req.headers.referer || 'Proxy Local / Red Directa';
    logLocal(`📡 [CIMCO-NUCLEO] ${req.method} desde ${originHeader} -> ${req.originalUrl}`);
    next();
});

app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'online',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        node: "CIMCO-Core-Express"
    });
});

// ==================================================================\\
// 🚀 ENRUTADORES GENERALES DEL SISTEMA
// ==================================================================\\
app.use('/api/auth', authRoutes);
app.use('/api/conductores', conductorRoutes);
app.use('/api/viajes', viajeRoutes);

const io = new Server(httpServer, {
    cors: corsOptions
});

inicializarSockets(io);

app.use((err, req, res, next) => {
    if (err.name === 'MongoServerError' || err.code === 112 || err.message.includes('WriteConflict')) {
        logLocal(`💥 [CIMCO-CONCURRENCIA] Conflicto de escritura detectado bajo ráfaga masiva: ${err.message}`);
        return res.status(503).json({
            success: false,
            error: "Conflicto transitorio de transacciones concurrentes en el clúster. Reintentando operation.",
            retryAfterMS: 200
        });
    }

    logLocal(`🚨 [CIMCO-MANEJADOR-GLOBAL] Error no controlado interceptado: ${err.message}`);
    res.status(err.status || 500).json({
        success: false,
        error: "Error interno del servidor central controlado por la directriz de resiliencia CIMCO Core."
    });
});

app.use((req, res) => {
    logLocal(`⚠️ [CIMCO-ROUTE-MISS] Solicitud no interceptada por enrutadores en: ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: `El recurso solicitado [${req.method}] ${req.originalUrl} no existe en el mapa de servicios del Nodo Central.`
    });
});

const URI = process.env.MONGODB_URI;
const opcionesConexion = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4,
    directConnection: false,
    retryWrites: true,
    w: 'majority'     
};

async function conectar() {
    logLocal('📡 [CIMCO-DATABASE] Iniciando conexión blindada...');
    if (!URI) {
        console.error('⚠️ ALERTA DE ARQUITECTURA: MONGODB_URI no está definida en el entorno.');
        return;
    }
    try {
        await mongoose.connect(URI, opcionesConexion);
        logLocal('✅ [CIMCO-DATABASE] ¡CONEXIÓN ESTABLECIDA EXITOSAMENTE con MongoDB Atlas!');
        
        const PORT = process.env.PORT || 3000;
        // 🔄 AJUSTE DE ENRUTAMIENTO PERIMETRAL: Forzar escucha en la interfaz pública '0.0.0.0' para Railway
        httpServer.listen(PORT, '0.0.0.0', () => {
            logLocal(`🚀 [CIMCO-NUCLEO] Servidor Central corriendo exitosamente en el puerto dinámico: ${PORT}`);
        });
    } catch (error) {
        logLocal(`🚨 [CIMCO-DATABASE-FATAL] Error crítico de enlace en la capa persistente: ${error.message}`);
        process.exit(1);
    }
}

conectar();