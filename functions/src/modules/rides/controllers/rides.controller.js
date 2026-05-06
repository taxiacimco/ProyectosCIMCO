// Versión Arquitectura: V3.0 - Despacho Híbrido (Directo vs Cooperativa)
/**
 * modules/rides/controllers/rides.controller.js
 * Controlador maestro de viajes TAXIA CIMCO
 * Misión: Orquestar el flujo de servicios (Mototaxi, Intermunicipal, etc.)
 */
import RideService from "../services/rides.service.js"; 
import HttpResponse from "../../../utils/http-response.js"; 
import { asyncHandler } from "../../../middleware/async-handler.js";

const rideService = new RideService();

/**
 * 🏍️ 1. CREAR VIAJE DIRECTO (Radar 5km)
 * Soporta: mototaxi, motoparrillero, motocarga
 * Va directo al conductor sin pasar por despachador.
 */
export const createDirectRide = asyncHandler(async (req, res) => {
    const uid = req.user?.uid; 
    const { tipoServicio, origen, destino, tarifa, locationGeoHash } = req.body;

    if (!tipoServicio || !['mototaxi', 'motoparrillero', 'motocarga'].includes(tipoServicio)) {
        return HttpResponse.badRequest(res, "Tipo de servicio directo inválido o ausente.");
    }

    const rideData = {
        requesterUid: uid,
        tipoServicio,
        cooperativaSolicitada: 'N/A',
        requiereDespachador: false, // CLAVE: No usa despachador
        dispatchMode: 'direct',
        status: "pending",
        origen,
        destino,
        tarifa,
        locationGeoHash: locationGeoHash || null, // Para futura búsqueda geoespacial
        createdAt: new Date().toISOString()
    };

    const ride = await rideService.create(rideData);
    return HttpResponse.created(res, ride, `Solicitud de ${tipoServicio} enviada al radar.`);
});

/**
 * 🚌 2. CREAR VIAJE POR COOPERATIVA (Intermunicipal)
 * Requiere intervención de un Despachador de la cooperativa específica.
 */
export const createCooperativeRide = asyncHandler(async (req, res) => {
    const uid = req.user?.uid; 
    const { tipoServicio, cooperativaSolicitada, origen, destino, tarifa } = req.body;

    if (!cooperativaSolicitada) {
         return HttpResponse.badRequest(res, "Debe especificar la cooperativa para este servicio.");
    }

    const rideData = {
        requesterUid: uid,
        tipoServicio: tipoServicio || 'intermunicipal',
        cooperativaSolicitada,
        requiereDespachador: true, // CLAVE: Va a la bandeja del despachador
        dispatchMode: 'managed',
        status: "pending",
        origen,
        destino,
        tarifa,
        createdAt: new Date().toISOString()
    };

    const ride = await rideService.create(rideData);
    return HttpResponse.created(res, ride, `Solicitud enviada a la taquilla de ${cooperativaSolicitada}.`);
});

/**
 * 🛡️ ACEPTAR VIAJE (CON VALIDACIÓN BANCARIA)
 */
export const aceptarViaje = asyncHandler(async (req, res) => {
    const { viajeId, conductorId } = req.body;
    
    if (!viajeId || !conductorId) {
        return HttpResponse.badRequest(res, "ID de viaje y conductor son requeridos.");
    }

    try {
        const result = await rideService.acceptRide(viajeId, conductorId); // Corrección: rideService minúscula
        return HttpResponse.ok(res, result, "Viaje asignado correctamente.");
    } catch (error) {
        console.error("[CIMCO-CONTROLLER] Error al aceptar viaje:", error.message);

        if (error.message === "SALDO_INSUFICIENTE") {
            return HttpResponse.error(res, "Saldo insuficiente. Debes recargar.", 403, "DEUDA_EXCEDIDA");
        }
        if (error.message === "VIAJE_YA_TOMADO") {
            return HttpResponse.error(res, "Este viaje ya fue tomado.", 409, "ALREADY_TAKEN");
        }
        if (error.message === "VIAJE_NO_ENCONTRADO") {
            return HttpResponse.notFound(res, "El viaje especificado no existe.");
        }

        throw error;
    }
});

/**
 * 📡 LISTAR VIAJES DIRECTOS (Radar de Motos)
 */
export const listPendingDirectRides = asyncHandler(async (req, res) => {
    const rides = await rideService.findAll({ 
        status: "pending", 
        requiereDespachador: false 
    });
    return HttpResponse.ok(res, rides, "Viajes directos disponibles en tu zona.");
});

/**
 * 🏢 LISTAR VIAJES POR COOPERATIVA (Panel Despachador)
 */
export const listPendingByCooperative = asyncHandler(async (req, res) => {
    const { cooperativeName } = req.params;

    if (!cooperativeName) {
        return HttpResponse.badRequest(res, "Debe especificar la cooperativa.");
    }

    const rides = await rideService.findAll({ 
        status: "pending", 
        cooperativaSolicitada: cooperativeName,
        requiereDespachador: true 
    });
    return HttpResponse.ok(res, rides, `Taquilla de ${cooperativeName} actualizada.`);
});

/**
 * Obtener viaje por ID
 */
export const getRideById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const ride = await rideService.findById(id); 

    if (!ride) return HttpResponse.notFound(res, "Viaje no encontrado.");
    return HttpResponse.ok(res, ride, "Detalle del viaje obtenido.");
});

/**
 * Listar viajes del usuario autenticado (Historial)
 */
export const myRides = asyncHandler(async (req, res) => {
    const uid = req.user?.uid;
    const rides = await rideService.findAll({ requesterUid: uid });
    return HttpResponse.ok(res, rides, "Historial de mis viajes obtenido.");
});

/**
 * Actualizar estado (Iniciar, Finalizar, Cancelar)
 */
export const updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; 

    const updatedRide = await rideService.updateStatus(id, status);

    if (!updatedRide) {
         return HttpResponse.error(res, "No se pudo actualizar el estado.", 400);
    }
    return HttpResponse.ok(res, updatedRide, `Estado actualizado a ${status}.`);
});

export default {
    createDirectRide,      // NUEVO
    createCooperativeRide, // NUEVO
    aceptarViaje,
    listPendingDirectRides,
    listPendingByCooperative,
    getRideById,
    myRides,
    updateStatus
};