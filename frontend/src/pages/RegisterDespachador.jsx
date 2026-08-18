// Versión Arquitectura: V2.0 - Alineación Estricta de Claves Binary/Multipart Multer y Gobernanza Level 3
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\RegisterDespachador.jsx
 * Misión: Registro de Despachadores con validación de Empresa Matriz, Terminal / Sede, Sección de Asignación de Sede Operativa,
 * refuerzo estricto de campos de contacto obligatorios (Teléfono Celular Colombiano y Correo Electrónico),
 * Alineación de llaves binarias/multipart con la especificación exacta del middleware Multer (doc_identificacion, foto_perfil)
 * y sincronización explícita de navegación de retorno a la selección de rol central (/register).
 * Regla de Negocio: Recibe solicitudes de Pasajeros y gestiona despachos hacia Intermunicipales (Gobernanza Access Level 3).
 * Estilo: CIMCO-UI V9.3 Glassmorphism (Amber Theme).
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/config/api'; 
import { ROLES, DEFAULT_ACCESS_LEVELS } from '@/config/constants';
import { Building2, MapPin, AlertTriangle, UploadCloud, FileText, CheckCircle2, ShieldCheck, UserCheck, ArrowLeft } from 'lucide-react';

// Constantes de Validación Documental Preventiva (Máx 5MB)
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const PHONE_REGEX = /^(3\d{9})$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RegisterDespachador = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    password: '',
    empresa: '',
    terminal_sede: ''
  });

  const [docIdentidadFile, setDocIdentidadFile] = useState(null);
  const [fotoPerfilFile, setFotoPerfilFile] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
  };

  const handleFileChange = (e, setFileState, labelDoc) => {
    const selectedFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    
    if (!selectedFile) {
      setFileState(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError(`⚠️ El archivo de ${labelDoc} supera el límite de ${MAX_FILE_SIZE_MB}MB.`);
      e.target.value = '';
      setFileState(null);
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
      setError(`⚠️ Formato no permitido para ${labelDoc}. Solo JPG, PNG, WEBP o PDF.`);
      e.target.value = '';
      setFileState(null);
      return;
    }

    setError(null);
    setFileState(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 🛡️ Guardas de Seguridad Anti-Undefined y Sanitización
    const nombreClean = (formData.nombre || '').trim();
    const emailClean = (formData.email || '').trim().toLowerCase();
    const telefonoClean = (formData.telefono || '').trim().replace(/\D/g, '');
    const passwordClean = formData.password || '';
    const empresaClean = (formData.empresa || '').trim();
    const terminalClean = (formData.terminal_sede || '').trim();

    if (!nombreClean || !emailClean || !telefonoClean || !passwordClean || !empresaClean || !terminalClean) {
      setError("⚠️ Todos los campos operativos marcados con asterisco son estrictamente obligatorios.");
      setLoading(false);
      return;
    }

    if (!EMAIL_REGEX.test(emailClean)) {
      setError("⚠️ Estructura de correo electrónico inválida.");
      setLoading(false);
      return;
    }

    if (!PHONE_REGEX.test(telefonoClean)) {
      setError("⚠️ El teléfono debe ser un número celular colombiano válido de 10 dígitos (iniciando en 3).");
      setLoading(false);
      return;
    }

    if (passwordClean.length < 6) {
      setError("⚠️ La contraseña debe contener un mínimo de 6 caracteres.");
      setLoading(false);
      return;
    }

    try {
      const payloadData = new FormData();
      payloadData.append('nombre', nombreClean);
      payloadData.append('email', emailClean);
      payloadData.append('telefono', telefonoClean);
      payloadData.append('telefonoMovil', telefonoClean);
      payloadData.append('password', passwordClean);
      payloadData.append('rol', ROLES?.DESPACHADOR || 'despachador');
      payloadData.append('empresa', empresaClean);
      payloadData.append('cooperativa', empresaClean);
      payloadData.append('terminal_sede', terminalClean);
      payloadData.append('access_level', DEFAULT_ACCESS_LEVELS?.DESPACHADOR || 3);

      // 🎯 ALINEACIÓN CON MULTER BACKEND
      if (docIdentidadFile) {
        payloadData.append('doc_identificacion', docIdentidadFile);
      }
      if (fotoPerfilFile) {
        payloadData.append('foto_perfil', fotoPerfilFile);
      }

      const response = await api.post('/auth/register', payloadData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response && response.data && (response.data.success || response.data.user || response.data.token)) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login', { 
            state: { message: '✅ Registro de Despachador exitoso. Inicie sesión para acceder a la central.' } 
          });
        }, 2000);
      } else {
        throw new Error((response && response.data && response.data.message) || "Error al registrar nodo despachador.");
      }

    } catch (err) {
      console.error("🚨 [DESPACHADOR-REGISTER-ERROR]:", err);
      const apiMessage = err?.response?.data?.message || err?.message || "Ocurrió un error inesperado al procesar la vinculación.";
      setError(apiMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Luces Ambientales de Fondo */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-xl bg-[#121214]/80 backdrop-blur-md border border-white/5 rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10">
        
        {/* Cabecera de Navegación y Título */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
          <Link 
            to="/register" 
            className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-amber-400 transition-colors uppercase tracking-wider group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>Volver a Roles</span>
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-widest">
            <ShieldCheck size={12} /> Level 3 Access
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <UserCheck className="text-amber-500" size={28} />
            Registro Despachador
          </h1>
          <p className="text-xs text-slate-400 mt-2 font-mono">
            Vincule la central operativa con la red de despacho intermunicipal y terminales de transporte.
          </p>
        </div>

        {/* Notificaciones de Estado */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-start gap-3">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-3">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>¡Sede operativamente vinculada! Redirigiendo a la pantalla de entrada...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Nombre Completo */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2">
              Nombre Completo del Operador *
            </label>
            <input 
              type="text" 
              name="nombre"
              value={formData.nombre} 
              onChange={handleInputChange} 
              placeholder="Ej: Carlos Mario Fuentes" 
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-sans"
              required 
            />
          </div>

          {/* Email y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2">
                Correo Institucional *
              </label>
              <input 
                type="email" 
                name="email"
                value={formData.email} 
                onChange={handleInputChange} 
                placeholder="despacho@empresa.com" 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-sans"
                required 
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2">
                Celular Corporativo (10 dígitos) *
              </label>
              <input 
                type="tel" 
                name="telefono"
                value={formData.telefono} 
                onChange={handleInputChange} 
                placeholder="3001234567" 
                maxLength={10}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-mono"
                required 
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2">
              Clave de Acceso a Central *
            </label>
            <input 
              type="password" 
              name="password"
              value={formData.password} 
              onChange={handleInputChange} 
              placeholder="••••••••" 
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-sans"
              required 
            />
          </div>

          {/* Empresa Matriz y Terminal / Sede */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Building2 size={12} className="text-amber-500" /> Empresa / Cooperativa *
              </label>
              <input 
                type="text" 
                name="empresa"
                value={formData.empresa} 
                onChange={handleInputChange} 
                placeholder="Ej: Cootragua / Taxia" 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-sans"
                required 
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <MapPin size={12} className="text-amber-500" /> Terminal / Sede Operativa *
              </label>
              <input 
                type="text" 
                name="terminal_sede"
                value={formData.terminal_sede} 
                onChange={handleInputChange} 
                placeholder="Ej: Terminal Central La Jagua" 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-sans"
                required 
              />
            </div>
          </div>

          {/* Carga Documental Adjunta (Opcional pero preparada para Multipart) */}
          <div className="pt-4 border-t border-white/5 space-y-4">
            <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider">
              Documentación Digital de Soporte
            </h3>

            {/* Foto de Perfil / Carnet Operativo */}
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center justify-between relative overflow-hidden group hover:border-amber-500/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                  <UploadCloud size={18} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-200">Foto de Perfil / Carnet</p>
                  <p className="text-[10px] font-mono text-slate-500">JPG, PNG o WEBP (Máx 5MB)</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                {fotoPerfilFile ? fotoPerfilFile.name : 'Adjuntar'}
              </span>
              <input 
                type="file" 
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFileChange(e, setFotoPerfilFile, 'Foto de Perfil')}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            {/* Documento de Identificación */}
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center justify-between relative overflow-hidden group hover:border-amber-500/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-200">Cédula / Documento de Identidad</p>
                  <p className="text-[10px] font-mono text-slate-500">PDF o Imagen (Máx 5MB)</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                {docIdentidadFile ? docIdentidadFile.name : 'Adjuntar'}
              </span>
              <input 
                type="file" 
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => handleFileChange(e, setDocIdentidadFile, 'Documento de Identificación')}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Botón de Envió Submit */}
          <button 
            type="submit" 
            disabled={loading || success} 
            className="w-full mt-6 py-4 text-xs font-mono uppercase tracking-[0.25em] rounded-xl font-bold bg-amber-600 text-white hover:bg-amber-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(217,119,6,0.2)]"
          >
            {loading ? "VINCULANDO_NODO..." : "VINCULAR DESPACHADOR"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-[10px] font-mono text-slate-500 hover:text-amber-400 uppercase tracking-widest transition-colors">
            ¿Ya posee acreditación de central? <span className="text-amber-500 font-bold underline ml-1">Ingresar</span>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default RegisterDespachador;