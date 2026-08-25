// Versión Arquitectura: V17.2 - Jerarquía de Proveedores Protegida y Cúpula AuthProvider/SocketProvider
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\main.jsx
 * Misión: Mantener el estricto orden jerárquico de proveedores en el árbol de React, asegurando que AuthProvider
 * se ubique en la cúspide para que SocketProvider reciba de forma síncrona el identificador de sesión (user.uid).
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from '@/AppRouter';
import { AuthProvider } from '@/hooks/AuthProvider'; 
import { SocketProvider } from '@/hooks/SocketContext.jsx'; // 📡 Extensión explícita requerida para prevenir errores de resolución
import '@/index.css'; // 🎨 Estilos core unificados

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <SocketProvider>
        <AppRouter />
      </SocketProvider>
    </AuthProvider>
  </React.StrictMode>
);