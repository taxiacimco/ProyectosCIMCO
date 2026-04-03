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
  getDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { Navigation, Loader2, ShieldAlert, Map as MapIcon, LayoutDashboard, Truck } from 'lucide-react';

/**
 * 1. CONFIGURACIÓN E INICIALIZACIÓN GLOBAL
 */
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'taxiacimco-app';

// Creación del Contexto
const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

/**
 * 2. COMPONENTE: LiveTrackingMap
 */
const LiveTrackingMap = memo(({ height = "300px" }) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    // Carga dinámica de Leaflet para evitar errores de SSR/Entorno
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    } else {
      setMapLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstance.current) return;

    mapInstance.current = window.L.map(mapRef.current, { zoomControl: false }).setView([9.3025, -73.3245], 15);
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(mapInstance.current);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        mapInstance.current.flyTo([latitude, longitude], 16);
        window.L.circle([latitude, longitude], { radius: 100, color: '#06b6d4', fillOpacity: 0.1 }).addTo(mapInstance.current);
      });
    }
  }, [mapLoaded]);

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl">
      <div ref={mapRef} style={{ height, width: '100%' }} />
      <div className="absolute top-4 left-4 z-[1000] bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-white/10">
        <MapIcon size={16} className="text-cyan-400" />
      </div>
    </div>
  );
});

/**
 * 3. COMPONENTES DE ESTRUCTURA Y PROTECCIÓN
 */

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, userData, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-cyan-400">
      <Loader2 className="animate-spin mb-4" size={48} />
      <p className="font-black uppercase tracking-[0.3em] text-[10px]">Sincronizando CIMCO V3</p>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(userData?.role)) {
    return <Navigate to="/redirect" replace />;
  }

  return children;
};

const Layout = ({ children, title, icon: Icon = Navigation }) => (
  <div className="min-h-screen bg-[#020617] text-white font-sans">
    <header className="border-b border-white/5 p-6 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-[100] flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white italic tracking-tighter uppercase">
            TAXIA CIMCO <span className="text-cyan-500">V3</span>
          </h1>
          <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.4em]">Gestión de Flota Inteligente</p>
        </div>
      </div>
      <div className="px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest">
        {title}
      </div>
    </header>
    <main className="p-4 md:p-8 max-w-7xl mx-auto">{children}</main>
  </div>
);

const DriverRedirect = () => {
  const { userData, loading } = useAuth();
  if (loading) return null;

  const role = userData?.role || 'pasajero';
  if (['admin', 'ceo'].includes(role)) return <Navigate to="/admin-dashboard" replace />;
  if (role === 'despachador') return <Navigate to="/despachador-panel" replace />;
  if (['intermunicipal', 'conductorinter'].includes(role)) return <Navigate to="/inter-panel" replace />;
  return <Navigate to="/mototaxi-panel" replace />;
};

/**
 * 4. VISTAS DE CONTENIDO (PLACEHOLDERS)
 */
const ViewPlaceholder = ({ title, color }) => (
  <div className={`p-12 bg-slate-900/50 rounded-[3rem] border-2 border-${color}-500/10 text-center backdrop-blur-2xl shadow-2xl`}>
    <h2 className={`text-2xl font-black text-${color}-400 uppercase italic mb-2`}>{title}</h2>
    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Módulo en proceso de vinculación de datos</p>
  </div>
);

/**
 * 5. NÚCLEO DE LA APLICACIÓN (ROUTING)
 */
function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta Pública */}
        <Route path="/login" element={
          <Layout title="Acceso" icon={ShieldAlert}>
            <ViewPlaceholder title="Iniciar Sesión" color="blue" />
          </Layout>
        } />

        {/* Lógica de Redirección Inteligente */}
        <Route path="/redirect" element={
          <ProtectedRoute>
            <DriverRedirect />
          </ProtectedRoute>
        } />

        {/* Panel Mototaxi / Urbano */}
        <Route path="/mototaxi-panel" element={
          <ProtectedRoute allowedRoles={['mototaxi', 'motoparrillero', 'pasajero']}>
            <Layout title="Servicio Urbano" icon={Truck}>
              <div className="space-y-6">
                <LiveTrackingMap />
                <ViewPlaceholder title="Panel Operativo Individual" color="cyan" />
              </div>
            </Layout>
          </ProtectedRoute>
        } />

        {/* Panel Intermunicipal */}
        <Route path="/inter-panel" element={
          <ProtectedRoute allowedRoles={['intermunicipal', 'conductorinter']}>
            <Layout title="Rutas Intermunicipales" icon={Navigation}>
              <div className="space-y-6">
                <LiveTrackingMap height="400px" />
                <ViewPlaceholder title="Control de Rutas Largas" color="amber" />
              </div>
            </Layout>
          </ProtectedRoute>
        } />

        {/* Panel Despachador */}
        <Route path="/despachador-panel" element={
          <ProtectedRoute allowedRoles={['despachador', 'admin']}>
            <Layout title="Central de Despacho" icon={LayoutDashboard}>
              <div className="space-y-6">
                <LiveTrackingMap height="500px" />
                <ViewPlaceholder title="Monitor Global de Servicios" color="purple" />
              </div>
            </Layout>
          </ProtectedRoute>
        } />

        {/* Dashboard CEO */}
        <Route path="/admin-dashboard" element={
          <ProtectedRoute allowedRoles={['admin', 'ceo']}>
            <Layout title="CEO Console" icon={ShieldAlert}>
              <ViewPlaceholder title="Administración de Sistema" color="emerald" />
            </Layout>
          </ProtectedRoute>
        } />

        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/redirect" replace />} />
        <Route path="*" element={<Navigate to="/redirect" replace />} />
      </Routes>

      <style>{`
        body { margin: 0; background-color: #020617; font-family: 'Inter', sans-serif; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #020617; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #06b6d4; }
      `}</style>
    </BrowserRouter>
  );
}

/**
 * 6. PROVEEDOR DE AUTENTICACIÓN (Nivel Superior)
 */
export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    // Escucha en tiempo real de cambios de Auth y de Datos en Firestore
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', currentUser.uid);
        
        // Usamos onSnapshot para que si cambian el rol en la DB, el App reaccione al instante
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

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      <AppContent />
    </AuthContext.Provider>
  );
}