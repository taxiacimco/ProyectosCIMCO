// Versión Arquitectura: V8.1 - Protocolo de Seguridad CIMCO
/**
 * ARCHIVO: frontend/src/components/ProtectedRoute.jsx
 * MISIÓN: Actuar como un interceptor de rutas (Route Guard) para asegurar
 * que solo niveles de acceso autorizados entren a zonas críticas.
 */

import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, currentRole } = useAuth();
  const location = useLocation();

  // Registro de auditoría técnica en consola
  useEffect(() => {
    if (!loading && user) {
      console.log(`[CIMCO-GUARD] 👤 ${user.email} | 🔑 Nivel: ${currentRole || 'Pendiente'}`);
    }
  }, [user, loading, currentRole]);

  // 1. ESTADO DE CARGA (Branding CIMCO)
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <div className="text-cyan-500 font-black text-[10px] tracking-[0.3em] uppercase animate-pulse">
            Verificando Protocolos CIMCO...
          </div>
        </div>
      </div>
    );
  }

  // 2. VERIFICACIÓN DE SESIÓN
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. VALIDACIÓN DE ROLES (Control de Acceso Basado en Atributos)
  if (allowedRoles) {
    const userRole = (currentRole || '').toLowerCase();
    const rolesPermitidos = allowedRoles.map(r => r.toLowerCase());
    
    if (!rolesPermitidos.includes(userRole)) {
      console.error(`[CIMCO-AUTH] Acceso Denegado. Se requiere: ${allowedRoles}. Actual: ${userRole}`);
      
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-8 bg-slate-900 border border-white/10 p-12 rounded-[3rem] shadow-2xl shadow-red-500/5">
            <div className="bg-red-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
              <ShieldAlert className="text-red-500" size={40} />
            </div>
            
            <div>
              <h1 className="text-white font-black text-2xl uppercase italic tracking-tighter">Acceso Restringido</h1>
              <p className="text-slate-400 text-sm mt-4 leading-relaxed">
                Tu nivel de credenciales <span className="text-white font-bold">[{userRole}]</span> no tiene autorización para este sector del sistema.
              </p>
            </div>

            <button 
              onClick={() => window.location.href = '/'}
              className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 group"
            >
              <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={16} /> Volver al Inicio
            </button>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;