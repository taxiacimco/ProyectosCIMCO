// Versión Arquitectura: V6.4 - Purga Total de Google Maps e Inyección Leaflet
/**
 * main.jsx
 * Misión: Punto de entrada único del Frontend. 
 * Se elimina la dependencia de Google Maps API para optimizar costos y carga.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from './AppRouter'; 
import './index.css'; 

// 🗺️ IMPORTANTE: Los estilos de Leaflet deben cargarse antes que los componentes
// para garantizar que los contenedores del mapa tengan dimensiones correctas.
import 'leaflet/dist/leaflet.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);