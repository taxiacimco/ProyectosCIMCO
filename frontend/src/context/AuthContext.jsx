// Versión Arquitectura: V9.0 - Sincronización con Ruta Sagrada Firestore
/**
 * ARCHIVO: frontend/src/context/AuthContext.jsx
 * MISIÓN: Gestionar el estado global de autenticación sincronizando el perfil 
 * desde el path sagrado: artifacts/taxiacimco-app/public/data/usuarios
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();

// [REGLA DE ORO 1]: Constante de Path Sagrada
const SACRED_PATH = "artifacts/taxiacimco-app/public/data/usuarios";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        
        /**
         * ✅ SINCRONIZACIÓN BAJO RUTA SAGRADA
         * Buscamos el perfil en el path jerárquico de TAXIA CIMCO.
         */
        const userRef = doc(db, SACRED_PATH, firebaseUser.uid);
        
        const unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            setCurrentRole(data.role || 'pasajero');
            console.log(`[CIMCO-AUTH] Sesión Activa: ${data.role} en Ruta Sagrada`);
          } else {
            console.error("[CIMCO-AUTH] Documento NO ENCONTRADO en Ruta Sagrada.");
            setCurrentRole('pasajero');
          }
          setLoading(false);
        }, (error) => {
          console.error("[CIMCO-AUTH] Error en tiempo real:", error);
          setLoading(false);
        });

        return () => unsubscribeSnapshot();
      } else {
        setUser(null);
        setCurrentRole(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [auth, db]);

  const logout = () => {
    console.log("[CIMCO-AUTH] Terminando sesión segura...");
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, currentRole, userData, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return context;
};