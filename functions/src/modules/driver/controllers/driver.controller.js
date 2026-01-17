/**
 * modules/driver/controllers/driver.controller.js
 *
 * Controlador limpio:
 * - Sin lógica de negocio
 * - Usa req.user.uid (Auth Guard)
 * - Manejo de errores centralizado
 */

import DriverService from "../services/driver.service.js";
import HttpResponse from "../../../utils/http-response.js";
import { asyncHandler } from "../../../middleware/async-handler.js";

/**
 * @class DriverController
 * Maneja las solicitudes HTTP relacionadas con conductores.
 */
class DriverController {

  /**
   * Actualiza la ubicación del conductor autenticado.
   * Body esperado: { lat, lng }
   */
  updateLocation = asyncHandler(async (req, res) => {
    const uid = req.user.uid;
    const { lat, lng } = req.body;

    const result = await DriverService.updateLocation({
      driverId: uid,
      lat,
      lng,
    });

    return HttpResponse.ok(res, result, "Ubicación actualizada");
  });

  /**
   * Obtiene el perfil del conductor autenticado.
   */
  profile = asyncHandler(async (req, res) => {
    const uid = req.user.uid;

    const driver = await DriverService.getByUid(uid);
    return HttpResponse.ok(res, driver, "Perfil conductor");
  });

  /**
   * Lista todos los conductores (ADMIN).
   */
  listDrivers = asyncHandler(async (_req, res) => {
    const list = await DriverService.listAll();
    return HttpResponse.ok(res, list, "Listado conductores");
  });

  /**
   * Aprueba un conductor por ID (ADMIN).
   */
  approveDriver = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const updated = await DriverService.approveDriver(id);
    return HttpResponse.ok(res, updated, "Conductor aprobado");
  });
}

// Exporta una única instancia
export default new DriverController();
