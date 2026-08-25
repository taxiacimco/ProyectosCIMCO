// Versión Arquitectura: V16.3 - Módulo Unificado de Gestión de Perfil Multi-Rol
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Phone, Mail, Lock, Camera, ShieldCheck, 
  Bike, Landmark, Save, X, ArrowLeft, AlertCircle, CheckCircle2, Loader2 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/config/api';

export default function AjustesPerfil({ isOpen, onClose, onBack, onUpdateSuccess }) {
  const navigate = useNavigate();
  const authContext = useAuth() || {};
  const user = authContext.user || null;
  const updateUser = authContext.updateUser || null;

  const [loading, setLoading] = useState(false);
  const [mensajeStatus, setMensajeStatus] = useState({ tipo: '', texto: '' });

  // Estados de formulario
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  
  // Campos operativos y de rol
  const [placa, setPlaca] = useState('');
  const [numeroInterno, setNumeroInterno] = useState('');
  const [cooperativa, setCooperativa] = useState('');

  // Identificación dinámica del rol
  const rolUsuario = (user?.rol || user?.role || user?.tipoUsuario || 'pasajero').toLowerCase();
  const esVehicular = ['mototaxi', 'motoparrillero', 'motocarga', 'intermunicipal', 'conductor'].includes(rolUsuario);
  const esDespachador = ['despachador', 'admin', 'operador'].includes(rolUsuario);

  // Sincronización de datos al cargar el usuario o cambiar estado del modal
  useEffect(() => {
    if (user) {
      setNombre(user?.nombre || user?.fullName || '');
      setTelefono(user?.telefono || user?.telefonoMovil || '');
      setCorreo(user?.correo || user?.email || '');
      setPlaca(user?.placa || user?.vehiculo?.placa || '');
      setNumeroInterno(user?.numeroInterno || user?.vehiculo?.numeroInterno || '');
      setCooperativa(user?.cooperativa || user?.empresa || '');
      setPreviewUrl(user?.fotoUrl || user?.foto || '');
      setMensajeStatus({ tipo: '', texto: '' });
    }
  }, [user, isOpen]);

  // Si se utiliza como modal yisOpen viene definido como false, se oculta
  if (isOpen === false) return null;

  // Sanitización en tiempo real para el teléfono (solo dígitos, máximo 10)
  const handleTelefonoChange = (e) => {
    const valorLimpio = (e.target.value || '').replace(/\D/g, '').slice(0, 10);
    setTelefono(valorLimpio);
  };

  // Previsualización y validación de peso de imagen
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
    if (typeof onClose === 'function') {
      onClose();
    } else if (typeof onBack === 'function') {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensajeStatus({ tipo: '', texto: '' });

    const nombreSanitizado = nombre.trim();
    const telefonoLimpio = telefono.trim();

    if (!nombreSanitizado) {
      setMensajeStatus({ tipo: 'error', texto: 'El nombre completo es obligatorio.' });
      setLoading(false);
      return;
    }

    // Validación estricta con RegEx para celular en Colombia (10 dígitos iniciando en 3)
    const regexTelefonoColombia = /^3\d{9}$/;
    if (!regexTelefonoColombia.test(telefonoLimpio)) {
      setMensajeStatus({ 
        tipo: 'error', 
        texto: 'Ingrese un número celular válido de Colombia (10 dígitos iniciando con 3).' 
      });
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('nombre', nombreSanitizado);
      formData.append('telefono', telefonoLimpio);
      formData.append('telefonoMovil', telefonoLimpio);
      formData.append('correo', correo.trim());
      formData.append('rol', rolUsuario);
      
      if (clave.trim() !== '') {
        formData.append('clave', clave);
      }

      if (esVehicular) {
        formData.append('placa', placa.trim().toUpperCase());
        formData.append('numeroInterno', numeroInterno.trim());
        formData.append('cooperativa', cooperativa.trim());
        formData.append('empresa', cooperativa.trim());
      } else if (esDespachador) {
        formData.append('cooperativa', cooperativa.trim());
        formData.append('empresa', cooperativa.trim());
      }

      if (fotoPerfil) {
        formData.append('fotoPerfil', fotoPerfil);
      }

      // Inyección explícita del token de autorización
      const token = localStorage.getItem('cimco_token') || localStorage.getItem('token') || user?.token;
      const requestHeaders = {
        'Content-Type': 'multipart/form-data',
      };

      if (token) {
        const cleanToken = String(token).replace(/^"|"$/g, '').trim();
        if (cleanToken) {
          requestHeaders['Authorization'] = `Bearer ${cleanToken}`;
        }
      }

      const response = await api.put('/auth/update-profile', formData, {
        headers: requestHeaders,
      });

      const usuarioActualizado = response?.data?.usuario || response?.data?.user || response?.data || {};

      if (typeof updateUser === 'function') {
        updateUser(usuarioActualizado);
      }

      if (typeof onUpdateSuccess === 'function') {
        onUpdateSuccess(usuarioActualizado);
      }

      setMensajeStatus({ tipo: 'exito', texto: 'Perfil actualizado correctamente.' });
      setClave('');

      if (isOpen !== undefined && typeof onClose === 'function') {
        setTimeout(() => onClose(), 1000);
      }

    } catch (error) {
      console.error('❌ Error actualizando perfil unificado:', error);
      const errorMsg = error?.response?.data?.mensaje || error?.response?.data?.message || 'Error de conexión al actualizar el perfil.';
      setMensajeStatus({ tipo: 'error', texto: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const esModal = isOpen !== undefined;

  return (
    <div className={esModal 
      ? "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      : "min-h-screen bg-[#080d1a] bg-gradient-to-br from-[#080d1a] via-[#0f172a] to-[#1e1b4b] flex items-center justify-center p-4 font-sans text-slate-100 relative overflow-hidden"
    }>
      <div className="w-full max-w-xl bg-[#121214]/95 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-white space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Resplandores ambientales CIMCO-UI V9.3 */}
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBackNavigation}
              type="button" 
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
            >
              {esModal ? <X size={18} /> : <ArrowLeft size={18} />}
            </button>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-amber-500">
                Ajustes del Perfil
              </h2>
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Rol Activo: <span className="text-amber-400 font-bold">{rolUsuario}</span>
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-mono uppercase font-bold">
            <ShieldCheck size={12} />
            <span>Perfil Autenticado</span>
          </div>
        </div>

        {/* Feedback de estado */}
        {mensajeStatus.texto && (
          <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
            mensajeStatus.tipo === 'exito' 
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}>
            {mensajeStatus.tipo === 'exito' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{mensajeStatus.texto}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Módulo 1: Identidad y Avatar */}
          <div className="bg-[#0c0c0e]/80 border border-white/5 rounded-2xl p-4 space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
              <User size={14} /> 1. Datos Personales y Foto
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} className="text-zinc-600" />
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 p-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl cursor-pointer shadow-lg transition active:scale-95">
                  <Camera size={14} />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>

              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-mono uppercase text-zinc-400">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={nombre} 
                    onChange={(e) => setNombre(e.target.value)} 
                    required
                    placeholder="Ej: Carlos Fuentes"
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500/50 outline-none font-mono" 
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-mono uppercase text-zinc-400">Celular Contacto (10 Dígitos)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 text-zinc-500" size={14} />
                    <input 
                      type="tel" 
                      value={telefono} 
                      onChange={handleTelefonoChange} 
                      required
                      maxLength={10}
                      placeholder="Ej: 3101234567"
                      className="w-full bg-[#121214] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-amber-500/50 outline-none font-mono" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Módulo 2: Configuración por Rol */}
          {(esVehicular || esDespachador) && (
            <div className="bg-[#0c0c0e]/80 border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
                {esVehicular ? <Bike size={14} /> : <Landmark size={14} />} 
                2. Configuración {esVehicular ? 'Operativa y Vehicular' : 'de Terminal/Central'}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {esVehicular && (
                  <>
                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-mono uppercase text-zinc-400">Placa Vehículo</label>
                      <input 
                        type="text" 
                        value={placa} 
                        onChange={(e) => setPlaca(e.target.value)} 
                        placeholder="Ej: ABC123D"
                        className="w-full bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500/50 outline-none font-mono uppercase" 
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-mono uppercase text-zinc-400">Número Interno</label>
                      <input 
                        type="text" 
                        value={numeroInterno} 
                        onChange={(e) => setNumeroInterno(e.target.value)} 
                        placeholder="Ej: 045"
                        className="w-full bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500/50 outline-none font-mono" 
                      />
                    </div>
                  </>
                )}
                
                <div className={`space-y-1 text-left ${esVehicular ? 'sm:col-span-2' : 'sm:col-span-2'}`}>
                  <label className="text-[9px] font-mono uppercase text-zinc-400">Empresa / Cooperativa / Terminal</label>
                  <input 
                    type="text" 
                    value={cooperativa} 
                    onChange={(e) => setCooperativa(e.target.value)} 
                    placeholder="Ej: Terminal La Jagua"
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500/50 outline-none font-mono" 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Módulo 3: Credenciales y Seguridad */}
          <div className="bg-[#0c0c0e]/80 border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
              <Lock size={14} /> {esVehicular || esDespachador ? '3' : '2'}. Credenciales y Acceso
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-mono uppercase text-zinc-400">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-zinc-500" size={14} />
                  <input 
                    type="email" 
                    value={correo} 
                    onChange={(e) => setCorreo(e.target.value)} 
                    required
                    placeholder="ejemplo@correo.com"
                    className="w-full bg-[#121214] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-amber-500/50 outline-none font-mono" 
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[9px] font-mono uppercase text-zinc-400">Nueva Clave (Opcional)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-zinc-500" size={14} />
                  <input 
                    type="password" 
                    value={clave} 
                    onChange={(e) => setClave(e.target.value)} 
                    placeholder="••••••••" 
                    className="w-full bg-[#121214] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-amber-500/50 outline-none font-mono" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleBackNavigation}
              className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white text-[10px] font-mono uppercase tracking-wider rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-black font-black text-[10px] font-mono uppercase tracking-wider rounded-xl transition shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}