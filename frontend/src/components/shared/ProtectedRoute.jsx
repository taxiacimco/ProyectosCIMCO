// Versión Arquitectura: V16.4 - Preservación de Estado de Navegación (location.state) y Blindaje Anti-TypeError en Roles
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const ProtectedRoute = ({ allowedRoles = [], safeFallback = '/login', children }) => {
  const authContext = useAuth() || {};
  const { user, loading } = authContext;
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d1a] flex items-center justify-center p-4 font-sans text-slate-100">
        <div className="flex flex-col items-center gap-3 bg-[#121214]/80 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-2xl">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-300">
            Verificando Permisos Perimetrales...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={safeFallback} state={{ from: location }} replace />;
  }

  // Normalización polimórfica de propiedades de rol y niveles de acceso
  const currentRole = (user?.role || user?.rol || user?.tipoUsuario || '').toLowerCase();
  const currentSubrole = (user?.subrol || user?.tipoConductor || user?.tipoVehiculo || '').toLowerCase();
  const accessLevel = user?.access_level ?? user?.nivelAcceso ?? 0;

  // Blindaje anti-TypeError sanitizando elementos no cadenas, nulos o indefinidos en allowedRoles
  const rolesPermitidos = (Array.isArray(allowedRoles) ? allowedRoles : [])
    .filter((r) => r !== null && r !== undefined)
    .map((r) => String(r).toLowerCase());

  // El rol 'ceo' o un nivel de acceso >= 8 sobrepasa restricciones administrativas
  const esSuperUsuario = currentRole === 'ceo' || accessLevel >= 8;

  const tieneRolValido =
    rolesPermitidos.length === 0 ||
    rolesPermitidos.includes(currentRole) ||
    rolesPermitidos.includes(currentSubrole) ||
    esSuperUsuario;

  if (!tieneRolValido) {
    return <Navigate to={safeFallback} state={{ from: location }} replace />;
  }

  // Permite uso como envolvente de children o como Layout Route con <Outlet />
  return children ? children : <Outlet />;
};

export default ProtectedRoute;