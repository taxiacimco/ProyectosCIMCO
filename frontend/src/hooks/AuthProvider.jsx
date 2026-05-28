// Versión Arquitectura: V14.0 - Segregación de Proveedor de Contexto Core y Blindaje Híbrido Anti-Undefined para Vite HMR
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\AuthProvider.jsx
 * Misión: Proveer el estado global y persistencia de autenticación de TAXIA CIMCO de forma aislada.
 * Preserva intacta la lógica dual (Express JWT + Firebase Core) y el blindaje de seguridad anti-undefined.
 */

import React, { createContext, useState, useEffect } from 'react';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// Creación y exportación del Contexto de Seguridad Centralizado
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🛡️ ESCUCHADOR MAESTRO (El Radar de Sesión de Firebase Core)
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      try {
        const storedToken = localStorage.getItem('cimco_token');
        const storedUser = localStorage.getItem('cimco_user');

        // 🛡️ GUARDA DE SEGURIDAD MÚLTIPLE (Anti-Undefined): Validación de integridad de sesión
        if (firebaseUser && storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } else {
          if (!storedToken) {
            localStorage.removeItem('cimco_token');
            localStorage.removeItem('cimco_user');
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error("⚠️ [CIMCO-AUTH] Fallo crítico al restaurar la sesión persistente del LocalStorage:", err);
        localStorage.removeItem('cimco_token');
        localStorage.removeItem('cimco_user');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * 🚀 FUNCIÓN DE ACCESO CORE (Fusión Atómica Blindada)
   * Resuelve la persistencia de datos local y levanta el túnel de comunicación con Firebase.
   */
  const login = async (newToken, userData, password) => {
    // 🛡️ GUARDA DE SEGURIDAD 1 (Anti-Undefined Token)
    if (!newToken) {
      console.error("❌ [CIMCO-AUTH] Denegado: Token de firma digital ausente en la respuesta del nodo.");
      return false;
    }

    // 🛡️ GUARDA DE SEGURIDAD 2 (Anti-Undefined Object Payload)
    if (!userData) {
      console.warn("⚠️ [CIMCO-AUTH] Payload de usuario ausente. Inicializando perfil de contingencia operativa.");
      userData = {};
    }

    // 🔄 MATRIZ DE COMPATIBILIDAD POLIMÓRFICA: Homologación cruzada Express / MongoDB / Firebase
    const rawNombre = userData.nombre || userData.fullName || userData.name || 'Operador CIMCO';
    const rawEmail = userData.email || userData.identifier || 'anonimo@taxiacimco.com';
    const rawRol = userData.rol || userData.role || 'pasajero';
    const rawId = userData.id || userData._id || userData.uid || `gen_${Date.now()}`;

    // 🛡️ ESCUDO PERIMETRAL ANTI-CRASH: Forzado estricto a String antes de operaciones .trim()
    const nombreSanitizado = String(rawNombre).trim();
    const emailSanitizado = String(rawEmail).trim().toLowerCase();
    const rolSanitizado = String(rawRol).trim().toLowerCase();
    const idSanitizado = String(rawId).trim();

    // Consolidación de la Identidad Unificada e Inyección de Llaves Cruzadas
    const usuarioValidado = {
      uid: idSanitizado,
      id: idSanitizado,
      nombre: nombreSanitizado,
      email: emailSanitizado,
      rol: rolSanitizado
    };

    // 📡 CONFIGURACIÓN DEL TÚNEL DE TELEMETRÍA DE FIRESTORE
    const esPasajero = rolSanitizado === 'pasajero';
    const firebaseEmail = esPasajero && !emailSanitizado.includes('@')
      ? `${emailSanitizado}@taxiacimco.com`
      : emailSanitizado;

    const safePassword = password || userData.password || '';

    try {
      console.log(`🔥 [CIMCO-AUTH] Conectando túnel hacia Firebase: ${firebaseEmail}`);
      
      if (safePassword) {
        // Ejecución centralizada y atómica de credenciales en la nube de Firebase
        await signInWithEmailAndPassword(auth, firebaseEmail, safePassword);
        console.log("✅ [CIMCO-AUTH] Enlace satelital de Firebase establecido sin colisiones.");
      } else {
        console.warn("⚠️ [CIMCO-AUTH] Operando en modo degradado: No se detectó clave perimetral para Firebase.");
      }

      console.log("✅ [CIMCO-HOOK] Estructura de identidad homologada:", usuarioValidado);

      // Persistencia atómica local
      localStorage.setItem('cimco_token', newToken);
      localStorage.setItem('cimco_user', JSON.stringify(usuarioValidado));

      // Sincronización inmediata de estados de React
      setToken(newToken);
      setUser(usuarioValidado);
      return true;
    } catch (error) {
      console.error("❌ [CIMCO-AUTH] Error fatal en enlace Firebase Auth:", error.message);
      throw new Error(`Fallo de túnel satelital: ${error.message}`);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      console.log("📡 [CIMCO-AUTH] Desconexión de Firebase exitosa.");
    } catch (error) {
      console.error("❌ [CIMCO-AUTH] Error cerrando sesión en Firebase:", error);
    } finally {
      localStorage.removeItem('cimco_token');
      localStorage.removeItem('cimco_user');
      setToken(null);
      setUser(null);
      console.log("📡 [CIMCO-CORE] Sesión destruida de forma segura.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};