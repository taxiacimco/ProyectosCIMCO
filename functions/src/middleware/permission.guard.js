// functions/src/middleware/permission.guard.js

/**
 * =================================================================
 * MIDDLEWARE: PERMISSION GUARD
 * =================================================================
 * Crea un middleware de Express para Cloud Functions que verifica si
 * el rol del usuario autenticado (extraído de req.user.role) tiene
 * un permiso específico antes de permitir el acceso a la ruta.
 */

const { hasPermission, AppPermission } = require('../services/rbac.service');

/**
 * Retorna una función middleware que verifica un permiso específico.
 * * Uso: router.post('/ruta', authGuard, permissionGuard(AppPermission.MANAGE_USERS), controlador);
 *
 * @param {string} requiredPermission - El permiso necesario de la constante AppPermission.
 * @returns {function} Función middleware de Express.
 */
const permissionGuard = (requiredPermission) => {
    // 1. Verificar que el permiso sea válido y requerido
    if (!Object.values(AppPermission).includes(requiredPermission)) {
        console.error(`PermissionGuard ERROR: Permiso requerido inválido: ${requiredPermission}`);
        // Retorna un middleware que siempre falla si la configuración es incorrecta
        return (req, res, next) => res.status(500).send({ error: 'Internal server configuration error.' });
    }

    return (req, res, next) => {
        // 2. Asumimos que la autenticación previa ha adjuntado el usuario (con el rol) a la solicitud
        const user = req.user; 

        if (!user || !user.role) {
            // Usuario no autenticado o rol no definido (esto debería ser manejado por authGuard)
            return res.status(401).send({ error: 'Acceso denegado. Se requiere autenticación.' });
        }

        const userRole = user.role;

        // 3. Usar el servicio RBAC para la verificación
        if (hasPermission(userRole, requiredPermission)) {
            // El usuario tiene el permiso, continuar
            next();
        } else {
            // 4. No tiene el permiso requerido
            console.warn(`Intento de acceso denegado. Rol: ${userRole}, Permiso requerido: ${requiredPermission}`);
            return res.status(403).send({ 
                error: 'Acceso no autorizado.',
                message: `Su rol (${userRole}) no tiene el permiso requerido: ${requiredPermission}.`
            });
        }
    };
};

module.exports = permissionGuard;