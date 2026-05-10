// Versión Arquitectura: V4.7 - Integración de Ruta Real-Time Mototaxi
/**
 * AppRouter.jsx
 * Misión: Gestionar la navegación y proteger las rutas según el rol del usuario.
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Importaciones de Páginas
import HomePasajero from './pages/pasajero/HomePasajero';
import HistorialViajes from './pages/pasajero/HistorialViajes';
import PerfilPasajero from './pages/pasajero/PerfilPasajero';
import Login from './pages/Login'; 

// 🚀 NUEVA IMPORTACIÓN: Componente para conductores
import HomeMototaxi from './pages/mototaxi/HomeMototaxi';

const AppRouter = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <div className="animate-pulse font-mono text-xl uppercase tracking-widest text-yellow-400">
          Cargando Sistema CIMCO...
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Ruta Pública */}
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to="/" />} 
        />
        
        {/* 🏠 Ruta Principal (Pasajero) */}
        <Route 
          path="/" 
          element={user ? <HomePasajero /> : <Navigate to="/login" />} 
        />

        {/* 🏍️ NUEVA RUTA: Panel del Mototaxi */}
        <Route 
          path="/mototaxi" 
          element={user ? <HomeMototaxi /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/historial" 
          element={user ? <HistorialViajes /> : <Navigate to="/login" />} 
        />

        <Route 
          path="/perfil" 
          element={user ? <PerfilPasajero /> : <Navigate to="/login" />} 
        />

        {/* Fallback de Seguridad */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;