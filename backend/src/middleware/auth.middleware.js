// Versión Arquitectura: V17.3 - Validación Explícita de Inexistencia de Nodo de Identidad y Verificación Estricta en BD
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\middleware\auth.middleware.js
 * Misión: Securización estricta de JWT, inspección de tokens, bypass local, compatibilidad multipart/form-data con Multer, verificación explícita de existencia en BD (HTTP 401) y protección de rutas.
 * Integridad: Fusión Atómica. Preserva la retrocompatibilidad, normalización de payloads, guardas de seguridad y el manejo unificado de errores.
 */

import jwt from 'jsonwebtoken';
import Usuario from '#models/Usuario.js';

// 🛡️ Garantizar presencia estricta de la clave secreta
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error("💥 [CIMCO-FATAL] process.env.JWT_SECRET no está configurada en el entorno.");
    process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || 'Cimco_Master_Key_Secret_Tokens_2026_LaJagua';

// 🛡️ Diccionario de Gobernanza Unificado (Sincronizado exactamente con auth.controller.js)
const ROLES_PERMITIDOS = [
    'conductor', 
    'despachador', 
    'mototaxi', 
    'motoparrillero', 
    'motocarga', 
    'intermunicipal', 
    'pasajero',
    'secretaria',
    'staff',
    'admin',
    'ceo'
];

/**
 * Middleware: Aduana Perimetral de Registro
 * Valida la integridad estructural del payload en peticiones JSON o Multipart/Form-Data (Multer)
 * permitiendo atributos condicionales según el rol del usuario.
 */
export const validateRegisterPayload = (req, res, next) => {
    // 🛡️ GUARDA DE SEGURIDAD GENERAL: Anti-Undefined de payload completo
    if (!req || !req.body) {
        return res.status(400).json({ 
            success: false, 
            error: "⚠️ ALERTA DE ARQUITECTURA: Cuerpo de la petición (req.body) no detectado." 
        });
    }

    // Normalización anti-undefined para peticiones multipart/form-data y JSON
    const body = req.body || {};
    const email = (body.email || body.correo || '').toString().trim();
    const password = body.password;
    const nombre = (body.nombre || body.fullName || body.nombreCompleto || '').toString().trim();
    const rolRaw = (body.rol || body.role || 'pasajero').toString().trim();
    const rolEfectivo = rolRaw.toLowerCase();

    // 1. Guardas de Presencia Obligatoria Adaptativas (Compatibles con Multer y FormData)
    if (!email) {
        return res.status(400).json({ 
            success: false, 
            error: "El campo 'email' es obligatorio para el registro perimetral." 
        });
    }

    if (!password) {
        return res.status(400).json({ 
            success: false, 
            error: "El campo 'password' es obligatorio para la protección criptográfica." 
        });
    }

    if (!nombre) {
        return res.status(400).json({ 
            success: false, 
            error: "El campo 'nombre' (o 'fullName') es requerido para la trazabilidad de la cuenta." 
        });
    }

    if (!rolEfectivo) {
        return res.status(400).json({ 
            success: false, 
            error: "El campo 'rol' es obligatorio para la asignación de privilegios en el clúster." 
        });
    }

    // 2. Validación de Gobernanza de Roles de Negocio
    if (!ROLES_PERMITIDOS.includes(rolEfectivo)) {
        return res.status(400).json({
            success: false,
            error: `El rol '${rolEfectivo}' viola las políticas de TAXIA CIMCO. Roles admitidos: ${ROLES_PERMITIDOS.join(', ')}`
        });
    }

    // 🛡️ Sincronización In-Memory de Campos Equivalentes para evitar fallos aguas abajo
    req.body.email = email;
    req.body.nombre = nombre;
    req.body.fullName = body.fullName || nombre;
    req.body.rol = rolEfectivo;
    req.body.role = rolEfectivo;

    next();
};

/**
 * Middleware Principal: Verificar Autenticidad del Token (CIMCO-NEXUS)
 * Intercepta y valida el JSON Web Token inyectado en las cabeceras HTTP.
 */
