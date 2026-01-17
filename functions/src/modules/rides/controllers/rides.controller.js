/**
 * modules/rides/controllers/rides.controller.js
 * Controlador maestro de viajes TAXIA CIMCO
 */
import RideService from "../services/rides.service.js"; 
import { sendSuccessResponse, sendErrorResponse } from "../../../utils/responses.js"; 
import { asyncHandler } from "../../../middleware/async-handler.js";

// Instanciamos el servicio
const rideService = new RideService();

/**
 * Crear un nuevo viaje
 * Soporta: Mototaxi, Motoparrillero, Motocarga y Vehículo Intermunicipal
 */
const createRide = asyncHandler(async (req, res) => {
    const uid = req.user?.uid; 
    const { tipoServicio, cooperativaSolicitada, origen, destino, tarifa } = req.body;

    if (!tipoServicio) {
        return sendErrorResponse(res, "El tipo de servicio es obligatorio.", 400);
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
        createdAt: new Date()
    };

    const ride = await rideService.create(rideData);
    return sendSuccessResponse(res, ride, `Solicitud de ${tipoServicio} creada correctamente.`, 201);
});

/**
 * Listar viajes de servicios directos (Para conductores de Moto)
 */
const listPendingDirectRides = asyncHandler(async (req, res) => {
    const rides = await rideService.findAll({ 
        status: "pending", 
        requiereDespachador: false 
    });
    return sendSuccessResponse(res, rides, "Viajes directos disponibles");
});

/**
 * Listar viajes por Cooperativa (Para el panel del Despachador)
 */
const listPendingByCooperative = asyncHandler(async (req, res) => {
    const { cooperativeName } = req.params;

    if (!cooperativeName) {
        return sendErrorResponse(res, "Debe especificar el nombre de la cooperativa.", 400);
    }

    const rides = await rideService.findAll({ 
        status: "pending", 
        cooperativaSolicitada: cooperativeName,
        requiereDespachador: true 
    });
    return sendSuccessResponse(res, rides, `Viajes pendientes para ${cooperativeName}`);
});

/**
 * Obtener viaje por ID
 */
const getRideById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const ride = await rideService.findById(id); 

    if (!ride) {
        return sendErrorResponse(res, "Viaje no encontrado.", 404, "RIDE_NOT_FOUND");
    }
    return sendSuccessResponse(res, ride, "Detalle del viaje");
});

/**
 * Listar viajes del usuario autenticado
 */
const myRides = asyncHandler(async (req, res) => {
    const uid = req.user?.uid;
    const rides = await rideService.findAll({ requesterUid: uid });
    return sendSuccessResponse(res, rides, "Mis viajes");
});

/**
 * Actualizar estado (Aceptar, Iniciar, Finalizar, Cancelar)
 */
const updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; 

    const updatedRide = await rideService.updateStatus(id, status);

    if (!updatedRide) {
         return sendErrorResponse(res, "Viaje no encontrado o estado no válido.", 404);
    }
    return sendSuccessResponse(res, updatedRide, `Estado actualizado a ${status}.`);
});

// Agrupamos en un objeto para exportación limpia
const ridesController = {
    createRide,
    listPendingDirectRides,
    listPendingByCooperative,
    getRideById,
    myRides,
    updateStatus
};

// ✅ EXPORTACIÓN POR DEFECTO REQUERIDA PARA ESM
export default ridesController;