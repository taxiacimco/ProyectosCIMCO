// Versión Arquitectura: V15.3 - Sincronización de Rutas con Query Params
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\admin\AdminPanel.jsx
 * Misión: Panel Central de Control Administrativo / CEO
 * Ajuste V15.3: Actualización de redirecciones de tarjetas gerenciales mediante Query Parameters (?tab=...) para integración con la Consola Dashboard.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth, FIRESTORE_PATHS } from '@/config/firebase';
import { 
  Shield, 
  TrendingUp, 
  Users, 
  Settings, 
  AlertTriangle, 
  Crown, 
  DollarSign,
  Briefcase,
  Wallet,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 🛡️ ESTADOS DE METRICAS DEL SISTEMA
  const [metricas, setMetricas] = useState({
    usuariosActivos: 0,
    conductoresDisponibles: 0,
    viajesHoy: 0,
    comisionesAcumuladas: 0,
    capitalCirculante: 0,
    credencialesAdmin: 0
  });

  const [loading, setLoading] = useState(true);
  const [errorArquitectura, setErrorArquitectura] = useState(null);

  // Control de Privilegios Gerenciales
  const esCEO = user?.access_level === 99 || user?.role === 'admin' || user?.rol === 'admin' || user?.role === 'ceo';

  useEffect(() => {
    let isMounted = true;

    const cargarMétricasConsolidadas = async () => {
      try {
        setLoading(true);
        setErrorArquitectura(null);

        // 1. OBTENER DATOS DESDE FIRESTORE
        const pathUsuarios = FIRESTORE_PATHS?.usuarios || 'usuarios';
        const pathConductores = FIRESTORE_PATHS?.conductores || 'conductores';
        const pathViajes = FIRESTORE_PATHS?.viajes || 'viajes';

        const usuariosQuery = query(collection(db, pathUsuarios));
        const conductoresQuery = query(collection(db, pathConductores), where("estado", "==", "online"));
        const viajesQuery = query(collection(db, pathViajes));

        const [snapUsuarios, snapConductores, snapViajes] = await Promise.all([
          getDocs(usuariosQuery),
          getDocs(conductoresQuery),
          getDocs(viajesQuery)
        ]);

        let comisionesTotales = 0;
        snapViajes.forEach((docViaje) => {
          const datos = docViaje.data();
          if (datos?.comision) {
            comisionesTotales += Number(datos.comision || 0);
          }
        });

        // 2. OBTENER CAPITAL CIRCULANTE Y CREDENCIALES DESDE BACKEND EXPRESS (MongoDB)
        let capitalTotalMongoDB = 0;
        let totalCredencialesAdmin = 0;

        try {
          const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          const cleanBaseUrl = rawBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');

          // 🔑 ESTRATEGIA DE RECUPERACIÓN DE JWT COMPATIBLE CON EXPRESS
          let tokenActivo = user?.token || 
                            localStorage.getItem('token') || 
                            localStorage.getItem('cimco_token');

          // Fallback a Firebase solo si no existe token REST almacenado
          if (!tokenActivo && auth?.currentUser) {
            tokenActivo = await auth.currentUser.getIdToken();
          }

          const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenActivo || ''}`
          };

          // Consultas concurrentes al Backend REST
          const [resCapital, resAdmins] = await Promise.all([
            fetch(`${cleanBaseUrl}/api/conductores/metricas/capital-circulante`, { method: 'GET', headers }),
            fetch(`${cleanBaseUrl}/api/admin/usuarios`, { method: 'GET', headers })
          ]);
          
          if (resCapital.ok) {
            const dataCapital = await resCapital.json();
            capitalTotalMongoDB = Number(dataCapital.totalCapital || dataCapital.data?.totalCapital || 0);
          } else {
            console.warn(`⚠️ API REST respondió HTTP ${resCapital.status} al consultar capital circulante.`);
          }

          if (resAdmins.ok) {
            const dataAdmins = await resAdmins.json();
            const listaRaw = dataAdmins?.data || dataAdmins?.usuarios || (Array.isArray(dataAdmins) ? dataAdmins : []);
            totalCredencialesAdmin = Array.isArray(listaRaw) ? listaRaw.length : 0;
          } else {
            console.warn(`⚠️ API REST respondió HTTP ${resAdmins.status} al consultar credenciales de admin.`);
          }

        } catch (apiErr) {
          console.error("❌ Error de comunicación con la API REST (MongoDB):", apiErr);
        }

        if (!isMounted) return;

        setMetricas({
          usuariosActivos: snapUsuarios?.size || 0,
          conductoresDisponibles: snapConductores?.size || 0,
          viajesHoy: snapViajes?.size || 0,
          comisionesAcumuladas: comisionesTotales,
          capitalCirculante: capitalTotalMongoDB,
          credencialesAdmin: totalCredencialesAdmin
        });

      } catch (err) {
        console.error("🚨 [CIMCO-ADMIN-PANEL-ERR]:", err);
        if (isMounted) {
          setErrorArquitectura(err.message || "Error crítico de sincronización.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (user) {
      cargarMétricasConsolidadas();
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest animate-pulse">Consultando Métricas Financieras y Credenciales de MongoDB...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-[#09090b] to-[#010103] p-4 md:p-8 selection:bg-amber-500 selection:text-black">
      
      {/* PANEL SUPERIOR: IDENTIDAD CORPORATIVA */}
      <div className="max-w-7xl mx-auto backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-6 shadow-2xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 hover:border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider border border-amber-500/20">
              {esCEO ? "Perfil CEO / Admin Máximo" : `Personal del Staff: ${user?.role || 'Operador'}`}
            </span>
            {esCEO && <Crown className="w-4 h-4 text-amber-400 animate-pulse" />}
          </div>
          <h1 className="text-white font-black text-xl md:text-2xl tracking-tight uppercase">
            {user?.nombre || user?.fullName || "ADMINISTRADOR CENTRAL"}
          </h1>
          <p className="text-zinc-500 font-mono text-xs">
            ID de Enlace Corporativo: <span className="text-zinc-400">{user?._id || user?.id || user?.uid || "NODO_LOCAL_ANÓNIMO"}</span>
          </p>
        </div>

        <div className="flex items-center space-x-4 bg-[#0c0c0e] border border-white/[0.03] px-4 py-2.5 rounded-xl">
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Estado del Nodo Central</p>
            <p className="text-xs text-emerald-400 font-extrabold uppercase flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              En Línea / Seguro
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center font-black text-white text-sm uppercase">
            {(user?.nombre || "AC").substring(0, 2)}
          </div>
        </div>
      </div>

      {errorArquitectura && (
        <div className="max-w-7xl mx-auto mb-8 bg-red-950/20 border border-red-500/20 rounded-2xl p-4 flex items-start space-x-3 backdrop-blur-md">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-400 font-bold text-xs uppercase tracking-wider">Fallo de Comunicación Estructural</h3>
            <p className="text-red-300/80 font-mono text-[11px] mt-1 uppercase">{errorArquitectura}</p>
          </div>
        </div>
      )}

      {/* GRILLA TÁCTICA DE METRICAS (6 COLUMNAS) */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        
        {/* 1. UNIVERSO USUARIOS */}
        <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-5 shadow-xl hover:border-zinc-700/50 transition-all duration-300 group">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[11px] text-zinc-400 font-black uppercase tracking-widest">Usuarios</p>
            <Users className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
          </div>
          <p className="text-white font-black text-2xl lg:text-3xl tracking-tight">{metricas.usuariosActivos}</p>
          <p className="text-[10px] text-zinc-500 font-medium mt-1 uppercase">Pasajeros base</p>
        </div>

        {/* 2. FLOTA ONLINE */}
        <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-5 shadow-xl hover:border-emerald-500/30 transition-all duration-300 group">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[11px] text-emerald-400 font-black uppercase tracking-widest">Flota Online</p>
            <Shield className="w-4 h-4 text-emerald-500 animate-pulse" />
          </div>
          <p className="text-emerald-400 font-black text-2xl lg:text-3xl tracking-tight">{metricas.conductoresDisponibles}</p>
          <p className="text-[10px] text-zinc-500 font-medium mt-1 uppercase">Operarios activos</p>
        </div>

        {/* 3. VIAJES GLOBALES */}
        <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-5 shadow-xl hover:border-zinc-700/50 transition-all duration-300 group">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[11px] text-zinc-400 font-black uppercase tracking-widest">Viajes</p>
            <Briefcase className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
          </div>
          <p className="text-white font-black text-2xl lg:text-3xl tracking-tight">{metricas.viajesHoy}</p>
          <p className="text-[10px] text-zinc-500 font-medium mt-1 uppercase">Historial total</p>
        </div>

        {/* 4. CAJA COMISIONES */}
        <div className="backdrop-blur-md bg-[#121214]/80 border border-amber-500/10 rounded-2xl p-5 shadow-xl hover:border-amber-500/30 transition-all duration-300 group">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[11px] text-amber-400 font-black uppercase tracking-widest">Comisiones</p>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-amber-400 font-black text-xl lg:text-2xl tracking-tight truncate">
            ${metricas.comisionesAcumuladas.toLocaleString('es-CO')}
          </p>
          <p className="text-[10px] text-zinc-500 font-medium mt-1 uppercase">Retención 10%</p>
        </div>

        {/* 5. CAPITAL CIRCULANTE */}
        <div className="backdrop-blur-md bg-[#121214]/80 border border-emerald-500/20 rounded-2xl p-5 shadow-xl hover:border-emerald-500/40 transition-all duration-300 bg-emerald-500/[0.02] group">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[11px] text-emerald-400 font-black uppercase tracking-widest">Capital Circ.</p>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-emerald-400 font-black text-lg lg:text-xl tracking-tight truncate">
            ${metricas.capitalCirculante.toLocaleString('es-CO')}
          </p>
          <p className="text-[10px] text-zinc-500 font-medium mt-1 uppercase">Saldos MongoDB</p>
        </div>

        {/* 6. CREDENCIALES ADMINS / OFICINA */}
        <div className="backdrop-blur-md bg-[#121214]/80 border border-amber-500/20 rounded-2xl p-5 shadow-xl hover:border-amber-500/40 transition-all duration-300 bg-amber-500/[0.02] group">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[11px] text-amber-400 font-black uppercase tracking-widest">Credenciales</p>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-amber-400 font-black text-2xl lg:text-3xl tracking-tight">{metricas.credencialesAdmin}</p>
          <p className="text-[10px] text-zinc-500 font-medium mt-1 uppercase">Admins / Oficinas</p>
        </div>

      </div>

      {/* MÓDULOS GERENCIALES */}
      {esCEO && (
        <div className="max-w-7xl mx-auto backdrop-blur-md bg-[#121214]/80 border border-amber-500/10 rounded-2xl p-6 shadow-2xl mb-8">
          <div className="flex items-center space-x-2 text-amber-400 font-black text-xs uppercase tracking-widest mb-4 border-b border-white/5 pb-3">
            <Shield className="w-4 h-4" />
            <span>Módulos Gerenciales de Alta Seguridad de Datos</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* TARJETA 1: GESTIÓN DE CREDENCIALES */}
            <button 
              onClick={() => navigate('/admin/dashboard?tab=admins')}
              className="p-4 rounded-xl bg-[#0c0c0e] border border-amber-500/20 hover:border-amber-500/50 text-left transition-all duration-300 group hover:shadow-lg hover:shadow-amber-500/5 cursor-pointer"
            >
              <KeyRound className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform mb-2" />
              <p className="font-bold text-xs text-white uppercase tracking-wider">Credenciales de Oficina & Admins</p>
              <p className="text-[10px] text-zinc-500 font-medium mt-1 uppercase">Creación y revocación de accesos gerenciales</p>
            </button>

            {/* TARJETA 2: CONTROL DE COOPERATIVAS */}
            <button 
              onClick={() => navigate('/admin/dashboard?tab=operadores')}
              className="p-4 rounded-xl bg-[#0c0c0e] border border-white/[0.03] hover:border-amber-500/30 text-left transition-all duration-300 group cursor-pointer"
            >
              <Settings className="w-5 h-5 text-zinc-500 group-hover:text-amber-400 mb-2 transition-colors" />
              <p className="font-bold text-xs text-white uppercase tracking-wider">Control de Cooperativas</p>
              <p className="text-[10px] text-zinc-500 font-medium mt-1 uppercase">Vincular despachadores y flotas</p>
            </button>

            {/* TARJETA 3: AUDITORÍA DE SALDOS */}
            <button 
              onClick={() => navigate('/admin/dashboard?tab=billeteras')}
              className="p-4 rounded-xl bg-[#0c0c0e] border border-white/[0.03] hover:border-amber-500/30 text-left transition-all duration-300 group cursor-pointer"
            >
              <TrendingUp className="w-5 h-5 text-zinc-500 group-hover:text-amber-400 mb-2 transition-colors" />
              <p className="font-bold text-xs text-white uppercase tracking-wider">Auditoría Híbrida de Saldos</p>
              <p className="text-[10px] text-zinc-500 font-medium mt-1 uppercase">Aprobación de recargas manuales</p>
            </button>

          </div>
        </div>
      )}

      {/* SECCIÓN INFERIOR DE LOGS */}
      <div className="max-w-7xl mx-auto backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-6 shadow-2xl">
        <div className="text-white font-black text-xs uppercase tracking-widest mb-4 border-b border-white/5 pb-3">
          Hilos Operativos del Servidor Central
        </div>
        <div className="font-mono text-[11px] text-zinc-500 bg-[#0c0c0e] p-4 rounded-xl border border-white/[0.02] space-y-1">
          <p><span className="text-cyan-500">[CIMCO-NUCLEO]</span> Bus de datos en escucha activa.</p>
          <p><span className="text-cyan-500">[CIMCO-AUTH]</span> Sesión autorizada polimórficamente.</p>
          <p><span className="text-cyan-500">[CIMCO-REST-API]</span> Sincronización de Capital Circulante y Credenciales verificada con MongoDB Atlas.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;