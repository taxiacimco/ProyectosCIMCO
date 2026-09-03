// Versión Arquitectura: V21.43 - Anti-Loop Defense & Permissive Admin Access
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\shared\ProtectedRoute.jsx
 * Misión: Guardián de rutas con protección anti-bucle infinito y bypass defensivo para administradores.
 */

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const ProtectedRoute = ({
  allowedAccessLevels = [],
  allowedSubroles = [],
  allowedRoles = [],
  redirectTo = '/login',
  children
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] text-white p-4">
        <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center shadow-2xl space-y-4 max-w-sm w-full text-center">
          <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-sm font-medium tracking-wide text-zinc-400 animate-pulse">
            Verificando credenciales de acceso...
          </p>
        </div>
      </div>
    );
  }

  // 1. Sin sesión activa: Redirigir a la página de autenticación
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Extracción defensiva de roles y niveles de acceso
  const userAccessLevel = user?.access_level ?? user?.nivelAcceso ?? user?.level;
  const userSubrol = user?.subrol ?? user?.subRole ?? user?.sub_rol ?? user?.tipoConductor;
  const userRole = (user?.rol ?? user?.role ?? user?.tipoUsuario ?? '').toString().toLowerCase().trim();

  // Bypass Maestro: Administradores y CEO superan filtros restrictivos de subrol
  const isAdmin = userRole === 'admin' || userRole === 'superadmin' || userRole === 'ceo';

  if (!isAdmin) {
    // 2. Validación de Nivel de Acceso (Usuarios estándar)
    if (allowedAccessLevels.length > 0) {
      const hasValidLevel = allowedAccessLevels.some(
        (level) => userAccessLevel !== undefined && String(level).trim() === String(userAccessLevel).trim()
      );
      if (!hasValidLevel) {
        console.warn(`🔒 [ProtectedRoute] Acceso rechazado por Nivel (${userAccessLevel}). Requeridos:`, allowedAccessLevels);
        return <Navigate to="/unauthorized" replace />;
      }
    }

    // 3. Validación de Subrol (Usuarios estándar)
    if (allowedSubroles.length > 0) {
      const hasValidSubrole = allowedSubroles.some(
        (sub) => userSubrol && String(sub).trim().toLowerCase() === String(userSubrol).trim().toLowerCase()
      );
      if (!hasValidSubrole) {
        console.warn(`🔒 [ProtectedRoute] Acceso rechazado por Subrol (${userSubrol}). Requeridos:`, allowedSubroles);
        return <Navigate to="/unauthorized" replace />;
      }
    }

    // 4. Validación de Rol Principal
    if (allowedRoles.length > 0) {
      const hasValidRole = allowedRoles.some((role) => {
        const targetRole = String(role).trim().toLowerCase();
        if (userRole === targetRole) return true;
        if (userRole === 'conductor' && ['mototaxi', 'motoparrillero', 'motocarga', 'intermunicipal'].includes(targetRole)) {
          return true;
        }
        return false;
      });

      if (!hasValidRole) {
        console.warn(`🔒 [ProtectedRoute] Acceso rechazado por Rol (${userRole}). Requeridos:`, allowedRoles);
        return <Navigate to="/unauthorized" replace />;
      }
    }
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;