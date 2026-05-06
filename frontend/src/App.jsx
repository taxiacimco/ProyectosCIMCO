// Versión Arquitectura: V10.0 - Fix de Rutas Case-Sensitive y Orquestación Global
/**
 * Archivo: frontend/src/App.jsx
 * Misión: Orquestador maestro de rutas. 
 * AJUSTE: Se corrige la importación de WompiCheckout para garantizar compatibilidad con Cloudflare.
 */

import React, { useEffect, useState, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Loader2, LayoutDashboard, ShieldAlert, Truck, Map as MapIcon, ShieldCheck } from 'lucide-react';

// ✅ CORRECCIÓN DE IMPORTACIÓN: Case-sensitivity ajustado para producción
import WompiCheckout from './components/wallet/WompiCheckout';
import BilleteraPanel from './pages/BilleteraPanel';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    // 🛡️ Observador de estado de autenticación centralizado
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  // UI de Carga Neo-Brutalista
  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center font-mono text-cyan-500">
        <div className="relative">
          <Loader2 className="w-20 h-20 animate-spin mb-4 opacity-70" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
          </div>
        </div>
        <p className="uppercase font-black tracking-[0.3em] animate-pulse">CIMCO OS_LOADING</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user }}>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-cyan-500/30">
          
          <Routes>
            {/* 🛡️ RUTA: LOGIN - Estética Ciber-Brutalista */}
            <Route path="/login" element={
              <div className="h-screen flex items-center justify-center bg-slate-950 p-6">
                <div className="max-w-md w-full border-4 border-white p-8 bg-slate-900 shadow-[12px_12px_0px_0px_rgba(34,211,238,1)]">
                  <h2 className="text-4xl font-black italic mb-6 uppercase tracking-tighter">Acceso Terminal</h2>
                  <div className="space-y-6">
                    <p className="text-xs text-slate-500 font-mono leading-relaxed">
                      SISTEMA TAXIA CIMCO: Monitoreo de seguridad activo. Ingrese credenciales autorizadas.
                    </p>
                    <Link to="/billetera" className="group flex items-center justify-center gap-3 w-full py-5 bg-cyan-500 text-black font-black uppercase hover:bg-white transition-all transform active:translate-y-1 active:shadow-none shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
                      Entrar al Sistema <ShieldCheck className="w-6 h-6" />
                    </Link>
                  </div>
                </div>
              </div>
            } />

            {/* 💸 RUTA: BILLETERA - Panel Principal de Transacciones */}
            <Route path="/billetera" element={user ? <BilleteraPanel /> : <Navigate to="/login" />} />

            {/* 📊 RUTA: DASHBOARD - Centro de Operaciones */}
            <Route path="/dashboard" element={
              <div className="p-8 max-w-7xl mx-auto">
                <header className="flex items-center justify-between mb-12 border-b-8 border-white pb-6">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-yellow-500 text-black transform -rotate-3 border-4 border-black">
                      <LayoutDashboard size={40} strokeWidth={3} />
                    </div>
                    <h1 className="text-6xl font-black italic uppercase tracking-tighter">CIMCO_CORE</h1>
                  </div>
                  <div className="text-right font-mono">
                    <p className="text-cyan-400 text-sm font-bold">STATUS: STABLE</p>
                    <p className="text-white/30 text-[10px]">BUILD_ID: 2026.05.06_V10</p>
                  </div>
                </header>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                  {[
                    { label: 'Unidades Activas', icon: Truck, val: '248' },
                    { label: 'Alertas SOS', icon: ShieldAlert, val: '02' },
                    { label: 'Geocercas', icon: MapIcon, val: '12' },
                    { label: 'Sistemas', icon: ShieldCheck, val: 'OK' }
                  ].map((item) => (
                    <div key={item.label} className="bg-slate-800 border-4 border-white p-6 hover:bg-slate-700 transition-colors shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
                      <div className="flex justify-between items-start mb-4">
                        <item.icon className="text-yellow-500" size={24} />
                        <span className="text-[12px] font-black uppercase text-slate-400 tracking-widest">{item.label}</span>
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

            {/* 🔄 GESTIÓN DE RUTAS NO ENCONTRADAS */}
            <Route path="/" element={<Navigate to="/billetera" replace />} />
            <Route path="*" element={<Navigate to="/billetera" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;