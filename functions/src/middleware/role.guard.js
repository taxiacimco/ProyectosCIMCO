// Versión Arquitectura: V2.1 - Guardia de Roles Multi-Acceso
/**
 * functions/src/middleware/role.guard.js
 * PROYECTO: TAXIA CIMCO
 * Misión: Restringir acceso basándose estrictamente en la jerarquía de roles.
 */
import { sendErrorResponse } from '../utils/http-response.js';

/**
 * @param {Array|string} allowedRoles - Rol o lista de roles permitidos.
 */
export const roleGuard = (allowedRoles) => {
  const rolesAllowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  // Normalización para evitar discrepancias por mayúsculas/minúsculas
  const normalizedAllowedRoles = rolesAllowed.map((r) => String(r).toUpperCase());

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return sendErrorResponse(res, "Acceso denegado: Rol no definido.", 403, "ROLE_UNDEFINED");
    }

    const userRole = String(req.user.role).toUpperCase();

    // Verificación de pertenencia
    if (normalizedAllowedRoles.includes(userRole)) {
      return next();
    }

    console.warn(`🚫 [403 FORBIDDEN]: UID=${req.user.uid} | Role=${userRole} no autorizado para esta ruta.`);

    return sendErrorResponse(
      res, 
      `El rol ${userRole} no tiene acceso a este recurso.`, 
      403, 
      "FORBIDDEN_ROLE"
    );
  };
};

export default roleGuard;