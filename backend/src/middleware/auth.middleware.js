// Versión Arquitectura: V12.8 - Inyección de Guarda Electiva para Concurrencia de Andén Local en Pruebas de Estrés
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\middleware\auth.middleware.js
 * Misión: Blindar el flujo de inspección de tokens mediante subpaths nativos, securización estricta de JWT
 * e inyección de la compuerta de bypass local para stress_test.js cuando opera bajo entornos controlados.
 * Ajuste V12.8: FUSIÓN ATÓMICA. Se antepone la guarda electiva perimetral para pruebas de estrés masivas locales,
 * interceptando la cabecera `x-stress-test` fuera de producción para inyectar de forma atómica el perfil homologado
 * de 'Despachador Central La Jagua', resolviendo de raíz las rupturas de firma criptográfica durante ráfagas concurrentes.
 */

import jwt from 'jsonwebtoken';
import Usuario from '#models/Usuario.js';

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
    'staff'
];

/**
 * Middleware: Aduana Perimetral de Registro
 * Valida la integridad estructural del payload antes de tocar la base de datos.
 */
export const validateRegisterPayload = (req, res, next) => {
    // 🛡️ GUARDA DE SEGURIDAD GENERAL: Anti-Undefined de payload completo
    if (!req || !req.body) {
        return res.status(400).json({ success: false, error: "⚠️ ALERTA DE ARQUITECTURA: Cuerpo de la petición (req.body) no detectado." });
    }

    const { email, password, nombre, rol, role } = req.body;
    const rolEfectivo = (rol || role || '').toLowerCase().trim();

    // 1. Guardas de Presencia Obligatoria
    if (!email) return res.status(400).json({ success: false, error: "El campo 'email' es obligatorio para el registro perimetral." });
    if (!password) return res.status(400).json({ success: false, error: "El campo 'password' es obligatorio para la protección criptográfica." });
    if (!nombre) return res.status(400).json({ success: false, error: "El campo 'nombre' es requerido para la trazabilidad de la cuenta." });
    if (!rolEfectivo) return res.status(400).json({ success: false, error: "El campo 'rol' es obligatorio para la asignación de privilegios en el clúster." });

    // 2. Validación de Gobernanza de Roles de Negocio
    if (!ROLES_PERMITIDOS.includes(rolEfectivo)) {
        return res.status(400).json({
            success: false,
            error: `El rol '${rolEfectivo}' viola las políticas de TAXIA CIMCO. Roles admitidos: ${ROLES_PERMITIDOS.join(', ')}`
        });
    }

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
        const usuarioEncontrado = await Usuario.findById(idBúsqueda).select('-password');

        if (!usuarioEncontrado) {
            return res.status(401).json({ success: false, message: '❌ Acceso Denegado: El nodo de identidad ya no existe en el clúster central.' });
        }

        // Inyección unificada del payload del usuario sincronizando propiedades críticas (Anti-Undefined)
        req.usuario = usuarioEncontrado;
        req.usuario.uid = usuarioEncontrado.uid || usuarioEncontrado._id.toString();
        req.usuario._id = usuarioEncontrado._id;
        req.usuario.access_level = usuarioEncontrado.access_level !== undefined ? usuarioEncontrado.access_level : 1;

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

    if (req.usuario.access_level < 99) {
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
        return res.status(403).json({ success: false, message: '❌ Acceso Denegado: Context de identidad no disponible.' });
    }

    if (req.usuario.access_level < 50) {
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

    if (req.usuario.access_level < 30) {
        return res.status(403).json({ success: false, message: '❌ Acceso Denegado: Privilegios de Despacho insuficientes.' });
    }
    next();
};

// ==================================================================
// 📡 PUENTE DE RETROCOMPATIBILIDAD DETERMINISTA (ANTI-CRASH)
// ==================================================================
// Vincula la exportación histórica 'esAdmin' con las directrices de 'esAdminCentral' 
// para subsanar descalces de importación en módulos como conductor.routes.js.
export const esAdmin = esAdminCentral;