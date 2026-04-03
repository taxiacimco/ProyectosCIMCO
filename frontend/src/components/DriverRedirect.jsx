import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE (EXTRACCIÓN DIRECTA PARA EVITAR ERRORES DE RUTA) ---
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'taxiacimco-app';

/**
 * Componente DriverRedirect
 * Propósito: Actúa como un "Controlador de Tráfico" tras el inicio de sesión.
 * Lee el rol del usuario desde Firestore y lo envía a su panel correspondiente.
 */
const DriverRedirect = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Inicialización de autenticación para asegurar acceso a Firestore
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Escuchamos el documento del usuario en tiempo real para obtener su rol
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid);
      
      const unsubDoc = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          const role = (userData.role || userData.servicio || '').toLowerCase();

          // Mapeo lógico según tu estructura de archivos en /pages
          const routes = {
            'pasajero': '/user-panel',
            'mototaxi': '/mototaxi-panel',
            'motoparrillero': '/motoparrillero-panel',
            'motocarga': '/motocarga-panel',
            'despachador': '/despachador-panel',
            'intermunicipal': '/inter-panel',
            'intermunicipalconductor': '/inter-panel',
            'admin': '/admin-dashboard',
            'ceo': '/admin-dashboard'
          };

          const target = routes[role] || '/dashboard-bienvenida';
          navigate(target);
        } else {
          console.warn("Perfil no encontrado en Firestore");
          setLoading(false);
        }
      }, (error) => {
        console.error("Error al obtener datos de usuario:", error);
        setLoading(false);
      });

      return () => unsubDoc();
    });

    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-emerald-500">
      <div className="relative mb-8">
        <Loader2 className="animate-spin text-emerald-500" size={56} strokeWidth={2.5} />
        <div className="absolute inset-0 blur-3xl bg-emerald-500/30 animate-pulse"></div>
      </div>
      
      <div className="text-center space-y-2">
        <h2 className="text-xl font-black italic text-white uppercase tracking-tighter">
          CIMCO <span className="text-emerald-500">SISTEMA</span>
        </h2>
        <div className="flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
            Configurando acceso por rol...
          </p>
        </div>
      </div>

      {/* Decoración estética de fondo */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-slate-900">
        <div className="h-full bg-emerald-500 animate-[loading_2s_infinite]" style={{ width: '30%' }}></div>
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
};

export default DriverRedirect;