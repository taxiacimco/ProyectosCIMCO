// Versión Arquitectura: V17.0 - PROD READY: Aseguramiento de la Jerarquía de Contextos y Prevención de Conexiones Duplicadas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\main.jsx
 * Misión: Nodo de montaje inicial de React y orquestador del árbol de contextos globales.
 * * 🔏 Gobernanza de Dependencia:
 * AuthProvider SE MANTIENE en la cúspide del árbol. Esto garantiza que SocketProvider pueda heredar
 * de forma nativa la identidad del usuario (user.uid) antes de abrir el canal perimetral bidireccional Socket.io.
 * NOTA DE DEPURACIÓN: React.StrictMode provocará un doble montaje simulado en desarrollo. Asegurar que
 * el hook del Socket realice el retorno de desconexión (socket.disconnect()) para mitigar fugas en HMR.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from '@/AppRouter';
import { AuthProvider } from '@/hooks/AuthProvider'; 
import { SocketProvider } from '@/hooks/SocketContext'; // 📡 Inyección del canal perimetral dúplex de telemetría
import '@/index.css'; // 🎨 Estilos core unificados V11.0

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <SocketProvider>
        <AppRouter />
      </SocketProvider>
    </AuthProvider>
  </React.StrictMode>
);