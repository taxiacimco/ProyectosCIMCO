import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup,
  GoogleAuthProvider, 
  signOut,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult();
          
          // 🛠️ AJUSTE DE REFERENCIA: Busca por UID o por Correo para el Admin
          let userRef = doc(db, "usuarios", firebaseUser.uid);
          if (firebaseUser.email === 'taxiacimco@gmail.com') {
             userRef = doc(db, "usuarios", "taxiacimco@gmail.com");
          }

          // Suscripción en tiempo real a los datos de Firestore
          const unsubSnapshot = onSnapshot(userRef, (docSnap) => {
            const firestoreData = docSnap.data() || {};
            
            // ✅ ACEPTA 'role' o 'rol' para que detecte tu permiso de admin
            const userRole = idTokenResult.claims.role || firestoreData.role || firestoreData.rol || 'pasajero';
            
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firestoreData.nombre,
              photoURL: firebaseUser.photoURL,
              ...firestoreData,    
              role: userRole
            });
            setLoading(false);
          }, (err) => {
            console.error("❌ Error Firestore:", err);
            setLoading(false);
          });

          return () => unsubSnapshot();

        } catch (error) {
          console.error("❌ Error Auth:", error);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return await signInWithPopup(auth, provider);
  };

  const logout = () => signOut(auth);

  const roles = {
    isAdmin: user?.role === 'admin' || user?.role === 'ceo',
    isPassenger: user?.role === 'pasajero',
    isDriver: ['mototaxi', 'motocarga', 'conductorinter'].includes(user?.role),
    currentRole: user?.role
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, ...roles }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);