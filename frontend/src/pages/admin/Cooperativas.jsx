// Versión Arquitectura: V15.3 - Mapeo Defensivo de Límites de Flota y Control de Retorno SPA
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\admin\Cooperativas.jsx
 * Misión: Control de Cooperativas y Flotas
 * Ajuste V15.3:
 *  1. Mapeo defensivo estricto para límite de vehículos / flota (limiteFlota, limiteVehiculos) contra undefined/null.
 *  2. Preservación del estado de navegación mediante React Router navigate('/admin/dashboard').
 *  3. Integración limpia con alias @ y guardas de seguridad en desestructuración/parseo de respuestas MongoDB.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/config/firebase';
import { 
  Building2, 
  Plus, 
  ArrowLeft, 
  Search, 
  ShieldAlert, 
  Phone, 
  Truck, 
  X,
  Loader2
} from 'lucide-react';

const Cooperativas = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [cooperativas, setCooperativas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  // Modal State
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    nit: '',
    telefono: '',
    limiteVehiculos: 50
  });

  // Helper para recuperar token JWT REST con guardas de seguridad
  const getAuthToken = async () => {
    let token = user?.token || localStorage.getItem('token') || localStorage.getItem('cimco_token');
    if (!token && auth?.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
    return token || '';
  };

  // 1. CARGAR COOPERATIVAS
  const cargarCooperativas = async () => {
    try {
      setLoading(true);
      const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const cleanBaseUrl = rawBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
      const token = await getAuthToken();

      const response = await fetch(`${cleanBaseUrl}/api/cooperativas`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        const listaRaw = result?.data || result?.cooperativas || (Array.isArray(result) ? result : []);
        setCooperativas(Array.isArray(listaRaw) ? listaRaw : []);
      } else {
        console.warn('⚠️ No se pudieron consultar las cooperativas del servidor.');
      }
    } catch (err) {
      console.error('❌ Error al obtener cooperativas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCooperativas();
  }, []);

  // 2. CREAR COOPERATIVA
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorModal('');

    const nombreLimpio = formData.nombre?.trim() || '';
    const nitLimpio = formData.nit?.trim() || '';

    if (!nombreLimpio || !nitLimpio) {
      setErrorModal('El Nombre y el NIT son obligatorios.');
      return;
    }

    try {
      setGuardando(true);
      const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const cleanBaseUrl = rawBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
      const token = await getAuthToken();

      const response = await fetch(`${cleanBaseUrl}/api/cooperativas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          nombre: nombreLimpio,
          nit: nitLimpio,
          limiteVehiculos: Number(formData.limiteVehiculos) || 50
        })
      });

      const result = await response.json();

      if (response.ok && (result?.success || result?.ok)) {
        await cargarCooperativas();
        setModalAbierto(false);
        setFormData({ nombre: '', nit: '', telefono: '', limiteVehiculos: 50 });
      } else {
        setErrorModal(result?.error || result?.message || 'Error al guardar la cooperativa.');
      }
    } catch (err) {
      console.error('❌ Error de red:', err);
      setErrorModal('Error de comunicación con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  const cooperativasFiltradas = (cooperativas || []).filter(coop => {
    const nombreStr = coop?.nombre?.toLowerCase() || '';
    const nitStr = coop?.nit?.toLowerCase() || '';
    const query = busqueda.toLowerCase().trim();
    return nombreStr.includes(query) || nitStr.includes(query);
  });

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-4 md:p-8 font-sans selection:bg-amber-500 selection:text-black">
      
      {/* HEADER CON BOTÓN DE REGRESO DE SEGURIDAD SPA */}
      <div className="max-w-7xl mx-auto backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-6 shadow-2xl mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="p-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:border-amber-500/50 hover:bg-zinc-800 transition-all cursor-pointer"
            title="Volver al Panel Principal"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <div>
            <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider border border-amber-500/20">
              Módulo CEO
            </span>
            <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase mt-1 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-amber-400" />
              Control de Cooperativas y Flotas
            </h1>
          </div>
        </div>

        <button 
          onClick={() => {
            setErrorModal('');
            setModalAbierto(true);
          }}
          className="w-full md:w-auto px-5 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-lg shadow-amber-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Nueva Cooperativa
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text"
            placeholder="Buscar por Nombre o NIT..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-[#121214]/80 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-all"
          />
        </div>
      </div>

      {/* RESULTADOS */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-12 text-center">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
            <p className="text-zinc-500 text-xs font-mono uppercase">Consultando datos en MongoDB...</p>
          </div>
        ) : cooperativasFiltradas.length === 0 ? (
          <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-16 text-center">
            <Building2 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-zinc-400 font-bold text-sm uppercase">No hay cooperativas registradas</h3>
            <p className="text-zinc-600 text-xs mt-1">Presiona "Nueva Cooperativa" para añadir la primera entidad operativa.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cooperativasFiltradas.map((coop) => {
              // 🛡️ MAPEO DEFENSIVO INTERCAMBIABLE DE LÍMITE DE FLOTA
              const limiteCalculado = coop?.limiteFlota ?? coop?.limiteVehiculos ?? coop?.limite_vehiculos ?? 50;
              const targetId = coop?._id || coop?.id || Math.random();

              return (
                <div 
                  key={targetId} 
                  className="backdrop-blur-md bg-[#121214]/80 border border-white/5 hover:border-amber-500/30 rounded-2xl p-5 shadow-xl transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-black text-white text-base tracking-tight uppercase truncate">{coop?.nombre || 'Sin nombre'}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase shrink-0">
                      {coop?.estado || 'Activa'}
                    </span>
                  </div>
                  
                  <p className="text-zinc-400 font-mono text-xs mb-4">NIT: {coop?.nit || 'N/A'}</p>

                  <div className="space-y-2 pt-3 border-t border-white/5 text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{coop?.telefono || 'Sin teléfono'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Límite de Flota: <strong className="text-white">{limiteCalculado}</strong> vehículos</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121214] border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            
            <button 
              onClick={() => setModalAbierto(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-amber-400 mb-6">
              <Building2 className="w-5 h-5" />
              <h2 className="font-black text-sm uppercase tracking-wider text-white">Nueva Cooperativa</h2>
            </div>

            {errorModal && (
              <div className="mb-4 bg-red-950/30 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-red-400 text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorModal}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Nombre Entidad</label>
                <input 
                  type="text"
                  placeholder="Ej. Cootransjagua R.L."
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  disabled={guardando}
                  className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-all disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">NIT Corporativo</label>
                <input 
                  type="text"
                  placeholder="Ej. 900.123.456-7"
                  value={formData.nit}
                  onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                  disabled={guardando}
                  className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-all disabled:opacity-50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Teléfono Contacto</label>
                  <input 
                    type="text"
                    placeholder="300 000 0000"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    disabled={guardando}
                    className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-all disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Límite Vehículos</label>
                  <input 
                    type="number"
                    placeholder="50"
                    value={formData.limiteVehiculos}
                    onChange={(e) => setFormData({ ...formData, limiteVehiculos: e.target.value })}
                    disabled={guardando}
                    className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-800/50">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  disabled={guardando}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-extrabold text-xs uppercase rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {guardando ? 'Guardando...' : 'Crear Entidad'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default Cooperativas;