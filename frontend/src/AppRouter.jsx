// Versión Arquitectura: V13.0 - Integración Total de Árbol de Navegación Operativa y Consumo Aislado de useAuth
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\AppRouter.jsx
 * Misión: Orquestar el árbol de navegación del ecosistema TAXIA CIMCO mapeando flujos públicos y privados.
 * Sincroniza el estado reactivo global con pantallas de carga premium bajo lineamientos CIMCO-UI V9.3.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.jsx';

// Páginas Operativas Básicas
import HomePasajero from './pages/pasajero/HomePasajero';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

// Componentes y Paneles de Control Centralizado (CEO & Tools)
import AdminDashboard from './pages/admin/AdminDashboard';
import QrGenerator from './pages/admin/QrGenerator';

const AppRouter = () => {
  const { user, loading } = useAuth();

  // 🛡️ Pantalla de hidratación de estado con Estética Clean Dark Premium (CIMCO-UI V9.3)
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#09090b] text-zinc-100 font-sans antialiased">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-cyan-500" />
          <div className="animate-pulse font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-400">
            Cargando Infraestructura CIMCO...
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* 🔓 Rutas Públicas Obligatorias */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* 🛰️ Ruta Exclusiva del Generador QR */}
        <Route path="/qr" element={<QrGenerator />} />

        {/* 👑 Ruta del Súper Terminal CEO */}
        <Route 
          path="/admin" 
          element={user && user.rol === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} 
        />
        
        {/* 🏠 Ruta Núcleo (Pasajero / Flujo Dinámico) */}
        <Route 
          path="/" 
          element={user ? (user.rol === 'admin' ? <Navigate to="/admin" /> : <HomePasajero />) : <Navigate to="/login" />} 
        />

        {/* 🔄 Ruta de Contingencia de Desbordamiento */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;