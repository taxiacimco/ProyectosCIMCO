/**
 * modules/despatch/controllers/despatch.controller.js
 * Controlador para operaciones del despachador intermunicipal.
 */

import { asyncHandler } from "../../../middleware/async-handler.js";
import DespatchService from "../services/despatch.service.js";
import HttpResponse from "../../../utils/http-response.js";

/**
 * Asignar un conductor a un viaje
 */
const assignDriver = asyncHandler(async (req, res) => {
    const { rideId, driverId } = req.body;

    const result = await DespatchService.assignDriver({
        rideId,
        driverId,
    });

    return HttpResponse.ok(res, result, "Conductor asignado correctamente");
});

/**
 * Obtener viajes pendientes de despacho
 */
const pendingRides = asyncHandler(async (_req, res) => {
    const rides = await DespatchService.getPendingRides();
    return HttpResponse.ok(res, rides, "Viajes pendientes");
});

// Agrupamos las funciones en un objeto para una exportación limpia
const despatchController = {
    assignDriver,
    pendingRides
};

// ✅ EXPORTACIÓN POR DEFECTO REQUERIDA PARA NODE 20 / ESM
export default despatchController;