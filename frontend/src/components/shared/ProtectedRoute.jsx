// Versión Arquitectura: V21.46 - Anti-Loop LocalStorage Token Hydration Guard
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\shared\ProtectedRoute.jsx
 * Misión: Guardián de rutas con inspección síncrona de token para evitar bucles de navegación
 *         entre /login y el dashboard administrativo durante la hidratación de sesión.
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

  // Verificación síncrona de token en almacenamiento local
  const hasToken = Boolean(
    localStorage.getItem('token') || 
    localStorage.getItem('cimco_token') || 
    localStorage.getItem('cimco_last_user_identifier')
  );

  // 1. Mientras la sesión esté cargando O exista token pero el objeto 'user' aún no se haya hidratado
  if (loading || (hasToken && !user)) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] text-white p-4">
        <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center shadow-2xl space-y-4 max-w-sm w-full text-center">
          <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-sm font-medium tracking-wide text-zinc-400 animate-pulse">
            Sincronizando perfil de usuario...
          </p>
        </div>
      </div>
    );
  }

  // 2. Si no hay autenticación confirmada ni token guardado -> Redirigir a Login
  if ((!isAuthenticated && !user) && !hasToken) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Normalización de datos del usuario
  const userAccessLevel = user?.access_level ?? user?.nivelAcceso ?? user?.level;
  const userSubrol = user?.subrol ?? user?.subRole ?? user?.sub_rol ?? user?.tipoConductor;
  const userRole = (user?.rol ?? user?.role ?? user?.tipoUsuario ?? '').toString().toLowerCase().trim();

  // 3. Bypass Maestro para Roles de Control (Admin / CEO / Despacho)
  const isMasterRole = ['admin', 'superadmin', 'ceo', 'administrador', 'despachador'].includes(userRole);
  if (isMasterRole) {
    return children ? children : <Outlet />;
  }

  const safeFallback = '/unauthorized';

  // 4. Validaciones de Subroles / Niveles para roles estándar
  if (allowedAccessLevels.length > 0) {
    const hasValidLevel = allowedAccessLevels.some(
      (level) => userAccessLevel !== undefined && String(level).trim() === String(userAccessLevel).trim()
    );
    if (!hasValidLevel) return <Navigate to={safeFallback} replace />;
  }

  if (allowedSubroles.length > 0) {
    const hasValidSubrole = allowedSubroles.some(
      (sub) => userSubrol && String(sub).trim().toLowerCase() === String(userSubrol).trim().toLowerCase()
    );
    if (!hasValidSubrole) return <Navigate to={safeFallback} replace />;
  }

  if (allowedRoles.length > 0) {
    const hasValidRole = allowedRoles.some((role) => {
      const targetRole = String(role).trim().toLowerCase();
      if (userRole === targetRole) return true;
      if (userRole === 'conductor' && ['mototaxi', 'motoparrillero', 'motocarga', 'intermunicipal'].includes(targetRole)) {
        return true;
      }
      return false;
    });

    if (!hasValidRole) return <Navigate to={safeFallback} replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;