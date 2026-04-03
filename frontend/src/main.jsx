import React, { useEffect, useState, createContext, useContext, memo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  Navigation, 
  Loader2, 
  ShieldAlert, 
  LayoutDashboard, 
  Truck, 
  User, 
  LogOut, 
  Mail, 
  Lock, 
  Chrome, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

/**
 * 1. CONFIGURACIÓN GLOBAL DE FIREBASE Y API
 * Se migra de JSON.parse(__firebase_config) a variables de entorno nativas de Vite.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// URL de la API de TAXIA CIMCO (Backend Java)
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'taxiacimco-app';

// --- CONTEXTO DE AUTENTICACIÓN (CLEAN ARCH) ---
const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

/**
 * LÓGICA DE PWA DINÁMICA Y REGISTRO DE SERVICE WORKER
 * Inyecta configuración de Firebase y URL de API para interacción en background.
 */
const updatePWAConfig = (role) => {
  if (!role || typeof document === 'undefined') return;

  // 1. Selección de Manifiesto según Rol (Personalización de Experiencia)
  let manifestFile = 'manifest-pasajero.webmanifest';
  const roleLower = role.toLowerCase();
  
  if (['admin', 'ceo', 'despachador'].includes(roleLower)) {
    manifestFile = 'manifest-despachador.webmanifest';
  } else if (['intermunicipal', 'conductorinter', 'mototaxi', 'conductor', 'motoparrillero', 'motocarga'].includes(roleLower)) {
    manifestFile = 'manifest-conductorinter.webmanifest';
  }

  const oldManifest = document.querySelector('link[rel="manifest"]');
  if (oldManifest) oldManifest.remove();

  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = `/${manifestFile}`;
  document.head.appendChild(link);

  // 2. Registro del Service Worker con Inyección Atómica de Configuración
  if ('serviceWorker' in navigator) {
    const configString = encodeURIComponent(JSON.stringify(firebaseConfig));
    const apiUrlEncoded = encodeURIComponent(API_URL);
    
    // El SW recibirá 'config' y 'apiUrl' para poder ejecutar acciones (ej: Aceptar Viaje) sin la app abierta
    navigator.serviceWorker.register(`/firebase-messaging-sw.js?config=${configString}&apiUrl=${apiUrlEncoded}`, {
      type: 'module'
    })
    .then((registration) => {
      console.log('🚀 [CIMCO] SW Sincronizado. Scope:', registration.scope);
      console.log('🔗 [CIMCO] API vinculada al SW:', API_URL);
    })
    .catch((err) => {
      console.error('❌ [CIMCO] Error sincronizando Service Worker:', err);
    });
  }
};

// --- COMPONENTES DE PROTECCIÓN Y LAYOUT (ESTILO CIBER-NEO-BRUTALISTA) ---

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, userData, loading } = useAuth();
  
  if (loading) return (
    <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="text-cyan-500 animate-spin" size={48} />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(userData?.rol || userData?.role)) {
    return <Navigate to="/redirect" replace />;
  }

  return children;
};

const Layout = ({ children, title, icon: Icon }) => {
  const { userData } = useAuth();
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30">
      <nav className="border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-cyan-500 p-2 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              {Icon ? <Icon size={20} className="text-slate-950" /> : <ShieldCheck size={20} className="text-slate-950" />}
            </div>
            <h1 className="text-sm font-black uppercase tracking-[0.3em] text-white">
              {title} <span className="text-cyan-500 text-[10px] ml-2 opacity-50">v12.5</span>
            </h1>
          </div>
          <div className="flex items-center gap-6">
             <div className="text-right hidden md:block">
                <p className="text-[10px] font-black text-cyan-500 uppercase">{userData?.rol || 'Usuario'}</p>
                <p className="text-xs font-bold text-slate-400">{userData?.nombre || 'CIMCO Operator'}</p>
             </div>
             <button onClick={() => signOut(auth)} className="p-3 hover:bg-red-500/10 hover:text-red-500 rounded-2xl transition-all border border-white/5">
                <LogOut size={18} />
             </button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto p-6 animate-in fade-in duration-700">
        {children}
      </main>
    </div>
  );
};

const LiveTrackingMap = memo(({ height = "400px" }) => (
  <div style={{ height }} className="w-full bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden relative group">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent"></div>
    <div className="absolute top-6 left-6 z-10 bg-slate-950/80 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500">Sistema Centinela Activo</span>
      </div>
    </div>
    <div className="h-full w-full flex items-center justify-center text-slate-600 font-black uppercase tracking-widest text-xs">
      Cargando Matriz de Geolocalización...
    </div>
  </div>
));

// --- COMPONENTE PRINCIPAL (ORQUESTADOR) ---

const App = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // RUTA SAGRADA: artifacts/taxiacimco-app/public/data/usuarios/[uid]
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', currentUser.uid);
        
        onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            
            // 🔥 DISPARO DE CONFIGURACIÓN PWA Y SW SEGÚN ROL
            updatePWAConfig(data.rol || data.role);
          }
          setLoading(false);
        }, (error) => {
          console.error("❌ Error en Snapshot Sagrado:", error);
          setLoading(false);
        });
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) return (
    <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
      <div className="relative">
        <div className="w-24 h-24 border-2 border-cyan-500/20 rounded-full animate-pulse"></div>
        <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-500 animate-spin" size={32} />
      </div>
    </div>
  );

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      <BrowserRouter>
        <Routes>
          {/* Módulo de Acceso */}
          <Route path="/login" element={!user ? <div className="bg-slate-950 h-screen flex items-center justify-center text-white font-black">PANEL DE ACCESO CIMCO</div> : <Navigate to="/redirect" />} />
          
          {/* Orquestador de Redirección por Rol */}
          <Route path="/redirect" element={
            <ProtectedRoute>
              {(() => {
                const role = (userData?.rol || userData?.role || '').toLowerCase();
                if (['admin', 'ceo'].includes(role)) return <Navigate to="/admin" />;
                if (['despachador'].includes(role)) return <Navigate to="/despacho" />;
                if (['intermunicipal', 'conductorinter'].includes(role)) return <Navigate to="/intermunicipal" />;
                if (['mototaxi'].includes(role)) return <Navigate to="/mototaxi" />;
                if (['motoparrillero'].includes(role)) return <Navigate to="/motoparrillero" />;
                if (['motocarga'].includes(role)) return <Navigate to="/motocarga" />;
                return <Navigate to="/login" />;
              })()}
            </ProtectedRoute>
          } />

          {/* Paneles Especializados (Ejemplos de Integración) */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin', 'ceo']}>
              <Layout title="Administración Central" icon={ShieldAlert}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  {['Conductores', 'Pasajeros', 'Viajes', 'Alertas'].map(i => (
                    <div key={i} className="bg-slate-900 border border-white/10 p-6 rounded-3xl group hover:border-cyan-500/50 transition-all">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{i}</p>
                      <p className="text-2xl font-black mt-2">--</p>
                    </div>
                  ))}
                </div>
                <LiveTrackingMap height="350px" />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Rutas por Defecto */}
          <Route path="/" element={<Navigate to="/redirect" replace />} />
          <Route path="*" element={<Navigate to="/redirect" replace />} />
        </Routes>
      </BrowserRouter>
      
      <style>{`
        body { margin: 0; background-color: #020617; font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.2); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(6, 182, 212, 0.5); }
      `}</style>
    </AuthContext.Provider>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);