/**
 * modules/rides/controllers/trip.controller.js
 * Controlador de acciones tácticas del viaje (Asignar, Iniciar, Finalizar)
 * TAXIA CIMCO - Adaptado para servicios directos y cooperativas.
 */

import RideService from "../services/rides.service.js";
import HttpResponse from "../../../utils/http-response.js";
import { asyncHandler } from "../../../middleware/async-handler.js";

/**
 * Asignar conductor a un viaje
 * Se utiliza tanto para despachadores como para asignaciones automáticas.
 */
const assignDriver = asyncHandler(async (req, res) => {
    // tripId puede venir del body o params según tu preferencia de API
    const { tripId, driverId } = req.body;
    
    // Capturamos quién hace la asignación (Despachador/Admin)
    const assignedBy = req.user?.uid; 

    // Pasamos los datos al servicio. 
    const trip = await RideService.assignDriver(tripId, driverId, assignedBy);
    
    return HttpResponse.ok(res, trip, "Conductor vinculado al servicio exitosamente");
});

/**
 * Iniciar viaje
 * Lo llama el conductor (Mototaxista o Intermunicipal) al recoger al pasajero.
 */
const startTrip = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // El servicio actualizará el estado a 'in_progress'
    const trip = await RideService.startTrip(id);
    return HttpResponse.ok(res, trip, "Viaje iniciado. En ruta al destino.");
});

/**
 * Finalizar viaje
 * El conductor completa el servicio.
 */
const endTrip = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const trip = await RideService.endTrip(id);
    return HttpResponse.ok(res, trip, "Viaje finalizado con éxito.");
});

// Agrupamos en un objeto para exportación limpia
const tripController = {
    assignDriver,
    startTrip,
    endTrip
};

// ✅ EXPORTACIÓN POR DEFECTO CORREGIDA PARA ESM/NODE 20
export default tripController;