// Versión Arquitectura: V19.8 - Desacoplamiento Nativo de Express-Validator y Preservación Total de Despacho Perimetral
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\middleware\validate.middleware.js
 * Misión: Validar y sanitizar los payloads de despacho perimetral (Urbano, Intermunicipal e Inmediato) y registros de usuario antes de impactar el bus de datos central.
 * Ajuste V19.8: DESACOPLEMENTO NATIVO. Se elimina la dependencia externa 'express-validator' y se implementa un motor nativo
 *               de cadenas de validación fluida en JavaScript (body, param, query, check, validationResult, validate),
 *               eliminando el error ERR_MODULE_NOT_FOUND y conservando intactos 'validarRegistro' y 'validarDespacho'.
 */

import crypto from 'crypto';

const logLocal = (msg) => {
    console.log(`[${new Date().toLocaleString('es-CO')}] 📡 [CIMCO-VALIDACION] ${msg}`);
};

/**
 * Genera una función middleware de Express con métodos encadenables de validación.
 * Reemplaza la dependencia externa 'express-validator' sin alterar firmas existentes.
 */
function createValidationChain(field, location = 'body') {
    const checks = [];
    const sanitizers = [];
    let currentCustomMsg = null;

    const middleware = async (req, res, next) => {
        if (!req) {
            if (typeof next === 'function') next();
            return;
        }
        const source = req[location] || {};
        let val = source[field];

        for (const checkObj of checks) {
            const errorMsg = checkObj.fn(val);
            if (errorMsg) {
                if (!req._validationErrors) req._validationErrors = [];
                req._validationErrors.push({
                    path: field,
                    param: field,
                    msg: checkObj.customMsg || errorMsg,
                    value: val
                });
                break; // Detiene comprobaciones adicionales para este mismo campo
            }
        }

        // Aplicar sanitizaciones sobre la fuente si no hay errores
        for (const sanFn of sanitizers) {
            if (req[location] && req[location][field] !== undefined) {
                req[location][field] = sanFn(req[location][field]);
            }
        }

        if (typeof next === 'function') next();
    };

    const addCheck = (fn) => {
        checks.push({ fn, customMsg: currentCustomMsg });
        currentCustomMsg = null;
        return middleware;
    };

    // --- Métodos de Encadenamiento (Chainable Helpers) ---

    middleware.withMessage = (msg) => {
        if (checks.length > 0) {
            checks[checks.length - 1].customMsg = msg;
        } else {
            currentCustomMsg = msg;
        }
        return middleware;
    };

    middleware.notEmpty = () => addCheck((val) => {
        if (val === undefined || val === null || String(val).trim() === '') {
            return `El campo '${field}' es obligatorio.`;
        }
        return null;
    });

    middleware.isEmail = () => addCheck((val) => {
        if (!val) return null;
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !regex.test(String(val).trim()) ? `El campo '${field}' debe ser un correo válido.` : null;
    });

    middleware.matches = (pattern) => addCheck((val) => {
        if (!val) return null;
        const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
        return !regex.test(String(val)) ? `El campo '${field}' no cumple con el formato requerido.` : null;
    });

    middleware.isLength = (options = {}) => addCheck((val) => {
        if (!val) return null;
        const len = String(val).length;
        if (options.min !== undefined && len < options.min) return `El campo '${field}' debe tener al menos ${options.min} caracteres.`;
        if (options.max !== undefined && len > options.max) return `El campo '${field}' no puede superar los ${options.max} caracteres.`;
        return null;
    });

    middleware.isNumeric = () => addCheck((val) => {
        if (!val) return null;
        return isNaN(Number(val)) ? `El campo '${field}' debe ser numérico.` : null;
    });

    middleware.normalizeEmail = () => {
        sanitizers.push((val) => typeof val === 'string' ? val.trim().toLowerCase() : val);
        return middleware;
    };

    middleware.optional = () => middleware;
    middleware.run = async (req) => middleware(req, {}, () => {});

    return middleware;
}

export const body = (field) => createValidationChain(field, 'body');
export const param = (field) => createValidationChain(field, 'params');
export const query = (field) => createValidationChain(field, 'query');
export const check = (field) => createValidationChain(field, 'body');

/**
 * Extrae los errores acumulados durante la ejecución de las cadenas de validación.
 */
