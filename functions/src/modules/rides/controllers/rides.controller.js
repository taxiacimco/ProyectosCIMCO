/**
 * modules/rides/controllers/rides.controller.js
 * Controlador maestro de viajes TAXIA CIMCO
 * Misión: Orquestar el flujo de servicios (Mototaxi, Intermunicipal, etc.)
 */
import RideService from "../services/rides.service.js"; 
import HttpResponse from "../../../utils/http-response.js"; 
import { asyncHandler } from "../../../middleware/async-handler.js";

// Instanciamos el servicio de lógica de negocio
const rideService = new RideService();

/**
 * Crear un nuevo viaje
 * Soporta: Mototaxi, Motoparrillero, Motocarga y Vehículo Intermunicipal
 */
export const createRide = asyncHandler(async (req, res) => {
    const uid = req.user?.uid; 
    const { tipoServicio, cooperativaSolicitada, origen, destino, tarifa } = req.body;

    if (!tipoServicio) {
        return HttpResponse.badRequest(res, "El tipo de servicio es obligatorio.");
    }

    // Lógica de asignación de flujo: Intermunicipal requiere intervención de un Despachador
    const requiereDespachador = (tipoServicio === 'Vehiculo Intermunicipal');

    const rideData = {
        requesterUid: uid,
        tipoServicio,
        cooperativaSolicitada: requiereDespachador ? cooperativaSolicitada : 'N/A',
        requiereDespachador,
        status: "pending",
        origen,
        destino,
        tarifa,
        createdAt: new Date().toISOString()
    };

    const ride = await rideService.create(rideData);
    return HttpResponse.created(res, ride, `Solicitud de ${tipoServicio} creada correctamente.`);
});

/**
 * 🛡️ ACEPTAR VIAJE (CON VALIDACIÓN BANCARIA)
 * Captura errores de negocio como SALDO_INSUFICIENTE lanzados por el Service.
 */
export const aceptarViaje = asyncHandler(async (req, res) => {
    const { viajeId, conductorId } = req.body;
    
    if (!viajeId || !conductorId) {
        return HttpResponse.badRequest(res, "ID de viaje y conductor son requeridos.");
    }

    try {
        const result = await RideService.acceptRide(viajeId, conductorId);
        return HttpResponse.ok(res, result, "Viaje asignado correctamente.");
    } catch (error) {
        console.error("[CIMCO-CONTROLLER] Error al aceptar viaje:", error.message);

        // Filtro de Errores de Negocio (Arquitectura Hexagonal)
        if (error.message === "SALDO_INSUFICIENTE") {
            return HttpResponse.error(res, "Saldo insuficiente. Debes recargar para aceptar servicios.", 403, "DEUDA_EXCEDIDA");
        }

        if (error.message === "VIAJE_YA_TOMADO") {
            return HttpResponse.error(res, "Este viaje ya fue tomado por otro conductor.", 409, "ALREADY_TAKEN");
        }

        if (error.message === "VIAJE_NO_ENCONTRADO") {
            return HttpResponse.notFound(res, "El viaje especificado no existe.");
        }

        throw error; // Deja que el errorHandler general maneje lo demás
    }
});

/**
 * Listar viajes de servicios directos (Para conductores de Moto)
 */
export const listPendingDirectRides = asyncHandler(async (req, res) => {
    const rides = await rideService.findAll({ 
        status: "pending", 
        requiereDespachador: false 
    });
    return HttpResponse.ok(res, rides, "Viajes directos disponibles.");
});

/**
 * Listar viajes por Cooperativa (Para el panel del Despachador)
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
    return HttpResponse.ok(res, rides, `Viajes pendientes para ${cooperativeName}.`);
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

// Exportación como objeto para compatibilidad con RidesController.method
export default {
    createRide,
    aceptarViaje,
    listPendingDirectRides,
    listPendingByCooperative,
    getRideById,
    myRides,
    updateStatus
};