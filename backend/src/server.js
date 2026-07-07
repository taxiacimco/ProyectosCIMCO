// Versión Arquitectura: V6.9 - Implementación de Manejador de Errores Global de Infraestructura y Resiliencia en Test de Estrés
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\server.js
 * Misión: Integración de red centralizada, habilitación de CORS dinámico para Proxies y orquestación de sockets modularizados.
 * Ajuste V6.9: FUSIÓN ATÓMICA. Se inyecta un middleware de control de errores global de cuatro parámetros antes del controlador 
 * de caída perimetral para capturar y neutralizar de manera limpia excepciones de persistencia (índices, WriteConflict, caídas transitorias de Atlas),
 * previniendo el colapso abrupto (crash) del proceso de Node durante ráfagas masivas.
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

// 📡 CONFIGURACIÓN MAESTRA DE CORS (Mapeo simétrico con variables de entorno e inyección estricta del túnel activo)
const origenesPermitidos = [
    process.env.CLIENT_ORIGIN_LOCAL,   // http://localhost:5173
    process.env.CLIENT_ORIGIN_IP,      // http://192.168.100.34:5173
    process.env.CLIENT_ORIGIN_TUNNEL,  // Respeta la variable del entorno previo
    'https://globosely-appreciative-zander.ngrok-free.dev' // 🔗 Inyección quirúrgica del dominio seguro activo para mitigar el error ERR_NGROK_3200
];

const corsOptions = {
    origin: function (origin, callback) {
        // Permitir peticiones sin origen (como apps móviles nativas, Postman o tareas internas)
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

app.use(cors(corsOptions));
app.use(express.json());

// 🎛️ CAPA MIDDLEWARE: MONITOREO DE TRÁFICO CENTRALIZADO
app.use((req, res, next) => {
    const originHeader = req.headers.origin || req.headers.referer || 'Proxy Local / Red Directa';
    logLocal(`📡 [CIMCO-NUCLEO] ${req.method} desde ${originHeader} -> ${req.originalUrl}`);
    next();
});

// 🛠️ REMEDIACIÓN ROUTE-MISS: Endpoint estratégico para la verificación de salud e integridad del Nodo Central
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'online',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        node: "CIMCO-Core-Express"
    });
});

// 🛣️ DECLARACIÓN DE INFRAESTRUCTURA DE ENRUTAMIENTO ATÓMICO
app.use('/api/auth', authRoutes);
app.use('/api/conductores', conductorRoutes);
app.use('/api/viajes', viajeRoutes);

// 🔌 ORQUESTACIÓN MAESTRA DE WEBSOCKETS (Sincronización en Tiempo Real de Flotas)
const io = new Server(httpServer, {
    cors: corsOptions
});

// 🔥 Invocación modularizada con blindaje JWT y control de salas dinámicas
inicializarSockets(io);

// 🛡️ MIDDLEWARE GLOBAL DE ERRORES DE CUATRO PARÁMETROS (PREVENCION ANTI-CRASH BAJO ESTRÉS)
app.use((err, req, res, next) => {
    // Captura fallos de concurrencia y bloqueos transitorios en MongoDB Atlas (ej. WriteConflict)
    if (err.name === 'MongoServerError' || err.code === 112 || err.message.includes('WriteConflict')) {
        logLocal(`💥 [CIMCO-CONCURRENCIA] Conflicto de escritura detectado bajo ráfaga masiva: ${err.message}`);
        return res.status(503).json({
            success: false,
            error: "Conflicto transitorio de transacciones concurrentes en el clúster. Reintentando operación.",
            retryAfterMS: 200
        });
    }

    logLocal(`🚨 [CIMCO-MANEJADOR-GLOBAL] Error no controlado interceptado: ${err.message}`);
    res.status(err.status || 500).json({
        success: false,
        error: "Error interno del servidor central controlado por la directriz de resiliencia CIMCO Core."
    });
});

// 🛡️ CONTROLADOR DE CAÍDA PERIMETRAL (Captura regresiones de rutas inexistentes)
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
        httpServer.listen(PORT, () => {
            logLocal(`🚀 [CIMCO-NUCLEO] Servidor Central corriendo en puerto: ${PORT}`);
        });
    } catch (error) {
        logLocal(`🚨 [CIMCO-DATABASE-FATAL] Error crítico de enlace en la capa persistente: ${error.message}`);
        process.exit(1);
    }
}

conectar();