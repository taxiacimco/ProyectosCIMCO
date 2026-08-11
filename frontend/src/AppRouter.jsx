// Versión Arquitectura: V9.5 - Sincronización Multi-Rol y Resolución Anti-Bucle de Navegación
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\AppRouter.jsx
 * Misión: Verificación y aseguramiento de subrutas requeridas (/pasajero, /mototaxi, /despachador, y registros asociados) con blindaje anti-bucle multi-rol.
 * Estilo: CIMCO-UI V9.3 Glassmorphism.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

// Componentes Compartidos y Vistas Principales
import AjustesPerfil from '@/components/shared/AjustesPerfil';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import RegisterPasajero from '@/pages/RegisterPasajero';
import RegisterMoto from '@/pages/RegisterMoto';
import RegisterIntermunicipal from '@/pages/RegisterIntermunicipal';
import RegisterDespachador from '@/pages/RegisterDespachador';
import RegisterAdmin from '@/pages/RegisterAdmin';
import ForgotPassword from '@/pages/ForgotPassword';

// Vistas por Rol
import HomePasajero from '@/pages/pasajero/HomePasajero';
import PerfilPasajero from '@/pages/pasajero/PerfilPasajero';
import HistorialViajes from '@/pages/pasajero/HistorialViajes';
import WalletPasajero from '@/pages/pasajero/WalletPasajero';

import HomeMototaxi from '@/pages/mototaxi/HomeMototaxi';
import HistorialMototaxi from '@/pages/mototaxi/HistorialMototaxi';
import WalletMototaxi from '@/pages/mototaxi/WalletMototaxi';

import HomeMotoparrillero from '@/pages/motoparrillero/HomeMotoparrillero';
import HistorialMotoparrillero from '@/pages/motoparrillero/HistorialMotoparrillero';
import WalletMotoparrillero from '@/pages/motoparrillero/WalletMotoparrillero';

import HomeMotocarga from '@/pages/motocarga/HomeMotocarga';
import HistorialMotocarga from '@/pages/motocarga/HistorialMotocarga';
import WalletMotocarga from '@/pages/motocarga/WalletMotocarga';

import HomeIntermunicipal from '@/pages/intermunicipal/HomeIntermunicipal';
import HistorialIntermunicipal from '@/pages/intermunicipal/HistorialIntermunicipal';

import HomeDespachador from '@/pages/despachador/HomeDespachador';
import HistorialDespachador from '@/pages/despachador/HistorialDespachador';
import WalletDespachador from '@/pages/despachador/WalletDespachador';

import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminPanel from '@/pages/admin/AdminPanel';
import Cooperativas from '@/pages/admin/Cooperativas';
import QrGenerator from '@/pages/admin/QrGenerator';

// Pantalla de Carga Glassmorphism con Guardas Anti-Undefined
const LoadingScreen = () => (
  <div className="min-h-screen bg-[#080d1a] bg-gradient-to-br from-[#080d1a] via-[#0f172a] to-[#1e1b4b] flex items-center justify-center p-4">
    <div className="flex flex-col items-center gap-4 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl">
      <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-mono uppercase tracking-widest text-slate-300">Cargando Sistema CIMCO...</span>
    </div>
  </div>
);

