/**
 * modules/admin/controllers/admin.controller.js
 * Controlador para operaciones administrativas de TAXIA CIMCO.
 */

import { asyncHandler } from "../../../middleware/async-handler.js";
import HttpResponse from "../../../utils/http-response.js";
import AdminService from "../services/admin.service.js";

/**
 * Obtener información general del sistema
 */
const dashboard = asyncHandler(async (_req, res) => {
    const data = await AdminService.getDashboard();
    return HttpResponse.ok(res, data, "Dashboard obtenido");
});

/**
 * Listar usuarios
 */
const listUsers = asyncHandler(async (_req, res) => {
    const users = await AdminService.listUsers();
    return HttpResponse.ok(res, users, "Usuarios listados");
});

/**
 * Bloquear usuario
 */
const blockUser = asyncHandler(async (req, res) => {
    const { uid } = req.params;
    const result = await AdminService.blockUser(uid);
    return HttpResponse.ok(res, result, "Usuario bloqueado");
});

// Agrupamos en un objeto para exportación limpia
const adminController = {
    dashboard,
    listUsers,
    blockUser
};

// ✅ EXPORTACIÓN POR DEFECTO REQUERIDA POR ESM
export default adminController;