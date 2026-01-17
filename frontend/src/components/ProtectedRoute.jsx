import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ allowedRoles }) => {
  // Extraemos 'user' y 'loading' de nuestro contexto global
  const { user, loading } = useAuth();

  // 1. MIENTRAS CARGA: Evitamos que el sistema nos rebote al login 
  // mientras Firestore responde con tu rol de ADMIN.
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-cyan-400 font-bold animate-pulse text-xl">
            🔐 Verificando credenciales CEO - CIMCO...
          </div>
        </div>
      </div>
    );
  }

  // 2. SIN USUARIO: Si después de cargar no hay nadie, va para el login.
  if (!user) {
    console.warn("[CIMCO AUTH] Usuario no detectado, redirigiendo a login.");
    return <Navigate to="/login" replace />;
  }

  // 3. VALIDACIÓN DE ROL: Comparamos el rol de 'user.role' (que ya es 'admin') 
  // con los roles permitidos en la ruta.
  const userRole = user.role || 'pasajero';
  const hasPermission = !allowedRoles || allowedRoles.includes(userRole);

  if (!hasPermission) {
    console.error(`[CIMCO AUTH] Acceso denegado. Rol actual: ${userRole}. Se requiere: ${allowedRoles}`);
    return <Navigate to="/welcome" replace />;
  }

  // 4. ÉXITO: Si eres Admin, te deja pasar al Reporte de Ganancias.
  return <Outlet />;
};

export default ProtectedRoute;