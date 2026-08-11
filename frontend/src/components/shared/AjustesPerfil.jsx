// Versión Arquitectura: V9.4 - Inyección Explícita de Token JWT y Soporte Multipart Resiliente
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Phone, Mail, Lock, Camera, ShieldCheck, 
  Bike, Save, ArrowLeft, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/config/api';

const AjustesPerfil = ({ onBack }) => {
  const navigate = useNavigate();
  const authContext = useAuth() || {};
  const user = authContext.user || null;
  const updateUser = authContext.updateUser || null;

  const [loading, setLoading] = useState(false);
  const [mensajeStatus, setMensajeStatus] = useState({ tipo: '', texto: '' });

  // Estados reactivos pre-poblados con guardas anti-undefined
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user?.fotoUrl || user?.foto || '');
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [telefono, setTelefono] = useState(user?.telefono || '');
  const [correo, setCorreo] = useState(user?.correo || user?.email || '');
  const [clave, setClave] = useState('');
  
  // Datos específicos del rol operativo / vehicular
  const [placa, setPlaca] = useState(user?.placa || user?.vehiculo?.placa || '');
  const [numeroInterno, setNumeroInterno] = useState(user?.numeroInterno || user?.vehiculo?.numeroInterno || '');
  const [empresa, setEmpresa] = useState(user?.empresa || user?.cooperativa || '');

  // Discriminación dinámica de rol para campos condicionales
  const rolUsuario = (user?.rol || user?.tipoUsuario || 'pasajero').toLowerCase();
  const esVehicular = ['mototaxi', 'motoparrillero', 'motocarga', 'intermunicipal', 'conductor'].includes(rolUsuario);

  useEffect(() => {
    if (user) {
      setNombre(user.nombre || '');
      setTelefono(user.telefono || '');
      setCorreo(user.correo || user.email || '');
      setPlaca(user.placa || user.vehiculo?.placa || '');
      setNumeroInterno(user.numeroInterno || user.vehiculo?.numeroInterno || '');
      setEmpresa(user.empresa || user.cooperativa || '');
      if (user.fotoUrl || user.foto) {
        setPreviewUrl(user.fotoUrl || user.foto);
      }
    }
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMensajeStatus({ tipo: 'error', texto: 'La imagen supera el límite permitido de 5MB.' });
        return;
      }
      setFotoPerfil(file);
      setPreviewUrl(URL.createObjectURL(file));
      setMensajeStatus({ tipo: '', texto: '' });
    }
  };

  const handleBackNavigation = () => {
    if (typeof onBack === 'function') {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensajeStatus({ tipo: '', texto: '' });

    try {
      const formData = new FormData();
      formData.append('nombre', nombre);
      formData.append('telefono', telefono);
      formData.append('correo', correo);
      
      if (clave.trim() !== '') {
        formData.append('clave', clave);
      }

      if (esVehicular) {
        formData.append('placa', placa);
        formData.append('numeroInterno', numeroInterno);
        formData.append('empresa', empresa);
      }

      if (fotoPerfil) {
        formData.append('fotoPerfil', fotoPerfil);
      }

      const userId = user?.id || user?._id || 'perfil';

      // Extracción limpia y fallback de token JWT antes de despachar
      const token = localStorage.getItem('cimco_token') || localStorage.getItem('token') || user?.token || user?.accessToken;
      
      const requestHeaders = {
        'Content-Type': 'multipart/form-data',
      };

      if (token) {
        const cleanToken = String(token).replace(/^"|"$/g, '').trim();
        if (cleanToken) {
          requestHeaders['Authorization'] = `Bearer ${cleanToken}`;
        }
      }

      const response = await api.put(`/usuarios/${userId}`, formData, {
        headers: requestHeaders,
      });

      const usuarioActualizado = response?.data?.usuario || response?.data || {};

      if (typeof updateUser === 'function') {
        updateUser(usuarioActualizado);
      }

      setMensajeStatus({ tipo: 'exito', texto: 'Configuración de perfil actualizada exitosamente.' });
      setClave('');
    } catch (error) {
      console.error('Error al actualizar ajustes de perfil:', error);
      const errorMsg = error?.response?.data?.mensaje || error?.response?.data?.message || 'Error de conexión al actualizar el perfil.';
      setMensajeStatus({ tipo: 'error', texto: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080d1a] bg-gradient-to-br from-[#080d1a] via-[#0f172a] to-[#1e1b4b] flex items-center justify-center p-4 font-sans text-slate-100 relative overflow-hidden">
      
      {/* Resplandores ambientales Glassmorphism */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9)] relative z-10 space-y-6">
        
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBackNavigation}
              type="button" 
              className="p-2 bg-slate-800/60 hover:bg-slate-700/60 rounded-xl transition-colors text-slate-300"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-black uppercase tracking-wider text-white">Configuración de Perfil</h1>
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Rol Activo: <span className="text-cyan-400 font-bold">{rolUsuario}</span>
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-mono uppercase font-bold">
            <ShieldCheck size={12} />
            <span>Perfil Autenticado</span>
          </div>
        </div>

        {/* Alertas de Feedback UI */}
        {mensajeStatus.texto && (
          <div className={`p-3.5 rounded-xl border text-xs font-mono flex items-center gap-2.5 ${
            mensajeStatus.tipo === 'exito' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            {mensajeStatus.tipo === 'exito' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{mensajeStatus.texto}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Módulo 1: Identidad y Avatar */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-2">
              <User size={14} /> 1. Datos Personales e Imagen de Perfil
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group">
                <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} className="text-slate-500" />
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 p-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl cursor-pointer shadow-lg transition-transform active:scale-95">
                  <Camera size={14} />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>

              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={nombre} 
                    onChange={(e) => setNombre(e.target.value)} 
                    required
                    className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400">Línea Celular</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 text-slate-500" size={14} />
                    <input 
                      type="tel" 
                      value={telefono} 
                      onChange={(e) => setTelefono(e.target.value)} 
                      required
                      className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-100 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all font-mono" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Módulo 2: Configuración de Unidad y Logística (Renderizado Condicional por Rol) */}
          {esVehicular && (
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-teal-400 font-bold flex items-center gap-2">
                <Bike size={14} /> 2. Información de Unidad y Operación
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400">Placa del Vehículo</label>
                  <input 
                    type="text" 
                    value={placa} 
                    onChange={(e) => setPlaca(e.target.value)} 
                    className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:border-teal-400 outline-none font-mono uppercase" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400">Número Interno</label>
                  <input 
                    type="text" 
                    value={numeroInterno} 
                    onChange={(e) => setNumeroInterno(e.target.value)} 
                    className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:border-teal-400 outline-none font-mono" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400">Empresa / Sede</label>
                  <input 
                    type="text" 
                    value={empresa} 
                    onChange={(e) => setEmpresa(e.target.value)} 
                    className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:border-teal-400 outline-none font-mono" 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Módulo 3: Credenciales de Seguridad */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-2">
              <Lock size={14} /> {esVehicular ? '3' : '2'}. Seguridad y Acceso
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-500" size={14} />
                  <input 
                    type="email" 
                    value={correo} 
                    onChange={(e) => setCorreo(e.target.value)} 
                    required
                    className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-100 focus:border-emerald-400 outline-none font-mono" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">Nueva Clave de Acceso (Opcional)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-500" size={14} />
                  <input 
                    type="password" 
                    placeholder="••••••••••••" 
                    value={clave} 
                    onChange={(e) => setClave(e.target.value)} 
                    className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-100 focus:border-emerald-400 outline-none font-mono tracking-widest" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botón Guardar */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black text-xs font-mono uppercase tracking-widest rounded-xl shadow-lg shadow-teal-500/20 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            <span>{loading ? "GUARDANDO AJUSTES..." : "ACTUALIZAR CONFIGURACIÓN"}</span>
          </button>

        </form>
      </div>
    </div>
  );
};

export default AjustesPerfil;