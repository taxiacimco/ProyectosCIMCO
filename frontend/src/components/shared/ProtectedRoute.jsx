// Versión Arquitectura: V21.40 - Implementación de Guardián de Rutas Protegidas (ProtectedRoute) con Evaluación Anti-Crash de access_level y subrol
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\shared\ProtectedRoute.jsx
 * Misión: Componente de seguridad perimetral para React Router que valida la sesión activa y los privilegios de usuario.
 * Integridad: Evalúa el estado de autenticación (useAuth), nivel de acceso (access_level) y subrol (subrol).
 * Aplica renderizado defensivo con fallback visual basado en el estándar CIMCO-UI V9.3 (Glassmorphism).
 */

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Componente ProtectedRoute
 * @param {Object} props
 * @param {Array<string|number>} [props.allowedAccessLevels] - Niveles de acceso requeridos para renderizar
 * @param {Array<string>} [props.allowedSubroles] - Subroles permitidos para acceso a la vista
 * @param {Array<string>} [props.allowedRoles] - Roles principales permitidos (compatibilidad legacy)
 * @param {string} [props.redirectTo="/login"] - Ruta alternativa de redirección en caso de no autenticación
 * @param {React.ReactNode} [props.children] - Subcomponentes opcionales a renderizar
 */
const ProtectedRoute = ({
  allowedAccessLevels = [],
  allowedSubroles = [],
  allowedRoles = [],
  redirectTo = '/login',
  children
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // 🛡️ ESTADO DE CARGA: Fallback visual estandardizado CIMCO-UI V9.3 (Glassmorphism)
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

  // 🛡️ VERIFICACIÓN DE SESIÓN ACTIVA
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 🛡️ BLINDAJE Y EXTRACCIÓN DEFENSIVA DE PROPIEDADES DE USUARIO
  const userAccessLevel = user?.access_level ?? user?.nivelAcceso ?? user?.level;
  const userSubrol = user?.subrol ?? user?.subRole ?? user?.sub_rol;
  const userRole = user?.rol ?? user?.role;

  // 🛡️ EVALUACIÓN POR NIVEL DE ACCESO (access_level)
  if (allowedAccessLevels.length > 0) {
    const hasValidLevel = allowedAccessLevels.some((level) => {
      if (userAccessLevel === undefined || userAccessLevel === null) return false;
      return String(level).trim() === String(userAccessLevel).trim();
    });

    if (!hasValidLevel) {
      return <Navigate to="/login" state={{ from: location, reason: 'unauthorized_access_level' }} replace />;
    }
  }

  // 🛡️ EVALUACIÓN POR SUBROL (subrol)
  if (allowedSubroles.length > 0) {
    const hasValidSubrole = allowedSubroles.some((subrol) => {
      if (!userSubrol) return false;
      return String(subrol).trim().toLowerCase() === String(userSubrol).trim().toLowerCase();
    });

    if (!hasValidSubrole) {
      return <Navigate to="/login" state={{ from: location, reason: 'unauthorized_subrole' }} replace />;
    }
  }

  // 🛡️ EVALUACIÓN POR ROL PRINCIPAL (rol)
  if (allowedRoles.length > 0) {
    const hasValidRole = allowedRoles.some((role) => {
      if (!userRole) return false;
      return String(role).trim().toLowerCase() === String(userRole).trim().toLowerCase();
    });

    if (!hasValidRole) {
      return <Navigate to="/login" state={{ from: location, reason: 'unauthorized_role' }} replace />;
    }
  }

  // 🚀 AUTORIZACIÓN EXITOSA: Renderiza hijos explícitos o el Outlet del enrutador
  return children ? children : <Outlet />;
};

export default ProtectedRoute;