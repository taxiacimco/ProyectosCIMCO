// Versión Arquitectura: V14.0 - Hook Atómico Puro Consumidor del Contexto Global Aislado para HMR Nativo
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useAuth.jsx
 * Misión: Hook de consumo directo homologado para componentes de la interfaz de CIMCO-UI.
 * Consume el contexto exportado por AuthProvider aislando funciones para habilitar Fast Refresh nativo.
 */

import { useContext } from 'react';
import { AuthContext } from './AuthProvider';

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  // 🛡️ Guarda Estricta de Inicialización de Contexto (Anti-Undefined)
  if (!context) {
    throw new Error("❌ [CIMCO-ERR] useAuth debe ser invocado estrictamente dentro del contenedor AuthProvider.");
  }
  
  return context;
};