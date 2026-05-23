// Versión Arquitectura: V9.5 - Sincronización Estructural de Rutas Administrativas y Exposición de Accesos QR
/**
 * Ubicación: frontend/src/AppRouter.jsx
 * Misión: Orquestar el árbol de navegación del ecosistema TAXIA CIMCO.
 * Ajuste: Se exponen formalmente las pasarelas '/qr' y '/admin' para pruebas de telemetría e impresión de adhesivos.
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Páginas Operativas Básicas
import HomePasajero from './pages/pasajero/HomePasajero';
import Login from './pages/Login.jsx';

// Componentes y Paneles de Control Centralizado (CEO & Tools)
import AdminDashboard from './pages/admin/AdminDashboard';
import QrGenerator from './pages/admin/QrGenerator';

const AppRouter = () => {
  const { user, loading } = useAuth();

  // 🛡️ Pantalla de hidratación de estado con Estética Clean Dark Premium
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#09090b] text-zinc-100 font-sans antialiased">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-yellow-500" />
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
        {/* 🔓 Ruta Pública Obligatoria */}
        <Route path="/login" element={<Login />} />
        
        {/* 🛰️ Ruta Exclusiva del Generador QR (Accesible localmente para generación de llaves) */}
        <Route path="/qr" element={<QrGenerator />} />

        {/* 👑 Ruta del Súper Terminal CEO (Panel de Control e Inyección de Capital) */}
        <Route 
          path="/admin" 
          element={user ? <AdminDashboard /> : <Navigate to="/login" />} 
        />
        
        {/* 🏠 Ruta Núcleo (Pasajero) */}
        <Route 
          path="/" 
          element={user ? <HomePasajero /> : <Navigate to="/login" />} 
        />

        {/* 🛡️ Guardavía Anti-Fugas: Si la ruta no existe, redirige al núcleo */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;