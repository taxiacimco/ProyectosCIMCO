// Versión Arquitectura: V17.5 - Desacoplamiento de Arranque HTTP y Resiliencia en Conexión MongoDB Atlas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\server.js
 * Misión: Integración de red centralizada, habilitación de CORS perimetral controlado con soporte explícito
 * para frontend-taxia-cimco.vercel.app, orquestación de sockets e inyección del enrutador de Cooperativas (/api/cooperativas),
 * Excel (/api/excel) junto con Pasajeros, Usuarios, Conductores y Viajes.
 * Optimización V17.5: Arranque inmediato del servidor HTTP para garantizar disponibilidad en el puerto dinámico de Railway.
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
import usuarioRoutes from './modules/usuarios/usuario.routes.js';
import pasajeroRoutes from './modules/pasajeros/pasajero.routes.js';
import cooperativaRoutes from './modules/cooperativas/cooperativa.routes.js';
import excelRoutes from './modules/excel/excel.routes.js';
import { inicializarSockets } from '#modules/sockets/socket.manager.js';

const app = express();
const httpServer = http.createServer(app);

const logLocal = (msg) => {
    console.log(`[${new Date().toLocaleString('es-CO')}] ${msg}`);
};

// 🌐 ORIGENES PERMITIDOS PARA DESARROLLO LOCAL, RED LOCAL, NGROK, CLOUDFLARE TUNNEL Y PRODUCCIÓN VERCEL
const allowedOrigins = [
  'https://frontend-taxia-cimco.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://192.168.100.34:5173',
  'http://192.168.100.34:4173',
  'http://192.168.100.34:3000',
  'https://globosely-appreciative-zander.ngrok-free.dev',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.CLOUDFLARE_TUNNEL_URL
].filter(Boolean);

// 📡 EVALUADOR DE ORIGEN DINÁMICO CON VALIDACIÓN DE REGEX PARA PREVIEWS Y PRODUCCIÓN DE VERCEL
const isOriginAllowed = (origin, callback) => {
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin) ||
        process.env.NODE_ENV !== 'production';

    if (isAllowed) {
        callback(null, true);
    } else {
        callback(new Error(`Bloqueado por política de seguridad CORS CIMCO-Core: ${origin}`));
    }
};

// 📡 CONFIGURACIÓN MAESTRA DE CORS CON VALIDACIÓN DINÁMICA DE ORIGEN, CABECERAS Y CREDENCIALES
const corsOptions = {
    origin: isOriginAllowed,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With', 
        'Accept', 
        'Expires', 
        'Cache-Control', 
        'Pragma',
        'x-access-token'
    ]
};

// ==================================================================\\
// ⚡ MIDDLEWARES PERIMETRALES Y CAPAS DE CONFIGURACIÓN
// ==================================================================\\
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    const originHeader = req.headers?.origin || req.headers?.referer || 'Proxy Local / Red Directa';
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
// 🌐 ENDPOINT DIRECTORIO GLOBAL (CONSOLA CEO / ADMIN)
// ==================================================================\\
app.get('/api/usuarios/directorio-global', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(503).json({ success: false, message: "Base de datos no inicializada" });
    }

    // Consulta paralela a las 3 colecciones
    const [usuarios, pasajeros, conductores] = await Promise.all([
      db.collection('usuarios').find({}).toArray(),
      db.collection('pasajeros').find({}).toArray(),
      db.collection('conductores').find({}).toArray()
    ]);

    // Normalización de datos para la interfaz
    const directorio = [
      ...usuarios.map(u => ({ 
        ...u, 
        origenColeccion: 'usuarios', 
        rolNormalizado: (u?.rol || u?.role || 'usuario')?.toLowerCase() 
      })),
      ...pasajeros.map(p => ({ 
        ...p, 
        origenColeccion: 'pasajeros', 
        rolNormalizado: 'pasajero' 
      })),
      ...conductores.map(c => ({ 
        ...c, 
        origenColeccion: 'conductores', 
        rolNormalizado: 'conductor' 
      }))
    ];

    res.json({ success: true, total: directorio.length, data: directorio });
  } catch (error) {
    logLocal(`🚨 [DIRECTORIO-GLOBAL-ERROR] ${error?.message || error}`);
    res.status(500).json({ success: false, error: error?.message || error });
  }
});

// ==================================================================\\
// 🚀 ENRUTADORES GENERALES DEL SISTEMA (PREFIJO BASE: /api)
// ==================================================================\\
app.use('/api/auth', authRoutes);
app.use('/api/conductores', conductorRoutes);
app.use('/api/viajes', viajeRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/pasajeros', pasajeroRoutes);
app.use('/api/cooperativas', cooperativaRoutes);
app.use('/api/excel', excelRoutes);

// ⚡ SINCRONIZACIÓN DE CORS Y TRANSPORTE PARA WEBSOCKETS (SOCKET.IO)
const io = new Server(httpServer, {
    cors: corsOptions,
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

inicializarSockets(io);

app.use((err, req, res, next) => {
    if (err && (err.name === 'MongoServerError' || err.code === 112 || (err.message && err.message.includes('WriteConflict')))) {
        logLocal(`💥 [CIMCO-CONCURRENCIA] Conflicto de escritura detectado bajo ráfaga masiva: ${err.message}`);
        return res.status(503).json({
            success: false,
            error: "Conflicto transitorio de transacciones concurrentes en el clúster. Reintentando operación.",
            retryAfterMS: 200
        });
    }

    const mensajeError = err?.message || 'Error no especificado';
    logLocal(`🚨 [CIMCO-MANEJADOR-GLOBAL] Error no controlado interceptado: ${mensajeError}`);
    res.status(err?.status || 500).json({
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

// ==================================================================\\
// 🚀 INICIALIZACIÓN PERIMETRAL DE RED Y CONEXIÓN A BASE DE DATOS
// ==================================================================\\
const PORT = process.env.PORT || 8080;

// 1. Iniciar el servidor HTTP inmediatamente para responder a Railway y Healthchecks
httpServer.listen(PORT, '0.0.0.0', () => {
    logLocal(`🚀 [CIMCO-NUCLEO] Servidor Central corriendo exitosamente en el puerto dinámico: ${PORT}`);
});

// 2. Proceso independiente de conexión a MongoDB Atlas
const URI = process.env.MONGODB_URI;
const opcionesConexion = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4,
    directConnection: false,
    retryWrites: true,
    w: 'majority'     
};

async function conectarDB() {
    logLocal('📡 [CIMCO-DATABASE] Iniciando conexión blindada...');
    if (!URI) {
        console.error('⚠️ ALERTA DE ARQUITECTURA: MONGODB_URI no está definida en el entorno.');
        return;
    }
    try {
        await mongoose.connect(URI, opcionesConexion);
        logLocal('✅ [CIMCO-DATABASE] ¡CONEXIÓN ESTABLECIDA EXITOSAMENTE con MongoDB Atlas!');
    } catch (error) {
        logLocal(`🚨 [CIMCO-DATABASE-FATAL] Error de enlace en la capa persistente: ${error?.message || error}`);
    }
}

conectarDB();