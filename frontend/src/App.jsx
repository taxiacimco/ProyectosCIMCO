import React, { useEffect, useState, createContext, useContext, memo, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  onSnapshot 
} from 'firebase/firestore';
import { Navigation, Loader2, ShieldAlert, Map as MapIcon, LayoutDashboard, Truck } from 'lucide-react';

// ✅ INTEGRACIÓN DE SERVICIOS CIMCO
import { solicitarPermisosYObtenerToken, registrarEscuchaMensajes } from './services/notificationService';

/**
 * 1. CONFIGURACIÓN E INICIALIZACIÓN GLOBAL
 */
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'taxiacimco-app';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🚀 INICIALIZACIÓN DE NOTIFICACIONES PUSH
    const initPushNotifications = async () => {
      await solicitarPermisosYObtenerToken();
      registrarEscuchaMensajes();
    };

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Init Error:", err);
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Disparar captura de token si el usuario está logueado
        initPushNotifications();

        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', currentUser.uid);
        const unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            setUserData({ role: 'pasajero', createdAt: new Date() });
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore Listen Error:", error);
          setLoading(false);
        });

        return () => unsubscribeDoc();
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center font-mono">
        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mb-4" />
        <div className="text-yellow-500 text-xl tracking-tighter uppercase italic font-black">
          CIMCO OS [BOOTING...]
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userData }}>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-900 text-white selection:bg-yellow-500 selection:text-black">
           {/* Resto del layout Neo-Brutalista preservado */}
           <Routes>
              <Route path="/" element={<div className="p-8"><h1>PANEL CENTRAL CIMCO</h1><p>Estado: ONLINE</p></div>} />
           </Routes>
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;