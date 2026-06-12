// Versión Arquitectura: V16.6 - Trazabilidad de Nodo Raíz y Auditoría de Importaciones Absolutas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\main.jsx
 * Misión: Nodo de montaje inicial de React y orquestador del árbol de contextos globales.
 * Estado: Archivo estable. Todas las importaciones cumplen con la gobernanza del alias '@/'.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from '@/AppRouter';
import { AuthProvider } from '@/hooks/AuthProvider'; 
import '@/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </React.StrictMode>
);