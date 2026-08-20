// Versión Arquitectura: V9.7 - Validación Explícita de Longitud de Contraseña en JS
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\RegisterMoto.jsx
 * Misión: Registro de Unidades Motorizadas con interfaz clara de alta legibilidad,
 * psicología de color enfocada en Confianza (Azul Cobalto) y Agilidad (Teal/Esmeralda),
 * preservando las llaves exactas de carga documental (doc_tarjeta) y las validaciones de negocio.
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/config/api';
import { ROLES, DEFAULT_ACCESS_LEVELS } from '@/config/constants';
import { 
  ShieldCheck, 
  Bike, 
  FileText, 
  ArrowLeft, 
  AlertTriangle, 
  UploadCloud, 
  CheckCircle2, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  Building2, 
  Hash, 
  ChevronDown 
} from 'lucide-react';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const RegisterMoto = () => {
  const navigate = useNavigate();

  // 📡 ESTADOS CORE
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');

  // 🏍️ SECCIÓN UNIDAD
  const [placa, setPlaca] = useState('');
  const [numeroInterno, setNumeroInterno] = useState('');
  const [cooperativa, setCooperativa] = useState('');
  const [tipoUnidad, setTipoUnidad] = useState('MOTOTAXI ESTÁNDAR');

  // 📁 DOCUMENTOS
  const [cedulaFile, setCedulaFile] = useState(null);
  const [licenciaFile, setLicenciaFile] = useState(null);
  const [tarjetaFile, setTarjetaFile] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateFile = (file, fileLabel) => {
    if (!file) return null;
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `El archivo "${fileLabel}" debe ser imagen (JPG, PNG, WEBP) o PDF.`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `El archivo "${fileLabel}" excede el límite de ${MAX_FILE_SIZE_MB}MB.`;
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

    if (!nombre?.trim() || !celular?.trim() || !correo?.trim() || !clave?.trim() || !placa?.trim()) {
      setError("Por favor completa los campos requeridos marcados con asterisco (*).");
      return;
    }

    if (clave.trim().length < 6) {
      setError("La contraseña debe contener al menos 6 caracteres.");
      return;
    }

    const phoneRegex = /^3\d{9}$/;
    if (!phoneRegex.test(celular.trim())) {
      setError("Ingresa un número de celular colombiano válido (10 dígitos arrancando en 3).");
      return;
    }

    if (!cedulaFile || !licenciaFile || !tarjetaFile) {
      setError("Es obligatorio adjuntar la Cédula, Licencia de Conducción y Tarjeta de Propiedad.");
      return;
    }

    setLoading(true);

    try {
      const targetRole = ROLES?.CONDUCTOR_MOTO || 'conductor_moto';
      const accessLevel = DEFAULT_ACCESS_LEVELS?.[targetRole] ?? 10;

      const payload = new FormData();
      payload.append('nombre', nombre.trim());
      payload.append('telefono', celular.trim());
      payload.append('email', correo.toLowerCase().trim());
      payload.append('password', clave);
      payload.append('placa', placa.toUpperCase().trim());
      payload.append('numero_interno', numeroInterno?.trim() || '');
      payload.append('cooperativa', cooperativa?.trim() || '');
      payload.append('tipo_unidad', tipoUnidad);
      payload.append('role', targetRole);
      payload.append('access_level', String(accessLevel));

      payload.append('documento_cedula', cedulaFile);
      payload.append('documento_licencia', licenciaFile);
      payload.append('doc_tarjeta', tarjetaFile);

      const res = await api.post('/auth/register', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res?.data?.success || res?.status === 200 || res?.status === 201) {
        navigate('/login');
      } else {
        setError(res?.data?.message || "No se pudo completar el registro en la central.");
      }
    } catch (err) {
      console.error("🚨 [CIMCO-MOTO-AUTH] Error:", err);
      setError(err?.response?.data?.message || "Error al conectar con la central de transporte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/60 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Elementos de luz ambiental de fondo */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-teal-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-6 sm:p-10 rounded-3xl shadow-2xl shadow-slate-300/50 relative z-10 transition-all duration-300 my-6">
        
        {/* Retorno */}
        <Link 
          to="/register" 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-mono text-xs font-bold uppercase tracking-wider transition-colors mb-6 text-decoration-none"
        > 
          <ArrowLeft size={16} /> Volver a Selección de Rol
        </Link>

        {/* Encabezado */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200/80 rounded-full mb-3">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-indigo-700 uppercase font-black">
              Conexión Directa • Escuadrón Móvil
            </span>
          </div>
          <h2 className="text-slate-900 font-black text-2xl sm:text-3xl tracking-tight uppercase">
            Registro Escuadrón Motorizado
          </h2>
          <p className="text-slate-500 font-mono text-xs tracking-wide mt-1 uppercase font-semibold">
            Módulo Mototaxi, Parrillero y Carga Logística
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-mono font-medium flex items-center gap-3 animate-in fade-in">
            <AlertTriangle size={16} className="shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECCIÓN 1: DATOS PERSONALES */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="text-[10px] text-indigo-900 uppercase tracking-widest font-mono font-extrabold border-b border-slate-200/80 pb-2 flex items-center gap-2">
              <ShieldCheck size={14} className="text-indigo-600" />
              Sección 1: Información de Conductor y Credenciales
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold">
                  Nombre Completo *
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Ej. Carlos Fuentes" 
                    className="w-full bg-white border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-xs font-medium shadow-sm" 
                    value={nombre} 
                    onChange={(e) => setNombre(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold">
                  Teléfono Celular *
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="tel" 
                    maxLength={10} 
                    placeholder="Ej. 3101234567" 
                    className="w-full bg-white border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-xs font-mono shadow-sm" 
                    value={celular} 
                    onChange={(e) => setCelular(e.target.value.replace(/\D/g, ''))} 
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold">
                  Correo Electrónico *
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="email" 
                    placeholder="usuario@dominio.com" 
                    className="w-full bg-white border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-xs font-mono shadow-sm" 
                    value={correo} 
                    onChange={(e) => setCorreo(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold">
                  Contraseña *
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="password" 
                    minLength={6} 
                    placeholder="Mínimo 6 caracteres" 
                    className="w-full bg-white border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-xs shadow-sm" 
                    value={clave} 
                    onChange={(e) => setClave(e.target.value)} 
                    required 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: INFORMACIÓN DE LA UNIDAD */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="text-[10px] text-indigo-900 uppercase tracking-widest font-mono font-extrabold border-b border-slate-200/80 pb-2 flex items-center gap-2">
              <Bike size={14} className="text-indigo-600" />
              Sección 2: Información de Unidad y Operación
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold text-indigo-700">
                  Placa del Vehículo *
                </label>
                <input 
                  type="text" 
                  maxLength={6} 
                  placeholder="Ej. XYZ123" 
                  className="w-full bg-white border border-slate-200 p-3 rounded-xl text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-xs font-mono uppercase font-black tracking-widest shadow-sm text-center" 
                  value={placa} 
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())} 
                  required 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold">
                  Número Interno
                </label>
                <div className="relative">
                  <Hash size={14} className="absolute left-3 top-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Ej. M-045" 
                    className="w-full bg-white border border-slate-200 pl-9 pr-3 py-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-xs font-mono shadow-sm" 
                    value={numeroInterno} 
                    onChange={(e) => setNumeroInterno(e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold">
                  Empresa / Cooperativa
                </label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Ej. Cooptrans" 
                    className="w-full bg-white border border-slate-200 pl-9 pr-3 py-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-xs font-mono uppercase shadow-sm" 
                    value={cooperativa} 
                    onChange={(e) => setCooperativa(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold">
                Tipo de Unidad Operativa
              </label>
              <div className="relative">
                <select 
                  value={tipoUnidad} 
                  onChange={(e) => setTipoUnidad(e.target.value)}
                  className="w-full bg-white border border-slate-200 p-3 rounded-xl text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none appearance-none transition-all text-xs font-mono font-bold shadow-sm cursor-pointer pr-10"
                >
                  <option value="MOTOTAXI ESTÁNDAR">MOTOTAXI ESTÁNDAR</option>
                  <option value="MOTOTAXI VIP / CASCO EXTRA">MOTOTAXI VIP / CASCO EXTRA</option>
                  <option value="MOTO CARGO / ENCOMIENDAS">MOTO CARGO / ENCOMIENDAS</option>
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: DOCUMENTACIÓN DIGITAL */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-[10px] text-indigo-900 uppercase tracking-widest font-mono font-extrabold flex items-center gap-1.5">
                <FileText size={14} className="text-indigo-600" />
                Sección 3: Documentación Operativa Obligatoria
              </span>
              <span className="text-[9px] font-mono font-bold bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full">
                MÁX. {MAX_FILE_SIZE_MB} MB POR ARCHIVO
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Cédula */}
              <div className={`border-2 border-dashed p-4 rounded-xl flex flex-col items-center justify-center text-center relative transition-all cursor-pointer ${cedulaFile ? 'bg-emerald-50/80 border-emerald-400 text-emerald-800' : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30'}`}>
                {cedulaFile ? <CheckCircle2 size={20} className="text-emerald-600 mb-1" /> : <UploadCloud size={20} className="text-slate-400 mb-1" />}
                <span className="text-[10px] font-mono font-bold uppercase truncate max-w-full">
                  {cedulaFile ? cedulaFile.name : "Cédula Ciudadanía"}
                </span>
                <span className="text-[8px] font-mono text-slate-400 mt-0.5">
                  {cedulaFile ? `${(cedulaFile.size / (1024 * 1024)).toFixed(2)} MB` : "(JPG, PNG, PDF)"}
                </span>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,application/pdf" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => handleFileChange(e, setCedulaFile, 'Cédula')} 
                />
              </div>

              {/* Licencia */}
              <div className={`border-2 border-dashed p-4 rounded-xl flex flex-col items-center justify-center text-center relative transition-all cursor-pointer ${licenciaFile ? 'bg-emerald-50/80 border-emerald-400 text-emerald-800' : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30'}`}>
                {licenciaFile ? <CheckCircle2 size={20} className="text-emerald-600 mb-1" /> : <UploadCloud size={20} className="text-slate-400 mb-1" />}
                <span className="text-[10px] font-mono font-bold uppercase truncate max-w-full">
                  {licenciaFile ? licenciaFile.name : "Licencia Conducción"}
                </span>
                <span className="text-[8px] font-mono text-slate-400 mt-0.5">
                  {licenciaFile ? `${(licenciaFile.size / (1024 * 1024)).toFixed(2)} MB` : "(A2 / B1)"}
                </span>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,application/pdf" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => handleFileChange(e, setLicenciaFile, 'Licencia')} 
                />
              </div>

              {/* Tarjeta de Propiedad */}
              <div className={`border-2 border-dashed p-4 rounded-xl flex flex-col items-center justify-center text-center relative transition-all cursor-pointer ${tarjetaFile ? 'bg-emerald-50/80 border-emerald-400 text-emerald-800' : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30'}`}>
                {tarjetaFile ? <CheckCircle2 size={20} className="text-emerald-600 mb-1" /> : <UploadCloud size={20} className="text-slate-400 mb-1" />}
                <span className="text-[10px] font-mono font-bold uppercase truncate max-w-full">
                  {tarjetaFile ? tarjetaFile.name : "Tarjeta Propiedad"}
                </span>
                <span className="text-[8px] font-mono text-slate-400 mt-0.5">
                  {tarjetaFile ? `${(tarjetaFile.size / (1024 * 1024)).toFixed(2)} MB` : "(Propiedad/SOAT)"}
                </span>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,application/pdf" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => handleFileChange(e, setTarjetaFile, 'Tarjeta de Propiedad')} 
                />
              </div>
            </div>
          </div>

          {/* Botón CTA - Agilidad Teal/Esmeralda */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-4 text-xs font-mono uppercase tracking-[0.25em] rounded-xl font-black text-white bg-gradient-to-r from-teal-500 via-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-700 shadow-xl shadow-teal-500/20 active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-wait cursor-pointer"
          >
            {loading ? "REGISTRANDO UNIDAD..." : "REGISTRAR UNIDAD VEHICULAR"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/register" className="text-[10px] font-mono text-slate-500 hover:text-indigo-600 uppercase tracking-widest transition-colors">
            ← Cambiar Perfil Operativo
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterMoto;