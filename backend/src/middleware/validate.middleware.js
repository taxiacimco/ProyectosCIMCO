// Versión Arquitectura: V19.1 - Aduana Perimetral Nativa y Fusión Atómica de Despacho Híbrido Urbano e Intermunicipal
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\middleware\validate.middleware.js
 * Misión: Validar y sanitizar los payloads de despacho perimetral (Urbano e Intermunicipal) antes de impactar el bus síncrono.
 * Ajuste V19.1: Fusión atómica del middleware histórico 'validarDespacho' conservando las validaciones urbanas,
 * junto con la asimilación quirúrgica de las llaves intermunicipales (pasajeroNombre, destinoNombre, fleetId) 
 * y puente de retrocompatibilidad determinista para evitar regresiones operativas en viaje.controller.js.
 */

/**
 * @param {Object} req - Petición entrante desde el bus de pasajeros urbanos e intermunicipales
 * @param {Object} res - Objeto de respuesta HTTP central
 * @param {Function} next - Hilo de ejecución hacia el controlador transaccional
 */
export const validarDespacho = (req, res, next) => {
    // 🛡️ Guarda Anti-Undefined: Verificar que exista el cuerpo del mensaje de forma perimetral
    if (!req || !req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ 
            success: false, 
            error: "⚠️ ALERTA DE ARQUITECTURA: Cuerpo de la petición (req.body) ausente o corrupto en el bus." 
        });
    }

    const { viajeId, conductorId, tarifa, metodoPago, pasajeroNombre, destinoNombre, fleetId } = req.body;

    // 🕵️ DETECCIÓN OPERATIVA: Identificar si el payload corresponde al ecosistema Intermunicipal Novedoso
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

        // 🌉 6. PUENTE DE RETROCOMPATIBILIDAD (Normalización para viaje.controller.js)
        // Si el frontend no envió un 'viajeId' explícito, la aduana lo fabrica de forma determinista
        if (!viajeId) {
            req.body.viajeId = `V_INT_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
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