// Versión Arquitectura: V19.4 - Verificación y Validación de Enrutamiento Perimetral de Autenticación /api/auth (update-profile)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\server.js
 * Misión: Integración de red centralizada, habilitación de CORS perimetral controlado con soporte canónico
 * para entornos de desarrollo y producción (HTTP/HTTPS), habilitación de trust proxy para terminación SSL en Railway/Nginx,
 * orquestación de sockets, inyección de enrutadores del sistema (incluyendo el módulo de autenticación bajo /api/auth)
 * y registro resiliente del middleware centralizado de errores.
 * Ajuste V19.4: Confirmación y aseguramiento del montaje de authRoutes en /api/auth para exponer de forma pública la URL PUT /api/auth/update-profile.
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

// 🛡️ CARGA RESILIENTE DEL MIDDLEWARE DE ERRORES (ANTI-CRASH)
let errorHandler = null;
try {
    const errorModule = await import('./middlewares/error.middleware.js').catch(() => 
        import('#middlewares/error.middleware.js').catch(() => null)
    );
    errorHandler = errorModule?.default || errorModule?.errorHandler || null;
} catch (importErr) {
    console.warn("⚠️ [CIMCO-NUCLEO] error.middleware.js no detectado en disco. Operando con manejador inline de resiliencia.");
}

const app = express();

// 🛡️ RECONOCIMIENTO DE CABECERAS HTTP/HTTPS DETRÁS DE PROXY REVERSO (RAILWAY / NGINX / VERCEL)
app.set('trust proxy', 1);

// 1. ENVOLTURAS EXPLÍCITAS DEL SERVIDOR HTTP
const httpServer = http.createServer(app);

const logLocal = (msg) => {
    console.log(`[${new Date().toLocaleString('es-CO')}] ${msg}`);
};

// 🌐 ORIGENES PERMITIDOS PARA DESARROLLO LOCAL, RED LOCAL, NGROK, CLOUDFLARE TUNNEL Y PRODUCCIÓN VERCEL / RAILWAY
const origenesPermitidos = [
  'http://localhost:5173',
  'https://frontend-opal-eight-58.vercel.app',
  'https://frontend-taxia-cimco.vercel.app',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://192.168.100.34:5173',
  'http://192.168.100.34:4173',
  'http://192.168.100.34:3000',
  'https://globosely-appreciative-zander.ngrok-free.dev',
  process.env.CLIENT_ORIGIN,
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  process.env.CLIENT_ORIGIN_LOCAL,
  process.env.CLIENT_ORIGIN_IP,
  process.env.CLIENT_ORIGIN_TUNNEL,
  process.env.CLIENT_ORIGIN_VERCEL,
  process.env.CLIENT_ORIGIN_VERCEL_ALT,
  process.env.FRONTEND_BASE_URL,
  process.env.CLOUDFLARE_TUNNEL_URL
].filter(Boolean);

// 📡 EVALUADOR DE ORIGEN DINÁMICO CON INTEGRACIÓN DE CALLBACK
const isOriginAllowed = (origin, callback) => {
    // Permitir peticiones sin origen (como mobile apps, curl o Postman) o dentro de la lista / subdominios vercel
    if (!origin || origenesPermitidos.includes(origin) || /\.vercel\.app$/.test(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
    } else {
        callback(new Error('Bloqueado por política CORS de CIMCO'));
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
// 🛡️ ENRUTADOR ADMINISTRATIVO PERIMETRAL (INLINE REST API)
// ==================================================================\\
const adminRoutes = express.Router();

adminRoutes.get('/usuarios', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        if (!db) {
            return res.status(503).json({ success: false, message: "Base de datos no inicializada" });
        }
        const usuarios = await db.collection('usuarios').find({}).toArray();
        res.json({ success: true, total: usuarios.length, data: usuarios, usuarios });
    } catch (error) {
        logLocal(`🚨 [ADMIN-ROUTER-ERROR] ${error?.message || error}`);
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
app.use('/api/admin', adminRoutes);

// ==================================================================\\
// ⚡ INSTANCIACIÓN DE SOCKET.IO Y EXPORTACIÓN E INVOCACIÓN DE SOCKET MANAGER
// ==================================================================\\
const io = new Server(httpServer, {
    cors: {
        origin: isOriginAllowed,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// Invocación de la función inicializadora pasándole la instancia global io
inicializarSockets(io);

// ==================================================================\\
// 🛡️ CAPA DE ERRORES CENTRALIZADA Y CONTROL DE RUTAS NO ENCONTRADAS
// ==================================================================\\
// 1. Registro condicional del middleware centralizado de errores si fue cargado exitosamente
if (typeof errorHandler === 'function') {
    app.use(errorHandler);
}

// 2. Controladores de errores de resiliencia y concurrencia (Fallback Ininterrumpido)
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
        error: mensajeError.includes('CORS') ? mensajeError : "Error interno del servidor central controlado por la directriz de resiliencia CIMCO Core."
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