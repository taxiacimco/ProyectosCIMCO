// Versión Arquitectura: V8.5 - Unificación de lectura de campo 'rol' y limpieza de dependencias
/**
 * Componente DriverRedirect
 * Propósito: Actúa como un "Controlador de Tráfico" tras el inicio de sesión.
 * Lee el rol del usuario desde Firestore y lo envía a su panel correspondiente.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// [AJUSTE ARQUITECTURA]: Importaciones limpias desde la configuración central en lugar de inyecciones inline
import { db, auth } from '../firebase/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

const DriverRedirect = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      // [REGLA SAGRADA]: Mismo path centralizado
      const userRef = doc(db, 'artifacts', 'taxiacimco-app', 'public', 'data', 'usuarios', user.uid);
      
      const unsubDoc = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          
          // [AJUSTE ARQUITECTURA]: Leemos 'rol' en lugar de 'role'
          const role = (userData.rol || userData.servicio || '').toLowerCase();

          // Mapeo lógico conservado según estructura /pages
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
          console.error("⚠️ [CIMCO] Perfil no encontrado en la ruta de datos.");
          setLoading(false);
        }
      }, (error) => {
        console.error("Firestore Error:", error);
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
            Sincronizando acceso por rol...
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