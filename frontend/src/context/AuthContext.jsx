import React, { createContext, useContext, useEffect, useState, memo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithPopup,
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Loader2, Mail, Lock, Chrome, 
  ShieldCheck, ArrowRight, User, Smartphone,
  Navigation, LayoutDashboard, Truck, LogOut
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'taxiacimco-app';

// --- CONTEXTO DE AUTENTICACIÓN (AuthContext) ---
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Lógica de PWA Dinámica integrada en el contexto
  const updatePWA = (role) => {
    if (!role || typeof document === 'undefined') return;
    
    let manifest = 'manifest-pasajero.webmanifest';
    if (['admin', 'ceo', 'despachador'].includes(role)) manifest = 'manifest-despachador.webmanifest';
    if (['intermunicipal', 'conductorinter', 'mototaxi'].includes(role)) manifest = 'manifest-conductorinter.webmanifest';

    const oldLink = document.querySelector('link[rel="manifest"]');
    if (oldLink) oldLink.remove();
    
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = `/${manifest}`;
    document.head.appendChild(link);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .catch(err => console.error('SW Error:', err));
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          if (!auth.currentUser) await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Error inicializando Auth:", err);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser && !firebaseUser.isAnonymous) {
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult(true);
          const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', firebaseUser.uid);

          const unsubSnapshot = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              const firestoreData = docSnap.data();
              
              // LÓGICA DE ROLES MULTI-NIVEL
              const userRole = (
                idTokenResult.claims.role || 
                firestoreData.rol || 
                firestoreData.role || 
                (firebaseUser.email === 'taxiacimco@gmail.com' ? 'admin' : 'pasajero')
              ).toLowerCase();
              
              const fullUserData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firestoreData.nombre || firebaseUser.displayName || 'Usuario CIMCO',
                role: userRole,
                isVerified: firestoreData.isVerified || false,
                documentosAprobados: firestoreData.documentosAprobados || false,
                ...firestoreData
              };

              setUser(fullUserData);
              updatePWA(userRole);
            } else {
              const basicRole = firebaseUser.email === 'taxiacimco@gmail.com' ? 'admin' : 'pasajero';
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                role: basicRole
              });
              updatePWA(basicRole);
            }
            setLoading(false);
          }, (err) => {
            console.error("Error Firestore:", err);
            setLoading(false);
          });

          return () => unsubSnapshot();
        } catch (error) {
          console.error("Error procesando sesión:", error);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return await signInWithPopup(auth, provider);
  };
  const logout = () => signOut(auth);

  const roles = {
    isAdmin: ['admin', 'ceo'].includes(user?.role),
    isPassenger: user?.role === 'pasajero',
    isMotoTaxi: user?.role === 'mototaxi',
    isAnyDriver: ['mototaxi', 'motocarga', 'conductorinter', 'intermunicipal'].includes(user?.role),
    currentRole: user?.role
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithEmail, loginWithGoogle, logout, db, auth, appId, ...roles }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// --- COMPONENTES DE INTERFAZ ---

const Layout = ({ children, title, icon: Icon = Navigation }) => {
  const { logout, user } = useAuth();
  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans">
      <header className="border-b border-white/5 p-4 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-[100] flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Icon size={18} className="text-white" />
          </div>
          <h1 className="text-lg font-black text-white italic uppercase tracking-tighter">
            CIMCO <span className="text-cyan-500">V3</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase bg-white/5 px-3 py-1 rounded-full border border-white/5">
            {user?.role}
          </span>
          <button onClick={logout} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <main className="p-4 max-w-7xl mx-auto">{children}</main>
    </div>
  );
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, currentRole } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-cyan-400">
      <Loader2 className="animate-spin mb-4" size={48} />
      <span className="font-black tracking-widest uppercase text-[10px]">Cargando CIMCO v3</span>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(currentRole)) return <Navigate to="/redirect" replace />;
  return children;
};