// Guardián de Rutas Protegidas con Detección Dinámica de Subroles y Homologación de Conductor
const ProtectedRoute = ({ children, allowedRoles }) => {
  const authContext = useAuth() || {};
  const user = authContext.user || null;
  const loading = authContext.loading || false;

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const primaryRole = (user.rol || user.tipoUsuario || '').toLowerCase();
    const secondaryRole = (user.subrol || user.tipoConductor || user.tipoVehiculo || '').toLowerCase();

    // Homologación de roles efectivos del usuario
    const effectiveRoles = [primaryRole, secondaryRole].filter(Boolean);

    // Mapeo defensivo: Si el rol es 'conductor' genérico sin subrol explícito, se homologa a servicios de conducción
    if (primaryRole === 'conductor') {
      if (!secondaryRole) {
        effectiveRoles.push('mototaxi', 'motoparrillero', 'motocarga', 'intermunicipal');
      }
    }

    const isAllowed = allowedRoles.some((allowed) =>
      effectiveRoles.some((eRole) => eRole === allowed.toLowerCase())
    );

    if (!isAllowed) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

// Redireccionador por Rol Activo con Mapeo Inteligente Anti-Bucle
const RoleRedirect = () => {
  const authContext = useAuth() || {};
  const user = authContext.user || null;
  const loading = authContext.loading || false;

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const primaryRole = (user.rol || user.tipoUsuario || '').toLowerCase();
  const secondaryRole = (user.subrol || user.tipoConductor || user.tipoVehiculo || '').toLowerCase();

  switch (primaryRole) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'despachador':
      return <Navigate to="/despachador" replace />;
    case 'intermunicipal':
      return <Navigate to="/intermunicipal" replace />;
    case 'mototaxi':
      return <Navigate to="/mototaxi" replace />;
    case 'motoparrillero':
      return <Navigate to="/motoparrillero" replace />;
    case 'motocarga':
      return <Navigate to="/motocarga" replace />;
    case 'conductor':
      if (secondaryRole === 'motoparrillero') return <Navigate to="/motoparrillero" replace />;
      if (secondaryRole === 'motocarga') return <Navigate to="/motocarga" replace />;
      if (secondaryRole === 'intermunicipal') return <Navigate to="/intermunicipal" replace />;
      return <Navigate to="/mototaxi" replace />;
    case 'pasajero':
    default:
      return <Navigate to="/pasajero" replace />;
  }
};

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas de Autenticación y Registro */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/pasajero" element={<RegisterPasajero />} />
        <Route path="/register/moto" element={<RegisterMoto />} />
        <Route path="/register/intermunicipal" element={<RegisterIntermunicipal />} />
        <Route path="/register/despachador" element={<RegisterDespachador />} />
        <Route path="/register/admin" element={<RegisterAdmin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Ruta Protegida Unificada: Ajustes de Perfil Multi-Rol */}
        <Route
          path="/ajustes-perfil"
          element={
            <ProtectedRoute>
              <AjustesPerfil />
            </ProtectedRoute>
          }
        />

        {/* Subrutas Protegidas de Pasajero (/pasajero) */}
        <Route
          path="/pasajero"
          element={
            <ProtectedRoute allowedRoles={['pasajero']}>
              <HomePasajero />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pasajero/perfil"
          element={
            <ProtectedRoute allowedRoles={['pasajero']}>
              <PerfilPasajero />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pasajero/historial"
          element={
            <ProtectedRoute allowedRoles={['pasajero']}>
              <HistorialViajes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pasajero/wallet"
          element={
            <ProtectedRoute allowedRoles={['pasajero']}>
              <WalletPasajero />
            </ProtectedRoute>
          }
        />

        {/* Subrutas Protegidas de Mototaxi (/mototaxi) */}
        <Route
          path="/mototaxi"
          element={
            <ProtectedRoute allowedRoles={['mototaxi', 'conductor']}>
              <HomeMototaxi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mototaxi/historial"
          element={
            <ProtectedRoute allowedRoles={['mototaxi', 'conductor']}>
              <HistorialMototaxi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mototaxi/wallet"
          element={
            <ProtectedRoute allowedRoles={['mototaxi', 'conductor']}>
              <WalletMototaxi />
            </ProtectedRoute>
          }
        />

        {/* Subrutas Protegidas de Motoparrillero */}
        <Route
          path="/motoparrillero"
          element={
            <ProtectedRoute allowedRoles={['motoparrillero', 'conductor']}>
              <HomeMotoparrillero />
            </ProtectedRoute>
          }
        />
        <Route
          path="/motoparrillero/historial"
          element={
            <ProtectedRoute allowedRoles={['motoparrillero', 'conductor']}>
              <HistorialMotoparrillero />
            </ProtectedRoute>
          }
        />
        <Route
          path="/motoparrillero/wallet"
          element={
            <ProtectedRoute allowedRoles={['motoparrillero', 'conductor']}>
              <WalletMotoparrillero />
            </ProtectedRoute>
          }
        />

        {/* Subrutas Protegidas de Motocarga */}
        <Route
          path="/motocarga"
          element={
            <ProtectedRoute allowedRoles={['motocarga', 'conductor']}>
              <HomeMotocarga />
            </ProtectedRoute>
          }
        />
        <Route
          path="/motocarga/historial"
          element={
            <ProtectedRoute allowedRoles={['motocarga', 'conductor']}>
              <HistorialMotocarga />
            </ProtectedRoute>
          }
        />
        <Route
          path="/motocarga/wallet"
          element={
            <ProtectedRoute allowedRoles={['motocarga', 'conductor']}>
              <WalletMotocarga />
            </ProtectedRoute>
          }
        />

        {/* Subrutas Protegidas de Intermunicipal */}
        <Route
          path="/intermunicipal"
          element={
            <ProtectedRoute allowedRoles={['intermunicipal', 'conductor']}>
              <HomeIntermunicipal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/intermunicipal/historial"
          element={
            <ProtectedRoute allowedRoles={['intermunicipal', 'conductor']}>
              <HistorialIntermunicipal />
            </ProtectedRoute>
          }
        />

        {/* Subrutas Protegidas de Despachador (/despachador) */}
        <Route
          path="/despachador"
          element={
            <ProtectedRoute allowedRoles={['despachador']}>
              <HomeDespachador />
            </ProtectedRoute>
          }
        />
        <Route
          path="/despachador/historial"
          element={
            <ProtectedRoute allowedRoles={['despachador']}>
              <HistorialDespachador />
            </ProtectedRoute>
          }
        />
        <Route
          path="/despachador/wallet"
          element={
            <ProtectedRoute allowedRoles={['despachador']}>
              <WalletDespachador />
            </ProtectedRoute>
          }
        />

        {/* Subrutas Protegidas de Administrador */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/panel"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/cooperativas"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Cooperativas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/qr-generator"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <QrGenerator />
            </ProtectedRoute>
          }
        />

        {/* Redirección Raíz y Fallback Global */}
        <Route path="/" element={<RoleRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;