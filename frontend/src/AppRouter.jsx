// Versión Arquitectura: V9.3 - Rutas Protegidas y Navegación Global TAXIA CIMCO
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

// Guardián de Rutas Protegidas
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
    const userRole = (user.rol || user.tipoUsuario || '').toLowerCase();
    const isAllowed = allowedRoles.some((role) => role.toLowerCase() === userRole);

    if (!isAllowed) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

// Redireccionador por Rol Activo
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

  const role = (user.rol || user.tipoUsuario || '').toLowerCase();

  switch (role) {
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
    case 'pasajero':
    default:
      return <Navigate to="/pasajero" replace />;
  }
};

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
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

        {/* Rutas Protegidas de Pasajero */}
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

        {/* Rutas Protegidas de Mototaxi */}
        <Route
          path="/mototaxi"
          element={
            <ProtectedRoute allowedRoles={['mototaxi']}>
              <HomeMototaxi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mototaxi/historial"
          element={
            <ProtectedRoute allowedRoles={['mototaxi']}>
              <HistorialMototaxi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mototaxi/wallet"
          element={
            <ProtectedRoute allowedRoles={['mototaxi']}>
              <WalletMototaxi />
            </ProtectedRoute>
          }
        />

        {/* Rutas Protegidas de Motoparrillero */}
        <Route
          path="/motoparrillero"
          element={
            <ProtectedRoute allowedRoles={['motoparrillero']}>
              <HomeMotoparrillero />
            </ProtectedRoute>
          }
        />
        <Route
          path="/motoparrillero/historial"
          element={
            <ProtectedRoute allowedRoles={['motoparrillero']}>
              <HistorialMotoparrillero />
            </ProtectedRoute>
          }
        />
        <Route
          path="/motoparrillero/wallet"
          element={
            <ProtectedRoute allowedRoles={['motoparrillero']}>
              <WalletMotoparrillero />
            </ProtectedRoute>
          }
        />

        {/* Rutas Protegidas de Motocarga */}
        <Route
          path="/motocarga"
          element={
            <ProtectedRoute allowedRoles={['motocarga']}>
              <HomeMotocarga />
            </ProtectedRoute>
          }
        />
        <Route
          path="/motocarga/historial"
          element={
            <ProtectedRoute allowedRoles={['motocarga']}>
              <HistorialMotocarga />
            </ProtectedRoute>
          }
        />
        <Route
          path="/motocarga/wallet"
          element={
            <ProtectedRoute allowedRoles={['motocarga']}>
              <WalletMotocarga />
            </ProtectedRoute>
          }
        />

        {/* Rutas Protegidas de Intermunicipal */}
        <Route
          path="/intermunicipal"
          element={
            <ProtectedRoute allowedRoles={['intermunicipal']}>
              <HomeIntermunicipal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/intermunicipal/historial"
          element={
            <ProtectedRoute allowedRoles={['intermunicipal']}>
              <HistorialIntermunicipal />
            </ProtectedRoute>
          }
        />

        {/* Rutas Protegidas de Despachador */}
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

        {/* Rutas Protegidas de Administrador */}
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

        {/* Redirección Raíz y Fallback */}
        <Route path="/" element={<RoleRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;