// --- PÁGINAS ---

const LoginPage = () => {
  const { loginWithEmail, loginWithGoogle, user, loading: authLoading } = useAuth();
  const [localLoading, setLocalLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (authLoading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-cyan-500" size={48} />
    </div>
  );

  if (user) return <Navigate to="/redirect" replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLocalLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (err) {
      console.error(err);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full"></div>
      <div className="w-full max-w-md z-10">
        <div className="bg-slate-900/80 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl mb-4">
              <ShieldCheck size={28} className="text-white" />
            </div>
            <h1 className="text-3xl font-black italic text-white tracking-tighter">CIMCO<span className="text-cyan-500 text-xl not-italic ml-1">v3</span></h1>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.4em] mt-2">Unified Authentication System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="email" placeholder="Email institucional" required
                className="w-full bg-black/40 border border-white/5 p-4 pl-12 rounded-2xl text-sm focus:border-cyan-500/50 outline-none transition-all"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="password" placeholder="Contraseña" required
                className="w-full bg-black/40 border border-white/5 p-4 pl-12 rounded-2xl text-sm focus:border-cyan-500/50 outline-none transition-all"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button 
              disabled={localLoading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2"
            >
              {localLoading ? <Loader2 className="animate-spin" size={18} /> : <>Entrar al Sistema <ArrowRight size={14}/></>}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <span className="relative bg-slate-900 px-4 text-[8px] font-black text-slate-600 uppercase block text-center">Acceso Rápido</span>
          </div>

          <button 
            onClick={loginWithGoogle}
            className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
          >
            <Chrome size={18} className="text-cyan-400" /> Google Account
          </button>
        </div>
      </div>
    </div>
  );
};

const PanelRedirect = () => {
  const { currentRole } = useAuth();
  if (['admin', 'ceo'].includes(currentRole)) return <Navigate to="/admin" replace />;
  if (currentRole === 'despachador') return <Navigate to="/despacho" replace />;
  if (['mototaxi', 'motocarga'].includes(currentRole)) return <Navigate to="/urbano" replace />;
  if (['intermunicipal', 'conductorinter'].includes(currentRole)) return <Navigate to="/intermunicipal" replace />;
  return <Navigate to="/pasajero" replace />;
};

// --- APP COMPONENT ---

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/redirect" element={<ProtectedRoute><PanelRedirect /></ProtectedRoute>} />
          
          <Route path="/pasajero" element={
            <ProtectedRoute allowedRoles={['pasajero']}>
              <Layout title="Pasajero" icon={User}>
                <div className="bg-slate-900 border border-white/10 p-10 rounded-[2.5rem] text-center">
                  <h2 className="text-2xl font-black uppercase italic">Panel de Pasajero</h2>
                  <p className="text-slate-400 mt-2">Solicita tu servicio ahora.</p>
                </div>
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/urbano" element={
            <ProtectedRoute allowedRoles={['mototaxi', 'motocarga']}>
              <Layout title="Urbano" icon={Truck}>
                <div className="bg-slate-900 border border-white/10 p-10 rounded-[2.5rem] text-center">
                  <h2 className="text-2xl font-black uppercase italic">Panel Conductor Urbano</h2>
                  <p className="text-slate-400 mt-2">Esperando servicios...</p>
                </div>
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin', 'ceo']}>
              <Layout title="Admin" icon={LayoutDashboard}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-cyan-600/10 border border-cyan-500/20 p-6 rounded-3xl">
                    <h3 className="text-xs font-black uppercase text-cyan-400">Total Usuarios</h3>
                    <p className="text-3xl font-black mt-1">--</p>
                  </div>
                </div>
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/" element={<Navigate to="/redirect" replace />} />
          <Route path="*" element={<Navigate to="/redirect" replace />} />
        </Routes>
      </BrowserRouter>
      <style>{`
        body { margin: 0; background-color: #020617; font-family: 'Inter', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </AuthProvider>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />);
}