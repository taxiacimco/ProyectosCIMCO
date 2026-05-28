// Versión Arquitectura: V13.0 - Inyección de AuthProvider en Nodo Raíz para Soporte HMR Completo
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\main.jsx
 * Misión: Punto de entrada único del Frontend de TAXIA CIMCO.
 * Envuelve el enrutador en el proveedor de contexto segregado para garantizar el ciclo de vida de la autenticación.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from './AppRouter';
import { AuthProvider } from './hooks/AuthProvider';
import './index.css';

// 🗺️ IMPORTANTE: Los estilos de Leaflet deben cargarse antes que los componentes
// para garantizar que los contenedores del mapa tengan dimensiones correctas.
import 'leaflet/dist/leaflet.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </React.StrictMode>
);