import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert, Lock } from 'lucide-react';

/**
 * Componente ProtectedRoute
 * Versión: 3.1.0 - Protocolo de Seguridad CIMCO
 * * Este componente actúa como un guardián de rutas (Route Guard) para asegurar
 * que solo usuarios con el rol adecuado accedan a paneles específicos.
 */
const ProtectedRoute = ({ allowedRoles }) => {
  // Extraemos currentRole, que es el que realmente tiene el rol validado desde Firestore/Claims
  const { user, loading, currentRole } = useAuth();
  const location = useLocation();

  // Registro de logs para monitoreo técnico en consola (CIMCO Monitoring)
  useEffect(() => {
    if (!loading && user) {
      console.log(`[CIMCO AUTH] 👤 Usuario: ${user.email} | 🔑 Rol: ${currentRole || 'Pendiente'}`);
    }
  }, [user, loading, currentRole]);

  // 1. PANTALLA DE CARGA (Branding CIMCO)
  // Se muestra mientras se verifica el token y se recupera el rol de Firestore
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            {/* Spinner animado con colores de la marca */}
            <div className="w-16 h-16 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin"></div>
            <Lock className="absolute inset-0 m-auto text-yellow-400 animate-pulse" size={20} />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-white font-black text-xs uppercase tracking-[0.3em] mb-2">Seguridad CIMCO</span>
            <div className="text-yellow-400/50 font-bold animate-pulse text-[10px] tracking-widest uppercase">
              Verificando Protocolos de Acceso...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. VERIFICACIÓN DE AUTENTICACIÓN
  // Si no hay usuario en el estado global, redirigir al Login
  if (!user) {
    console.warn("[CIMCO AUTH] 🚫 Bloqueado: Usuario no autenticado.");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. VALIDACIÓN DE ROLES
  // Si se definieron roles permitidos para esta ruta, compararlos con el rol actual
  if (allowedRoles) {
    // Convertimos todo a minúsculas para evitar discrepancias de mayúsculas/minúsculas
    const userRole = (currentRole || '').toLowerCase();
    const rolesPermitidos = allowedRoles.map(r => r.toLowerCase());
    
    const hasPermission = rolesPermitidos.includes(userRole);

    if (!hasPermission) {
      console.error(`[CIMCO AUTH] ❌ Acceso Denegado. Rol Actual: ${userRole} | Requeridos: ${allowedRoles}`);
      
      /**
       * Lógica de Redirección por Desvío de Seguridad:
       * Si un usuario intenta entrar a una zona prohibida, lo enviamos al Dashboard de Bienvenida
       * donde el sistema lo redistribuirá según su rol real.
       */
      return <Navigate to="/welcome" replace />;
    }
  }

  // 4. ACCESO CONCEDIDO
  // Outlet renderiza el componente hijo definido en las rutas (App.jsx)
  return <Outlet />;
};

export default ProtectedRoute;