export const verificarToken = async (req, res, next) => {
    // 🛡️ GUARDA ELECTIVA PARA CONCURRENCIA DE ENTORNO LOCAL (Bypass de Automatización)
    if (process.env.NODE_ENV !== 'production' && req.headers && req.headers['x-stress-test'] === 'true') {
        console.log("⚡ [CIMCO-BYPASS] Agente de concurrencia autenticado automáticamente como Despachador de Andén.");
        req.usuario = {
            _id: "6a3880eb8d45b416cb92c531",
            uid: "6a3880eb8d45b416cb92c531",
            id: "6a3880eb8d45b416cb92c531",
            nombre: "Despachador Central La Jagua",
            email: "despacho_central_lajagua@taxiacimco.com",
            role: "despachador",
            rol: "despachador",
            access_level: 30
        };
        return next();
    }

    // 🛡️ COMPUERTA DE BYPASS LOGÍSTICO HISTÓRICO: Test de Emulador
    const esEntornoDesarrollo = process.env.NODE_ENV === 'development' || process.env.FIRESTORE_EMULATOR_HOST;
    const esStressTestAgent = req.headers && (req.headers['user-agent']?.includes('StressTestAgent'));

    if (esEntornoDesarrollo && esStressTestAgent) {
        console.log("⚡ [CIMCO-BYPASS] Agente StressTestAgent autenticado automáticamente por regla de desarrollo local.");
        req.usuario = {
            _id: "660000000000000000000001",
            uid: "660000000000000000000001",
            id: "660000000000000000000001",
            nombre: "Simulador Estrés CIMCO",
            email: "stress_test_local@taxiacimco.com",
            role: "staff",
            rol: "staff",
            access_level: 99
        };
        return next();
    }

    // Guardas de seguridad perimetral sobre la petición
    if (!req || !req.headers) {
        return res.status(401).json({ success: false, message: '❌ Acceso Denegado: Encabezados HTTP corruptos o inexistentes.' });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: '❌ Acceso Denegado: Token de sesión no suministrado en la cabecera.' });
    }

    try {
        // Decodificación atómica del token
        const decodificado = jwt.verify(token, JWT_SECRET);
        
        if (!decodificado || (!decodificado.id && !decodificado._id && !decodificado.uid)) {
            return res.status(401).json({ success: false, message: '❌ Acceso Denegado: Estructura del payload del token inválida.' });
        }

        const idBúsqueda = decodificado.id || decodificado._id || decodificado.uid;
        
        // Búsqueda por _id o uid en la base de datos central de MongoDB Atlas
        let usuarioEncontrado = null;
        if (idBúsqueda) {
            usuarioEncontrado = await Usuario.findOne({
                $or: [{ _id: idBúsqueda }, { uid: idBúsqueda }]
            }).select('-password');
        }

        // 🛡️ Validación explícita de existencia en BD y emisión limpia de HTTP 401
        if (!usuarioEncontrado) {
            return res.status(401).json({
                success: false,
                message: '❌ Acceso Denegado: El nodo de identidad ya no existe en el clúster central.'
            });
        }

        // Inyección unificada del payload del usuario sincronizando propiedades críticas (Anti-Undefined)
        const rolEfectivo = (usuarioEncontrado.rol || usuarioEncontrado.role || decodificado.rol || decodificado.role || 'pasajero').toLowerCase();
        
        req.usuario = {
            ...usuarioEncontrado.toObject(),
            _id: usuarioEncontrado._id,
            id: usuarioEncontrado._id.toString(),
            uid: usuarioEncontrado.uid || usuarioEncontrado._id.toString(),
            rol: rolEfectivo,
            role: rolEfectivo,
            access_level: usuarioEncontrado.access_level !== undefined ? usuarioEncontrado.access_level : 1
        };

        next();
    } catch (error) {
        // 🕵️ Si el error proviene puramente de la validación del JWT
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            console.error("🚨 [CIMCO-AUTH] Ruptura criptográfica de sesión:", error.message);
            return res.status(403).json({
                success: false,
                message: '❌ Acceso Prohibido: Token de sesión alterado, expirado o corrupto.'
            });
        }

        // 📡 Si es un error de infraestructura (ej: desconexión de Atlas bajo estrés), se transfiere al manejador global
        console.error("💥 [CIMCO-SISTEMA] Error crítico en aduana de autenticación:", error.message);
        return res.status(500).json({
            success: false,
            error: "Error interno del servidor central durante la verificación de identidad."
        });
    }
};

/**
 * Middleware 2: Escudo de Máxima Jerarquía (Nodo Root / Nivel 99)
 */
export const esAdminCentral = (req, res, next) => {
    // 🛡️ GUARDA DE SEGURIDAD: Previene ruptura si req.usuario no fue inyectado en la aduana
    if (!req || !req.usuario || req.usuario.access_level === undefined) {
        return res.status(403).json({ success: false, message: '❌ Acceso Denegado: Contexto de identidad no disponible para el Nodo Root.' });
    }

    if (req.usuario.access_level < 99 && req.usuario.rol !== 'admin' && req.usuario.rol !== 'ceo') {
        return res.status(403).json({ success: false, message: '❌ Acceso Denegado: Se requieren privilegios del Nodo Root.' });
    }
    next();
};

/**
 * Middleware 3: Escudo Intermedio (Staff / Operaciones)
 */
export const esStaffOAdmin = (req, res, next) => {
    // 🛡️ GUARDA DE SEGURIDAD: Previene ruptura por falta de privilegios
    if (!req || !req.usuario || req.usuario.access_level === undefined) {
        return res.status(403).json({ success: false, message: '❌ Acceso Denegado: Contexto de identidad no disponible.' });
    }

    if (req.usuario.access_level < 50 && req.usuario.rol !== 'admin' && req.usuario.rol !== 'staff' && req.usuario.rol !== 'ceo') {
        return res.status(403).json({ success: false, message: '❌ Acceso Denegado: Privilegios de Staff insuficientes.' });
    }
    next();
};

/**
 * Middleware 4: Escudo Logístico (Despachador / Nivel 30+)
 */
export const esDespachador = (req, res, next) => {
    // 🛡️ GUARDA DE SEGURIDAD: Previene ruptura si req.usuario no fue inyectado
    if (!req || !req.usuario || req.usuario.access_level === undefined) {
        return res.status(403).json({ success: false, message: '❌ Acceso Denegado: Contexto de identidad no disponible.' });
    }

    if (req.usuario.access_level < 30 && req.usuario.rol !== 'despachador' && req.usuario.rol !== 'admin' && req.usuario.rol !== 'ceo') {
        return res.status(403).json({ success: false, message: '❌ Acceso Denegado: Privilegios de Despacho insuficientes.' });
    }
    next();
};

// ==================================================================
// 📡 PUENTE DE RETROCOMPATIBILIDAD DETERMINISTA (ANTI-CRASH)
// ==================================================================
// Vincula la exportación histórica 'esAdmin' y 'authMiddleware' con las directrices unificadas 
// para subsanar descalces de importación en el ecosistema.
export const esAdmin = esAdminCentral;
export const authMiddleware = verificarToken;

export default verificarToken;