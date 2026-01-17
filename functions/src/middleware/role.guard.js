// src/middleware/role.guard.js
import ROLES from '../config/app.roles.js';

/**
 * roleGuard (Multi-Role Hardened)
 * Controla acceso basado en roles usando la configuración centralizada.
 */
const roleGuard = (allowedRoles) => {
  if (!allowedRoles || (Array.isArray(allowedRoles) && allowedRoles.length === 0)) {
    throw new Error("roleGuard requiere al menos un rol permitido (allowedRoles)");
  }

  const rolesAllowed = Array.isArray(allowedRoles)
    ? allowedRoles
    : allowedRoles instanceof Set
    ? Array.from(allowedRoles)
    : [allowedRoles];

  const normalizedAllowedRoles = rolesAllowed.map((r) => String(r).toLowerCase());

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado: usuario o rol no definido",
      });
    }

    const userRole = String(req.user.role).toLowerCase();

    if (normalizedAllowedRoles.includes(userRole)) {
      return next();
    }

    console.warn(`🚫 403 FORBIDDEN | UID=${req.user.uid} | ROLE=${userRole} | PATH=${req.originalUrl}`);

    return res.status(403).json({
      success: false,
      message: "Acceso denegado: permisos insuficientes",
    });
  };
};

export default roleGuard;