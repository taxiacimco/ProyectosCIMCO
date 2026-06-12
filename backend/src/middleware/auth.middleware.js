// Versión Arquitectura: V12.1 - Integración de Escudo Logístico Nivel 30 y Sincronización Matricial
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\middleware\auth.middleware.js
 * Misión: Blindar el flujo de registro unificando los diccionarios de roles con el Controlador Central.
 * Ajuste: Eliminación de dependencia obligatoria de access_level en req.body (ahora gestionado por el Backend)
 * y normalización estructural anti-inyecciones. Integración de Escudo Logístico.
 */

import jwt from 'jsonwebtoken';

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
        return res.status(400).json({ success: false, message: '❌ Error Estructural: Payload de registro inexistente.' });
    }

    const { nombre, email, telefono, password, role, rol } = req.body;

    // 1. Validación de campos mandatorios del Frontend
    if (!nombre || !email || !telefono || !password) {
        return res.status(400).json({ 
            success: false, 
            message: '❌ Payload Incompleto: Campos nombre, email, telefono y password son obligatorios.' 
        });
    }

    // 2. Homologación y resolución de llaves de rol (role / rol)
    const rolA_Evaluar = (role || rol || '').toLowerCase().trim();

    if (!rolA_Evaluar) {
        return res.status(400).json({ success: false, message: '❌ Error de Permisos: El rol de la unidad es mandatorio.' });
    }

    // 3. Bloqueo estricto de escalación vertical de privilegios administrativos
    if (rolA_Evaluar === 'admin') {
        console.error(`🚨 [CIMCO-ALERTA] Intento ilícito de auto-asignación de rol 'admin' desde IP: ${req.ip}`);
        return res.status(403).json({ success: false, message: '❌ Operación ilegal: No autorizado para asignar rol Admin.' });
    }

    // 4. Verificación perimetral de firma de rol
    if (!ROLES_PERMITIDOS.includes(rolA_Evaluar)) {
        return res.status(400).json({ 
            success: false, 
            message: `❌ Error de Gobernanza: El rol '${rolA_Evaluar}' no pertenece al ecosistema homologado de TAXIA CIMCO.` 
        });
    }

    // Aseguramos que el rol sanitizado prosiga en el ciclo de vida de la petición
    req.body.role = rolA_Evaluar;

    next(); // Pasa la inspección perimetral con éxito
};

/**
 * Middleware 1: Verificar validez del Token JWT (Handshake Operacional)
 */
export const verificarToken = (req, res, next) => {
    // 🛡️ GUARDA DE SEGURIDAD: Anti-Undefined de Headers
    if (!req || !req.headers) {
        return res.status(401).json({ success: false, message: '❌ Acceso denegado: Cabeceras de red corruptas.' });
    }

    const authHeader = req.header('Authorization');
    if (!authHeader) {
        return res.status(401).json({ success: false, message: '❌ Acceso denegado: Token no proporcionado.' });
    }

    try {
        const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
        const verificado = jwt.verify(token, JWT_SECRET);
        
        if (!verificado || typeof verificado !== 'object') {
            return res.status(400).json({ success: false, message: '❌ Estructura de Payload corrupta.' });
        }
        
        req.usuario = verificado; 
        next();
    } catch (error) {
        console.error("❌ [CIMCO-JWT] Error en verificación de firma:", error.message);
        return res.status(400).json({ success: false, message: '❌ Token expirado o inválido.' });
    }
};

/**
 * Middleware 2: Escudo Maestro Administrativo
 */
export const esAdmin = (req, res, next) => {
    // 🛡️ GUARDA DE SEGURIDAD: Previene ruptura si req.usuario no fue inyectado previamente
    if (!req.usuario || req.usuario.access_level === undefined) {
        return res.status(403).json({ success: false, message: '❌ Acceso Denegado: Contexto de identidad no disponible.' });
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
    if (!req.usuario || req.usuario.access_level === undefined) {
        return res.status(403).json({ success: false, message: '❌ Acceso Denegado: Contexto de identidad no disponible.' });
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
    if (!req.usuario || req.usuario.access_level === undefined) {
        return res.status(403).json({ success: false, message: '❌ Acceso Denegado: Contexto de identidad no disponible.' });
    }

    // El despachador tiene LVL 30. Si es menor, se bloquea.
    if (req.usuario.access_level < 30) {
        return res.status(403).json({ success: false, message: '❌ ALERTA INTRUSIÓN: Acceso Denegado. Área exclusiva para Logística y Despacho.' });
    }
    next();
};