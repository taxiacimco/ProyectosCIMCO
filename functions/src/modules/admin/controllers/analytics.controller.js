/**
 * modules/admin/controllers/analytics.controller.js
 * Controlador para métricas y analíticas del sistema.
 * No contiene lógica de negocio.
 */

import { asyncHandler } from "../../../middleware/async-handler.js";
import HttpResponse from "../../../utils/http-response.js";
import AnalyticsService from "../services/analytics.service.js";

/**
 * @class AnalyticsController
 */
class AnalyticsController {

  /**
   * Obtener métricas generales del sistema
   */
  overview = asyncHandler(async (_req, res) => {
    const data = await AnalyticsService.getOverview();
    return HttpResponse.ok(res, data, "Métricas generales");
  });

  /**
   * Métricas de viajes
   */
  rides = asyncHandler(async (_req, res) => {
    const data = await AnalyticsService.getRidesStats();
    return HttpResponse.ok(res, data, "Métricas de viajes");
  });

  /**
   * Métricas de conductores
   */
  drivers = asyncHandler(async (_req, res) => {
    const data = await AnalyticsService.getDriversStats();
    return HttpResponse.ok(res, data, "Métricas de conductores");
  });
}

export default new AnalyticsController();
