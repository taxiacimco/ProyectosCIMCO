// Versión Arquitectura: V9.6 - Corrección de Endpoint /auth/register para Evitar Duplicidad de Prefijo API
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\RegisterDespachador.jsx
 * Misión: Vinculación de Operadores y Despachadores de Terminal con interfaz clara,
 * psicología de color enfocada en Gobernanza de Central (Índigo) y Agilidad Operativa (Ámbar/Naranja).
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/config/api';
import { ROLES, DEFAULT_ACCESS_LEVELS } from '@/config/constants';
import { 
  Radio, 
  ShieldCheck, 
  Building2, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  Award, 
  FileText 
} from 'lucide-react';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const RegisterDespachador = () => {
  const navigate = useNavigate();

  // 📡 CAMPOS OPERATIVOS
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [celular, setCelular] = useState('');
  const [clave, setClave] = useState('');
  const [cooperativa, setCooperativa] = useState('');
  const [terminal, setTerminal] = useState('');

  // 📁 DOCUMENTACIÓN ADJUNTA
  const [fotoFile, setFotoFile] = useState(null);
  const [cedulaFile, setCedulaFile] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateFile = (file, fileLabel) => {
    if (!file) return null;
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `El archivo "${fileLabel}" debe ser una imagen (JPG, PNG, WEBP) o PDF.`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `El archivo "${fileLabel}" excede el límite permitido de ${MAX_FILE_SIZE_MB}MB.`;
    }
    return null;
  };

  const handleFileChange = (e, setFile, label) => {
    setError('');
    if (e?.target?.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validationError = validateFile(selectedFile, label);

      if (validationError) {
        setError(validationError);
        e.target.value = '';
        setFile(null);
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!nombre?.trim() || !correo?.trim() || !celular?.trim() || !clave?.trim() || !cooperativa?.trim() || !terminal?.trim()) {
      setError("Por favor completa todos los campos marcados como obligatorios (*).");
      return;
    }

    const phoneRegex = /^3\d{9}$/;
    if (!phoneRegex.test(celular.trim())) {
      setError("Ingresa un número de celular corporativo colombiano válido (10 dígitos arrancando en 3).");
      return;
    }

    if (!fotoFile || !cedulaFile) {
      setError("Es obligatorio adjuntar la Foto de Perfil/Carnet y el Documento de Identidad.");
      return;
    }

    setLoading(true);

    try {
      const targetRole = ROLES?.DESPACHADOR || 'despachador';
      const accessLevel = DEFAULT_ACCESS_LEVELS?.[targetRole] ?? 3;

      const payload = new FormData();
      payload.append('nombre', nombre.trim());
      payload.append('email', correo.toLowerCase().trim());
      payload.append('telefono', celular.trim());
      payload.append('password', clave);
      payload.append('cooperativa', cooperativa.trim());
      payload.append('terminal_sede', terminal.trim());
      payload.append('role', targetRole);
      payload.append('access_level', String(accessLevel));

      payload.append('foto_perfil', fotoFile);
      payload.append('documento_cedula', cedulaFile);

      const res = await api.post('/auth/register', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res?.data?.success || res?.status === 200 || res?.status === 201) {
        navigate('/login');
      } else {
        setError(res?.data?.message || "No se pudo vinculación la cuenta de despachador en la central.");
      }
    } catch (err) {
      console.error("🚨 [CIMCO-DESPACHADOR-AUTH] Error:", err);
      setError(err?.response?.data?.message || "Error al conectar con la central operativa CIMCO.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/40 to-amber-50/30 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Luces de fondo decorativas */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-6 sm:p-10 rounded-3xl shadow-2xl shadow-indigo-950/10 relative z-10 transition-all duration-300 my-6">
        
        {/* Barra Superior con Nivel de Acceso */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            to="/register" 
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 font-mono text-xs font-bold uppercase tracking-wider transition-colors text-decoration-none"
          > 
            <ArrowLeft size={16} /> Volver a Roles
          </Link>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200/80 rounded-full">
            <Award size={13} className="text-amber-600" />
            <span className="text-[10px] font-mono tracking-wider text-amber-800 uppercase font-black">
              Level 3 Access
            </span>
          </div>
        </div>

        {/* Encabezado */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-2 text-amber-600">
            <Radio size={28} className="animate-pulse" />
          </div>
          <h2 className="text-slate-900 font-black text-2xl sm:text-3xl tracking-tight uppercase">
            Registro Despachador
          </h2>
          <p className="text-slate-500 font-mono text-xs tracking-wide mt-1 font-semibold">
            Vincule la central operativa con la red de despacho intermunicipal y terminales de transporte.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-mono font-medium flex items-center gap-3 animate-in fade-in">
            <AlertTriangle size={16} className="shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Nombre Operador */}
          <div className="space-y-1.5">
            <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold block">
              Nombre Completo del Operador *
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Ej. Carlos Mario Fuentes" 
                className="w-full bg-slate-50/80 border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs font-medium shadow-sm" 
                value={nombre} 
                onChange={(e) => setNombre(e.target.value)} 
                required 
              />
            </div>
          </div>

          {/* Correo y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold block">
                Correo Institucional *
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input 
                  type="email" 
                  placeholder="despacho@empresa.com" 
                  className="w-full bg-slate-50/80 border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs font-mono shadow-sm" 
                  value={correo} 
                  onChange={(e) => setCorreo(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold block">
                Celular Corporativo (10 Dígitos) *
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input 
                  type="tel" 
                  maxLength={10} 
                  placeholder="3001234567" 
                  className="w-full bg-slate-50/80 border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs font-mono shadow-sm" 
                  value={celular} 
                  onChange={(e) => setCelular(e.target.value.replace(/\D/g, ''))} 
                  required 
                />
              </div>
            </div>
          </div>

          {/* Clave */}
          <div className="space-y-1.5">
            <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold block">
              Clave de Acceso a Central *
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input 
                type="password" 
                minLength={6} 
                placeholder="••••••••" 
                className="w-full bg-slate-50/80 border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs shadow-sm" 
                value={clave} 
                onChange={(e) => setClave(e.target.value)} 
                required 
              />
            </div>
          </div>

          {/* Empresa y Terminal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold block">
                Empresa / Cooperativa *
              </label>
              <div className="relative">
                <Building2 size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Ej. Cootragua / Taxia" 
                  className="w-full bg-slate-50/80 border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs font-medium shadow-sm" 
                  value={cooperativa} 
                  onChange={(e) => setCooperativa(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold block">
                Terminal / Sede Operativa *
              </label>
              <div className="relative">
                <MapPin size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Ej. Terminal Central La Jagua" 
                  className="w-full bg-slate-50/80 border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs font-medium shadow-sm" 
                  value={terminal} 
                  onChange={(e) => setTerminal(e.target.value)} 
                  required 
                />
              </div>
            </div>
          </div>

          {/* DOCUMENTACIÓN DIGITAL */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-sm pt-3">
            <span className="text-[10px] text-slate-700 uppercase tracking-widest font-mono font-extrabold flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
              <FileText size={14} className="text-amber-600" />
              Documentación Digital de Soporte
            </span>

            {/* Adjuntar Foto */}
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                  {fotoFile ? <CheckCircle2 size={18} className="text-emerald-600" /> : <UploadCloud size={18} />}
                </div>
                <div>
                  <p className="text-xs font-mono font-bold text-slate-800">
                    {fotoFile ? fotoFile.name : "Foto de Perfil / Carnet"}
                  </p>
                  <p className="text-[9px] font-mono text-slate-400">
                    JPG, PNG o WEBP (Máx 5MB)
                  </p>
                </div>
              </div>
              <label className="px-3 py-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-700 text-[10px] font-mono font-bold uppercase rounded-lg border border-slate-200 cursor-pointer transition-colors">
                {fotoFile ? "Cambiar" : "Adjuntar"}
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp" 
                  className="hidden" 
                  onChange={(e) => handleFileChange(e, setFotoFile, 'Foto de Perfil')} 
                />
              </label>
            </div>

            {/* Adjuntar Cédula */}
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                  {cedulaFile ? <CheckCircle2 size={18} className="text-emerald-600" /> : <UploadCloud size={18} />}
                </div>
                <div>
                  <p className="text-xs font-mono font-bold text-slate-800">
                    {cedulaFile ? cedulaFile.name : "Cédula / Documento de Identidad"}
                  </p>
                  <p className="text-[9px] font-mono text-slate-400">
                    PDF o Imagen (Máx 5MB)
                  </p>
                </div>
              </div>
              <label className="px-3 py-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-700 text-[10px] font-mono font-bold uppercase rounded-lg border border-slate-200 cursor-pointer transition-colors">
                {cedulaFile ? "Cambiar" : "Adjuntar"}
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,application/pdf" 
                  className="hidden" 
                  onChange={(e) => handleFileChange(e, setCedulaFile, 'Documento de Identidad')} 
                />
              </label>
            </div>
          </div>

          {/* Botón CTA - Naranja / Ámbar Operativo */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-4 text-xs font-mono uppercase tracking-[0.2em] rounded-xl font-black text-white bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 shadow-xl shadow-orange-500/20 active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-wait cursor-pointer mt-2"
          >
            {loading ? "VINCULANDO OPERADOR..." : "VINCULAR DESPACHADOR"}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 pt-4 border-t border-slate-200/60 text-center">
          <span className="text-[11px] text-slate-500 font-mono">¿Ya posee acreditación de central? </span>
          <Link to="/login" className="text-[11px] font-mono font-black text-amber-600 hover:text-amber-800 uppercase tracking-wide transition-colors">
            Ingresar
          </Link>
        </div>

      </div>
    </div>
  );
};

export default RegisterDespachador;