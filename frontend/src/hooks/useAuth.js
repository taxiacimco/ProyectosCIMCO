// Versión Arquitectura: V6.6 - Hook de Autenticación Reactiva Unificado
/**
 * src/hooks/useAuth.js
 * Misión: Monitorear el estado de la sesión de Firebase y proveer el contexto de usuario.
 */
import { useState, useEffect } from 'react';
import { auth } from '../config/firebase'; // 🏛️ Importa la instancia del Singleton Real
import { onAuthStateChanged } from 'firebase/auth';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🛡️ Suscripción al observador de Firebase en tiempo real
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // El usuario está logueado
        setUser(firebaseUser);
      } else {
        // El usuario cerró sesión o no existe
        setUser(null);
      }
      setLoading(false); // 🏁 Finaliza la carga inicial
    });

    // Limpieza de la suscripción al desmontar el hook
    return () => unsubscribe();
  }, []);

  return { user, loading };
};