export const validationResult = (req) => {
    const errors = (req && req._validationErrors) ? req._validationErrors : [];
    return {
        isEmpty: () => errors.length === 0,
        array: () => errors,
        mapped: () => errors.reduce((acc, err) => ({ ...acc, [err.path]: err }), {})
    };
};

/**
 * Middleware que evalúa el resultado de validación y responde HTTP 400 si hay fallos.
 */
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array(),
            message: errors.array()[0]?.msg || 'Error de validación en los datos enviados.'
        });
    }
    next();
};

/**
 * Middleware de Validación Estricta para Registro de Usuarios (Email y Teléfono Celular Colombiano)
 */
export const validarRegistro = [
    body('email')
        .notEmpty().withMessage('El correo electrónico es requerido')
        .isEmail().withMessage('Debe proporcionar un correo electrónico válido')
        .normalizeEmail(),
    body('telefono')
        .notEmpty().withMessage('El número celular es requerido')
        .matches(/^3\d{9}$/).withMessage('El celular debe ser un número colombiano válido de 10 dígitos que empiece por 3'),
    (req, res, next) => {
        // 🛡️ GUARDA DE SEGURIDAD ABSOLUTA
        if (!req || !req.body) {
            logLocal("🚨 Bloqueado en Registro: Payload ausente.");
            return res.status(400).json({ 
                status: 'ERROR', 
                success: false, 
                error: "⚠️ ALERTA DE ARQUITECTURA: Cuerpo de la petición (req.body) ausente o corrupto." 
            });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logLocal(`🚨 Fallo de Validación en Registro: ${JSON.stringify(errors.array())}`);
            return res.status(400).json({ 
                status: 'ERROR', 
                success: false, 
                errors: errors.array() 
            });
        }
        next();
    }
];

/**
 * Middleware Maestro de Validación Perimetral para Despachos
 * @param {Object} req - Petición Express entrante
 * @param {Object} res - Objeto de respuesta HTTP
 * @param {Function} next - Siguiente middleware en la cadena de Express
 */
