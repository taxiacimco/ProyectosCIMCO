// Versión Arquitectura: V16.2 - Estabilización Final
import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from './AppRouter';
// IMPORTANTE: Esta es la única fuente de verdad para el contexto
import { AuthProvider } from './hooks/useAuth'; 
import './index.css';
import 'leaflet/dist/leaflet.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </React.StrictMode>
);