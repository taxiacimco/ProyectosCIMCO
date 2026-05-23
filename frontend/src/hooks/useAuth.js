// Versión Arquitectura: V7.0 - Hook de Autenticación JWT Local (CIMCO Backend Core)
/**
 * src/hooks/useAuth.js
 * Misión: Gestionar el token de seguridad del backend y mantener la sesión activa en el navegador.
 */
import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🛡️ 1. Al cargar la app, inspeccionamos el localStorage buscando las credenciales
    const storedToken = localStorage.getItem('cimco_token');
    const storedUser = localStorage.getItem('cimco_user');

    if (storedToken && storedUser) {
      // Si existen, restauramos la sesión automáticamente
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    
    // 🏁 Finaliza la validación inicial
    setLoading(false); 
  }, []);

  // 🔑 Función para iniciar sesión (Guarda en memoria del navegador)
  const login = (newToken, userData) => {
    localStorage.setItem('cimco_token', newToken);
    localStorage.setItem('cimco_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  // 🚪 Función para cerrar sesión (Destruye la evidencia de seguridad)
  const logout = () => {
    localStorage.removeItem('cimco_token');
    localStorage.removeItem('cimco_user');
    setToken(null);
    setUser(null);
  };

  return { user, token, loading, login, logout };
};