export const validarDespacho = (req, res, next) => {
    // 🛡️ GUARDA DE SEGURIDAD ABSOLUTA: Verificar existencia del cuerpo del mensaje
    if (!req || !req.body || Object.keys(req.body).length === 0) {
        logLocal("🚨 Bloqueado: Payload vacío o corrupto.");
        return res.status(400).json({ 
            success: false, 
            error: "⚠️ ALERTA DE ARQUITECTURA: Cuerpo de la petición (req.body) ausente o corrupto en el bus." 
        });
    }

    const { body: reqBody, originalUrl } = req;
    const { 
        viajeId, 
        conductorId, 
        tarifa, 
        metodoPago, 
        pasajeroNombre, 
        destinoNombre, 
        fleetId, 
        pasajeroId,
        origenLat,
        origenLng,
        destinoLat,
        destinoLng,
        origen,
        destino
    } = reqBody;

    // Detectar ruta actual para activar la guarda electiva de taquilla / andén
    const esDespachoInmediato = originalUrl && originalUrl.includes('/despachar-inmediato');

    if (esDespachoInmediato) {
        // 📦 1. Validar parámetros obligatorios de andén inmediatos (Sin viajeId)
        if (!conductorId || typeof conductorId !== 'string' || conductorId.trim() === '') {
            return res.status(400).json({ success: false, error: "El campo 'conductorId' es requerido para despacho inmediato." });
        }
        if (!pasajeroId && (!pasajeroNombre || typeof pasajeroNombre !== 'string' || pasajeroNombre.trim().length < 3)) {
            return res.status(400).json({ success: false, error: "El campo 'pasajeroId' o un 'pasajeroNombre' válido es requerido para despacho inmediato." });
        }
        if (tarifa === undefined || tarifa === null) {
            return res.status(400).json({ success: false, error: "El campo 'tarifa' es requerido para despacho inmediato." });
        }
        
        const tarifaNum = Number(tarifa);
        if (isNaN(tarifaNum) || tarifaNum <= 0) {
            return res.status(400).json({ success: false, error: "La 'tarifa' de despacho inmediato debe ser un número real positivo mayor a cero." });
        }

        // Extraer coordenadas polimórficamente (Soporta formato plano origenLat y formato estructurado origen.lat)
        const latO = origen?.lat !== undefined ? origen.lat : origenLat;
        const lngO = origen?.lng !== undefined ? origen.lng : origenLng;
        const latD = destino?.lat !== undefined ? destino.lat : destinoLat;
        const lngD = destino?.lng !== undefined ? destino.lng : destinoLng;

        if (latO === undefined || lngO === undefined) {
            return res.status(400).json({ success: false, error: "El punto de 'origen' (lat/lng) es obligatorio para el despacho logístico." });
        }
        if (latD === undefined || lngD === undefined) {
            return res.status(400).json({ success: false, error: "El punto de 'destino' (lat/lng) es obligatorio para el cálculo de ruta." });
        }

        const parsedOrigenLat = parseFloat(latO);
        const parsedOrigenLng = parseFloat(lngO);
        const parsedDestinoLat = parseFloat(latD);
        const parsedDestinoLng = parseFloat(lngD);

        if (isNaN(parsedOrigenLat) || isNaN(parsedOrigenLng) || isNaN(parsedDestinoLat) || isNaN(parsedDestinoLng)) {
            return res.status(400).json({ 
                success: false, 
                error: "⚠️ ALERTA DE VALIDACIÓN: Una o más coordenadas geográficas no contienen un formato decimal válido." 
            });
        }

        // Sanitizar y mutar tipos nativos para este flujo controlado antes de procesar el canal financiero
        req.body.tarifa = tarifaNum;
        req.body.conductorId = String(conductorId).trim();
        if (pasajeroId) req.body.pasajeroId = String(pasajeroId).trim();

        // Inyección quirúrgica del payload de coordenadas unificadas para el controlador transaccional
        req.body.origen = { lat: parsedOrigenLat, lng: parsedOrigenLng };
        req.body.destino = { lat: parsedDestinoLat, lng: parsedDestinoLng };

        // Procesamiento del canal financiero unificado
        if (metodoPago !== undefined && metodoPago !== null) {
            if (typeof metodoPago !== 'string') {
                return res.status(400).json({ success: false, error: "El campo 'metodoPago' debe ser una cadena de texto." });
            }
            const metodoFormateado = metodoPago.toUpperCase().trim();
            const metodosValidos = ['WALLET', 'EFECTIVO', 'QR'];
            if (!metodosValidos.includes(metodoFormateado)) {
                return res.status(400).json({ 
                    success: false, 
                    error: `El método de pago '${metodoPago}' no es válido para el ecosistema CIMCO. Use: WALLET, EFECTIVO o QR.` 
                });
            }
            req.body.metodoPago = metodoFormateado;
        } else {
            req.body.metodoPago = 'EFECTIVO';
        }

        return next();
    }

    // 🕵️ DETECCIÓN OPERATIVA: Identificar si el payload corresponde al ecosistema Intermunicipal Novedoso estándar
    const esIntermunicipal = (pasajeroNombre !== undefined || destinoNombre !== undefined || fleetId !== undefined);

    if (esIntermunicipal) {
        // ==================================================================\
        // FLUJO INTERMUNICIPAL NOVEDOSO (VALIDACIÓN ATÓMICA)
        // ==================================================================\

        // 📦 1. Validar: pasajeroNombre (String, mínimo 3 caracteres)
        if (!pasajeroNombre || typeof pasajeroNombre !== 'string' || pasajeroNombre.trim().length < 3) {
            return res.status(400).json({ success: false, message: "El 'pasajeroNombre' es requerido y debe tener al menos 3 caracteres." });
        }

        // 📦 2. Validar: destinoNombre (String, mínimo 3 caracteres)
        if (!destinoNombre || typeof destinoNombre !== 'string' || destinoNombre.trim().length < 3) {
            return res.status(400).json({ success: false, message: "El 'destinoNombre' es requerido y debe ser una ubicación válida." });
        }

        // 📦 3. Validar: conductorId (String no vacío)
        if (!conductorId || typeof conductorId !== 'string' || conductorId.trim() === '') {
            return res.status(400).json({ success: false, message: "El 'conductorId' es obligatorio para realizar la asignación de la unidad." });
        }

        // 📦 4. Validar: fleetId (String identificador de la cooperativa)
        if (!fleetId || typeof fleetId !== 'string' || fleetId.trim() === '') {
            return res.status(400).json({ success: false, message: "El 'fleetId' (identificador de la cooperativa/flota) es requerido." });
        }

        // 💡 5. Validar y Sanitizar: tarifa (Número real positivo)
        const tarifaNumerica = parseFloat(tarifa);
        if (isNaN(tarifaNumerica) || tarifaNumerica <= 0) {
            return res.status(400).json({ success: false, message: "La 'tarifa' debe ser un número positivo válido." });
        }

        // Sanitizar y mutar el payload con el tipo nativo correcto para blindar operaciones en Firestore/MongoDB
        req.body.tarifa = tarifaNumerica;
        req.body.pasajeroNombre = String(pasajeroNombre).trim();
        req.body.destinoNombre = String(destinoNombre).trim();
        req.body.conductorId = String(conductorId).trim();
        req.body.fleetId = String(fleetId).trim();

        // 🌉 6. PUENTE DE RETROCOMPATIBILIDAD (Normalización determinista con crypto.randomUUID)
        // Si el frontend no envió un 'viajeId' explícito, la aduana lo fabrica usando UUIDs nativos de alta entropía
        if (!viajeId) {
            req.body.viajeId = `V_INT_${Date.now()}_${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
        }

    } else {
        // ==================================================================\
        // FLUJO URBANO HISTÓRICO (PRESERVACIÓN DE LÓGICA PREVIA)
        // ==================================================================\

        // 1. Validar campo obligatorio: viajeId (Identificador del Servicio)
        if (viajeId === undefined || viajeId === null) {
            return res.status(400).json({ success: false, error: "El campo 'viajeId' es requerido." });
        }
        if (typeof viajeId !== 'string' || viajeId.trim() === '') {
            return res.status(400).json({ success: false, error: "El campo 'viajeId' no puede ser una cadena vacía." });
        }

        // 2. Validar campo obligatorio: conductorId (Identificador del Operador)
        if (conductorId === undefined || conductorId === null) {
            return res.status(400).json({ success: false, error: "El campo 'conductorId' es requerido." });
        }
        if (typeof conductorId !== 'string' || conductorId.trim() === '') {
            return res.status(400).json({ success: false, error: "El campo 'conductorId' no puede ser una cadena vacía." });
        }

        // 3. Validar campo obligatorio: tarifa (Estructura transaccional del servicio)
        if (tarifa === undefined || tarifa === null) {
            return res.status(400).json({ success: false, error: "El campo 'tarifa' es requerido." });
        }
        
        const tarifaNum = Number(tarifa);
        if (isNaN(tarifaNum)) {
            return res.status(400).json({ success: false, error: "El campo 'tarifa' debe ser un valor numérico válido." });
        }
        if (tarifaNum <= 0) {
            return res.status(400).json({ success: false, error: "La 'tarifa' de despacho debe ser un número real positivo mayor a cero." });
        }
        
        // Sanitizar y mutar el payload con el tipo nativo correcto para blindar operaciones en Firestore/MongoDB
        req.body.tarifa = tarifaNum;
    }

    // ==================================================================\
    // NORMALIZACIÓN DE CANAL FINANCIERO COMPARTIDO (CIMCO-GATEWAY)
    // ==================================================================\
    if (metodoPago !== undefined && metodoPago !== null) {
        if (typeof metodoPago !== 'string') {
            return res.status(400).json({ success: false, error: "El campo 'metodoPago' debe ser una cadena de texto." });
        }
        
        const metodoFormateado = metodoPago.toUpperCase().trim();
        const metodosValidos = ['WALLET', 'EFECTIVO', 'QR'];
        
        if (!metodosValidos.includes(metodoFormateado)) {
            return res.status(400).json({ 
                success: false, 
                error: `El método de pago '${metodoPago}' no es válido para el ecosistema CIMCO. Use: WALLET, EFECTIVO o QR.` 
            });
        }
        // Asignar el string sanitizado y formateado al cuerpo de la petición
        req.body.metodoPago = metodoFormateado;
    } else {
        // Valor por defecto en ausencia de la llave
        req.body.metodoPago = 'EFECTIVO';
    }

    next();
};

export default {
    body,
    param,
    query,
    check,
    validationResult,
    validate,
    validarRegistro,
    validarDespacho
};