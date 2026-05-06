// Versión Arquitectura: V10.1 - Orquestador Maestro (Fix Case-Sensitivity)
/**
 * Archivo: frontend/src/App.jsx
 * Proyecto: TAXIA CIMCO
 * Misión: Orquestación global de rutas y gestión de estado de autenticación.
 * Estilo: Ciber-Neo-Brutalista (CIMCO-UI).
 */

import React, { useEffect, useState, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { 
  Loader2, LayoutDashboard, ShieldAlert, Truck, 
  Map as MapIcon, ShieldCheck, Wallet, User as UserIcon 
} from 'lucide-react';

// ✅ CORRECCIÓN CRÍTICA DE IMPORTACIÓN PARA CLOUDFLARE
// Se sincroniza exactamente con: components/wallet/WompiCheckout.jsx
import WompiCheckout from './components/wallet/WompiCheckout';
import BilleteraPanel from './pages/BilleteraPanel';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    // 🛡️ Monitor de estado de autenticación central
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
        <p className="text-cyan-500 font-mono text-xs tracking-[0.3em] uppercase">Iniciando CIMCO_OS...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user }}>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500 selection:text-black">
          
          {/* 🛰️ NAVBAR MAESTRA (Opcional - Visible si hay sesión) */}
          {user && (
            <nav className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                    <Truck className="text-black w-5 h-5" />
                  </div>
                  <span className="font-black italic tracking-tighter text-xl">TAXIA <span className="text-cyan-500">CIMCO</span></span>
                </div>
                <div className="flex gap-6">
                  <Link to="/billetera" className="text-[10px] font-black uppercase hover:text-cyan-400 transition-colors flex items-center gap-2">
                    <Wallet size={14} /> Billetera
                  </Link>
                  <Link to="/dashboard" className="text-[10px] font-black uppercase hover:text-cyan-400 transition-colors flex items-center gap-2">
                    <LayoutDashboard size={14} /> Dashboard
                  </Link>
                </div>
              </div>
            </nav>
          )}

          <Routes>
            {/* 💳 RUTA: PANEL DE BILLETERA */}
            <Route path="/billetera" element={<BilleteraPanel />} />

            {/* 📊 RUTA: DASHBOARD OPERATIVO (Prototipo) */}
            <Route path="/dashboard" element={
              <div className="p-8 max-w-7xl mx-auto">
                <header className="mb-12">
                  <h1 className="text-6xl font-black italic uppercase leading-none tracking-tighter">
                    Dashboard <span className="text-cyan-500 block">Operativo</span>
                  </h1>
                </header>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  {[
                    { label: 'Unidades Activas', val: '24', icon: <Truck className="text-cyan-400" /> },
                    { label: 'Servicios Hoy', val: '142', icon: <ShieldCheck className="text-emerald-400" /> },
                    { label: 'Alertas Sistema', val: '0', icon: <ShieldAlert className="text-rose-400" /> }
                  ].map((item, i) => (
                    <div key={i} className="bg-black border border-white/10 p-8 rounded-[2rem] shadow-xl">
                      <div className="flex items-center gap-3 mb-4">
                        {item.icon}
                        <span className="text-[10px] font-black uppercase text-slate-500">{item.label}</span>
                      </div>
                      <p className="text-5xl font-black italic text-white">{item.val}</p>
                    </div>
                  ))}
                </div>
                
                <section className="relative bg-black border-4 border-white h-[500px] shadow-[15px_15px_0px_0px_rgba(34,211,238,0.2)]">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:20px_20px]"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <MapIcon className="w-20 h-20 text-cyan-500/50 mx-auto mb-4 animate-pulse" />
                      <p className="text-cyan-500 font-mono italic uppercase tracking-[0.5em]">Rasterizando Mapa Global...</p>
                    </div>
                  </div>
                  <div className="absolute top-6 left-6 bg-cyan-500 px-4 py-1 border-2 border-black">
                    <p className="text-[12px] font-black text-black uppercase">Live_Feed_Encrypted</p>
                  </div>
                </section>
              </div>
            } />

            {/* 🔄 GESTIÓN DE RUTAS POR DEFECTO */}
            <Route path="/" element={<Navigate to="/billetera" replace />} />
            <Route path="*" element={<Navigate to="/billetera" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;