// Versión Arquitectura: V4.0 - Orquestador Maestro de Rutas con Bypass de Pago
/**
 * Archivo: frontend/src/App.jsx
 * Misión: Gestionar el ruteo global y el estado de autenticación de TAXIA CIMCO.
 * Estilo: Ciber-Neo-Brutalista con Tailwind CSS.
 */

import React, { useEffect, useState, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Loader2, LayoutDashboard, ShieldAlert, Truck, Map as MapIcon, ShieldCheck } from 'lucide-react';

// ✅ IMPORTACIÓN DE COMPONENTES DE SERVICIO
import WompiCheckout from './components/wallet/WompiCheckout';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    // Escucha maestra de autenticación
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  // Pantalla de carga Neo-Brutalista
  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center font-mono text-yellow-500">
        <div className="relative">
          <Loader2 className="w-16 h-16 animate-spin mb-4 opacity-80" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping" />
          </div>
        </div>
        <p className="uppercase font-black tracking-widest animate-pulse">CIMCO OS [BOOTING...]</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user }}>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-cyan-500/30">
          
          <Routes>
            {/* 🛡️ RUTA: LOGIN */}
            <Route path="/login" element={
              <div className="h-screen flex items-center justify-center bg-slate-950 p-6">
                <div className="max-w-md w-full border-4 border-white p-8 bg-slate-900 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
                  <h2 className="text-3xl font-black italic mb-6 uppercase tracking-tighter">Acceso de Comando</h2>
                  <div className="space-y-6">
                    <p className="text-sm text-slate-400 font-mono italic">Bypass de seguridad activo para entorno de pruebas.</p>
                    <Link to="/billetera" className="group flex items-center justify-center gap-3 w-full py-4 bg-yellow-500 text-black font-black uppercase hover:bg-white transition-all transform active:translate-y-1 active:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      Entrar a Billetera <ShieldCheck className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            } />

            {/* 💸 RUTA: BILLETERA (Bypass de Maniobra de Extracción) */}
            <Route path="/billetera" element={
              <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
                <div className="w-full max-w-lg">
                  <WompiCheckout amount={15000} />
                </div>
              </div>
            } />

            {/* 📊 RUTA: DASHBOARD (Panel Central Migrado) */}
            <Route path="/dashboard" element={
              <div className="p-8 max-w-7xl mx-auto">
                <header className="flex items-center justify-between mb-12 border-b-4 border-white pb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-cyan-500 text-black">
                      <LayoutDashboard size={32} strokeWidth={3} />
                    </div>
                    <h1 className="text-5xl font-black italic uppercase tracking-tighter">Panel Central CIMCO</h1>
                  </div>
                  <div className="hidden md:block font-mono text-right">
                    <p className="text-cyan-400 text-xs">SISTEMA: ONLINE</p>
                    <p className="text-white/50 text-[10px]">V.1.2.0-CORE</p>
                  </div>
                </header>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                  {[
                    { label: 'Conductores', icon: Truck },
                    { label: 'Pasajeros', icon: ShieldAlert },
                    { label: 'Viajes', icon: MapIcon },
                    { label: 'Alertas', icon: ShieldAlert }
                  ].map((item) => (
                    <div key={item.label} className="bg-slate-800 border-2 border-white p-6 hover:translate-x-1 hover:-translate-y-1 transition-transform shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                      <div className="flex justify-between items-start mb-4">
                        <item.icon className="text-cyan-400" size={20} />
                        <span className="text-[10px] font-black uppercase text-slate-500">{item.label}</span>
                      </div>
                      <p className="text-4xl font-black italic">--</p>
                    </div>
                  ))}
                </div>
                
                <section className="relative bg-slate-800 border-4 border-white h-[450px] overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <MapIcon className="w-16 h-16 text-slate-700 mx-auto mb-4 animate-pulse" />
                      <p className="text-slate-500 font-mono italic uppercase tracking-widest">Inyectando Capa de Mapas...</p>
                    </div>
                  </div>
                  <div className="absolute top-4 left-4 bg-black/80 px-4 py-2 border-2 border-cyan-500">
                    <p className="text-[10px] font-black text-cyan-400 uppercase tracking-tighter">Geofencing: Activo</p>
                  </div>
                </section>
              </div>
            } />

            {/* 🔄 REDIRECCIONES DE SEGURIDAD */}
            <Route path="/" element={<Navigate to="/billetera" replace />} />
            <Route path="*" element={<Navigate to="/billetera" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;