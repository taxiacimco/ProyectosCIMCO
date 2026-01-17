// src/modules/auth/services/rbac.service.js
import ROLES from '../../../config/app.roles.js';

/**
 * RBAC Service (Role-Based Access Control)
 * Centraliza la lógica de permisos complejos.
 */
export const rbacService = {
    /**
     * Verifica si un rol tiene permisos de nivel administrativo
     */
    isAdmin: (role) => {
        return role === ROLES.ADMIN || role === ROLES.CEO;
    },

    /**
     * Retorna los permisos básicos por rol
     */
    getPermissionsByRole: (role) => {
        const permissions = {
            [ROLES.ADMIN]: ['all'],
            [ROLES.CEO]: ['view_analytics', 'manage_users'],
            [ROLES.CONDUCTOR]: ['update_location', 'accept_ride'],
            [ROLES.USUARIO]: ['request_ride', 'view_history']
        };
        return permissions[role] || [];
    }
};

export default rbacService;