// Versión Arquitectura: V2.0 - Guardia de Permisos RBAC (Migración a ESM)
/**
 * functions/src/middleware/permission.guard.js
 * PROYECTO: TAXIA CIMCO
 * Misión: Verificar permisos granulares antes de tocar la lógica de negocio.
 * ⚠️ ALERTA DE ARQUITECTURA: Se eliminó CommonJS (require) por incompatibilidad con Node 20 ESM.
 */
import { hasPermission, AppPermission } from '../services/rbac.service.js';
import { sendErrorResponse } from '../utils/http-response.js';

/**
 * Valida un permiso específico contra el rol del usuario en req.user.
 * @param {string} requiredPermission - Constante de AppPermission.
 */
export const permissionGuard = (requiredPermission) => {
    // 1. Verificación de integridad de la configuración
    if (!Object.values(AppPermission).includes(requiredPermission)) {
        console.error(`🚫 [PermissionGuard Config Error]: Permiso inválido: ${requiredPermission}`);
        return (req, res) => sendErrorResponse(res, "Error de configuración de permisos.", 500);
    }

    return (req, res, next) => {
        const user = req.user; 

        if (!user || !user.role) {
            return sendErrorResponse(res, "Acceso denegado. Identidad no verificada.", 401, "UNAUTHORIZED");
        }

        // 2. Evaluación lógica contra el servicio RBAC
        if (hasPermission(user.role, requiredPermission)) {
            next();
        } else {
            console.warn(`🛑 [RBAC DENIED]: UID ${user.uid} (Role: ${user.role}) intentó acceder a permiso: ${requiredPermission}`);
            return sendErrorResponse(
                res, 
                `No tienes el permiso requerido: ${requiredPermission}`, 
                403, 
                "INSUFFICIENT_PERMISSIONS"
            );
        }
    };
};