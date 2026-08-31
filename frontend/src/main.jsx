// Versión Arquitectura: V17.3 - Montaje Atómico en DOM y Jerarquía Estricta de Proveedores Globales
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\main.jsx
 * Misión: Preservar la responsabilidad atómica exclusiva de montaje en el DOM mediante createRoot e inyección de proveedores globales (AuthProvider, SocketProvider) y router central.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from '@/AppRouter';
import { AuthProvider } from '@/hooks/AuthProvider';
import { SocketProvider } from '@/hooks/SocketContext.jsx';
import '@/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <SocketProvider>
        <AppRouter />
      </SocketProvider>
    </AuthProvider>
  </React.StrictMode>
);