// Versión Arquitectura: V9.5 - Rediseño UI Light Glassmorphism para Conductor Intermunicipal (CIMCO-UI V9.5)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\RegisterIntermunicipal.jsx
 * Misión: Registro de Flota y Conductores Intermunicipales con interfaz luminosa,
 * psicología de color enfocada en Legalidad Institucional (Azul Cobalto) y Conectividad (Índigo).
 * Integridad: Preserva la lógica de seguridad, mutación de importaciones absolutas (@/),
 * validaciones estricta de celular colombiano (10 dígitos en 3), límite de archivos 5MB
 * y llaves atómicas de Multipart (documento_cedula, documento_licencia, doc_tarjeta).
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/config/api';
import { ROLES, DEFAULT_ACCESS_LEVELS } from '@/config/constants';
import { 
  ShieldCheck, 
  Bus, 
  Route, 
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
  MapPin, 
  Ticket 
} from 'lucide-react';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const RegisterIntermunicipal = () => {
  const navigate = useNavigate();

  // 📡 SECCIÓN 1: IDENTIFICACIÓN DEL CONDUCTOR
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');

  // 🚌 SECCIÓN 2: INFORMACIÓN DE UNIDAD Y OPERACIÓN
  const [cooperativa, setCooperativa] = useState('');
  const [placa, setPlaca] = useState('');
  const [numeroInterno, setNumeroInterno] = useState('');

  // 🗺️ SECCIÓN 3: RUTAS Y AFILIACIÓN
  const [rutaOrigen, setRutaOrigen] = useState('');
  const [rutaDestino, setRutaDestino] = useState('');
  const [codigoAfiliacion, setCodigoAfiliacion] = useState('');

  // 📁 SECCIÓN 4: DOCUMENTACIÓN
  const [cedulaFile, setCedulaFile] = useState(null);
  const [licenciaFile, setLicenciaFile] = useState(null);
  const [tarjetaFile, setTarjetaFile] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateFile = (file, fileLabel) => {
    if (!file) return null;
    if (!ALLOWED_MIME_TYPES.includes(file?.type)) {
      return `El archivo "${fileLabel}" debe ser imagen (JPG, PNG, WEBP) o PDF.`;
    }
    if ((file?.size || 0) > MAX_FILE_SIZE_BYTES) {
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

    if (!nombre?.trim() || !celular?.trim() || !correo?.trim() || !clave?.trim() || !cooperativa?.trim() || !placa?.trim()) {
      setError("Por favor completa los campos requeridos marcados con asterisco (*).");
      return;
    }

    const phoneRegex = /^3\d{9}$/;
    if (!phoneRegex.test(celular.trim())) {
      setError("Ingresa un número de celular colombiano válido (10 dígitos arrancando en 3).");
      return;
    }

    if (!cedulaFile || !licenciaFile || !tarjetaFile) {
      setError("Es obligatorio adjuntar Cédula, Licencia de Conducción y Tarjeta de Propiedad.");
      return;
    }

    setLoading(true);

    try {
      const targetRole = ROLES?.CONDUCTOR_INTERMUNICIPAL || 'conductor_intermunicipal';
      const accessLevel = DEFAULT_ACCESS_LEVELS?.[targetRole] ?? 10;

      const payload = new FormData();
      payload.append('nombre', nombre.trim());
      payload.append('telefono', celular.trim());
      payload.append('email', correo.toLowerCase().trim());
      payload.append('password', clave);
      payload.append('cooperativa', cooperativa.trim());
      payload.append('placa', placa.toUpperCase().trim());
      payload.append('numero_interno', numeroInterno?.trim() || '');
      payload.append('ruta_origen', rutaOrigen?.trim() || '');
      payload.append('ruta_destino', rutaDestino?.trim() || '');
      payload.append('codigo_afiliacion', codigoAfiliacion?.trim() || '');
      payload.append('role', targetRole);
      payload.append('access_level', String(accessLevel));

      payload.append('documento_cedula', cedulaFile);
      payload.append('documento_licencia', licenciaFile);
      payload.append('doc_tarjeta', tarjetaFile);

      const res = await api.post('/api/auth/register', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res?.data?.success || res?.status === 200 || res?.status === 201) {
        navigate('/login');
      } else {
        setError(res?.data?.message || "No se pudo registrar la unidad intermunicipal en la central.");
      }
    } catch (err) {
      console.error("🚨 [CIMCO-INTERMUNICIPAL-AUTH] Error:", err);
      setError(err?.response?.data?.message || "Error al conectar con la central intercooperativa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-indigo-50/60 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Ambiente luminoso de fondo */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-6 sm:p-10 rounded-3xl shadow-2xl shadow-blue-950/10 relative z-10 transition-all duration-300 my-6">
        
        {/* Retorno */}
        <Link 
          to="/register" 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-mono text-xs font-bold uppercase tracking-wider transition-colors mb-6 text-decoration-none"
        > 
          <ArrowLeft size={16} /> Volver a Selección de Rol
        </Link>

        {/* Encabezado */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200/80 rounded-full mb-3">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-blue-800 uppercase font-black">
              Rutas Intermunicipales y Cooperativas
            </span>
          </div>
          <h2 className="text-slate-900 font-black text-2xl sm:text-3xl tracking-tight uppercase">
            Inscripción Conductor Intermunicipal
          </h2>
          <p className="text-slate-500 font-mono text-xs tracking-wide mt-1 uppercase font-semibold">
            Unidad de Gestión de Flota Regional e Intercooperativa
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-mono font-medium flex items-center gap-3 animate-in fade-in">
            <AlertTriangle size={16} className="shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECCIÓN 1: IDENTIFICACIÓN DEL CONDUCTOR */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="text-[10px] text-blue-900 uppercase tracking-widest font-mono font-extrabold border-b border-slate-200/80 pb-2 flex items-center gap-2">
              <ShieldCheck size={14} className="text-blue-600" />
              Sección 1: Identificación del Conductor
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
                    className="w-full bg-white border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all text-xs font-medium shadow-sm" 
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
                    className="w-full bg-white border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all text-xs font-mono shadow-sm" 
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
                    placeholder="carlos@ejemplo.com" 
                    className="w-full bg-white border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all text-xs font-mono shadow-sm" 
                    value={correo} 
                    onChange={(e) => setCorreo(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold">
                  Contraseña de Acceso *
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="password" 
                    minLength={6} 
                    placeholder="Mínimo 6 caracteres" 
                    className="w-full bg-white border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all text-xs shadow-sm" 
                    value={clave} 
                    onChange={(e) => setClave(e.target.value)} 
                    required 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: INFORMACIÓN DE UNIDAD Y OPERACIÓN */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="text-[10px] text-blue-900 uppercase tracking-widest font-mono font-extrabold border-b border-slate-200/80 pb-2 flex items-center gap-2">
              <Bus size={14} className="text-blue-600" />
              Sección 2: Información de Unidad y Operación
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold">
                  Empresa / Cooperativa *
                </label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Ej. COOTRANS" 
                    className="w-full bg-white border border-slate-200 pl-9 pr-3 py-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all text-xs font-mono uppercase font-bold shadow-sm" 
                    value={cooperativa} 
                    onChange={(e) => setCooperativa(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold text-blue-800">
                  Placa del Vehículo *
                </label>
                <input 
                  type="text" 
                  maxLength={6} 
                  placeholder="SDF456" 
                  className="w-full bg-white border border-slate-200 p-3 rounded-xl text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all text-xs font-mono uppercase font-black tracking-widest shadow-sm text-center" 
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
                    placeholder="Ej. 1024" 
                    className="w-full bg-white border border-slate-200 pl-9 pr-3 py-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all text-xs font-mono shadow-sm" 
                    value={numeroInterno} 
                    onChange={(e) => setNumeroInterno(e.target.value)} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: RUTAS Y AFILIACIÓN LOGÍSTICA */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="text-[10px] text-indigo-900 uppercase tracking-widest font-mono font-extrabold border-b border-indigo-200/80 pb-2 flex items-center gap-2">
              <Route size={14} className="text-indigo-600" />
              Sección 3: Rutas y Afiliación Logística
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold">
                  Ruta Origen Predeterminada
                </label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Ej. Valledupar" 
                    className="w-full bg-white border border-slate-200 pl-9 pr-3 py-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-xs font-medium shadow-sm" 
                    value={rutaOrigen} 
                    onChange={(e) => setRutaOrigen(e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold">
                  Ruta Destino Predeterminada
                </label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Ej. Barranquilla" 
                    className="w-full bg-white border border-slate-200 pl-9 pr-3 py-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-xs font-medium shadow-sm" 
                    value={rutaDestino} 
                    onChange={(e) => setRutaDestino(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold">
                Código de Afiliación / Planilla
              </label>
              <div className="relative">
                <Ticket size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Ej. AFL-8890" 
                  className="w-full bg-white border border-slate-200 pl-9 pr-3 py-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-xs font-mono uppercase shadow-sm" 
                  value={codigoAfiliacion} 
                  onChange={(e) => setCodigoAfiliacion(e.target.value)} 
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: DOCUMENTACIÓN OBLIGATORIA */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-[10px] text-blue-900 uppercase tracking-widest font-mono font-extrabold flex items-center gap-1.5">
                <FileText size={14} className="text-blue-600" />
                Documentación Legal de Transporte (Obligatoria)
              </span>
              <span className="text-[9px] font-mono font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                MÁX. {MAX_FILE_SIZE_MB} MB POR ARCHIVO
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Cédula */}
              <div className={`border-2 border-dashed p-4 rounded-xl flex flex-col items-center justify-center text-center relative transition-all cursor-pointer ${cedulaFile ? 'bg-emerald-50/80 border-emerald-400 text-emerald-800' : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'}`}>
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
              <div className={`border-2 border-dashed p-4 rounded-xl flex flex-col items-center justify-center text-center relative transition-all cursor-pointer ${licenciaFile ? 'bg-emerald-50/80 border-emerald-400 text-emerald-800' : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'}`}>
                {licenciaFile ? <CheckCircle2 size={20} className="text-emerald-600 mb-1" /> : <UploadCloud size={20} className="text-slate-400 mb-1" />}
                <span className="text-[10px] font-mono font-bold uppercase truncate max-w-full">
                  {licenciaFile ? licenciaFile.name : "Licencia Conducción"}
                </span>
                <span className="text-[8px] font-mono text-slate-400 mt-0.5">
                  {licenciaFile ? `${(licenciaFile.size / (1024 * 1024)).toFixed(2)} MB` : "(C1 / C2 / C3)"}
                </span>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,application/pdf" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => handleFileChange(e, setLicenciaFile, 'Licencia')} 
                />
              </div>

              {/* Tarjeta de Propiedad */}
              <div className={`border-2 border-dashed p-4 rounded-xl flex flex-col items-center justify-center text-center relative transition-all cursor-pointer ${tarjetaFile ? 'bg-emerald-50/80 border-emerald-400 text-emerald-800' : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'}`}>
                {tarjetaFile ? <CheckCircle2 size={20} className="text-emerald-600 mb-1" /> : <UploadCloud size={20} className="text-slate-400 mb-1" />}
                <span className="text-[10px] font-mono font-bold uppercase truncate max-w-full">
                  {tarjetaFile ? tarjetaFile.name : "Tarjeta Propiedad"}
                </span>
                <span className="text-[8px] font-mono text-slate-400 mt-0.5">
                  {tarjetaFile ? `${(tarjetaFile.size / (1024 * 1024)).toFixed(2)} MB` : "(Propiedad / Fuec)"}
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

          {/* Botón CTA - Azul Institucional / Fuerza */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-4 text-xs font-mono uppercase tracking-[0.25em] rounded-xl font-black text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-600/20 active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-wait cursor-pointer"
          >
            {loading ? "REGISTRANDO UNIDAD INTERMUNICIPAL..." : "FINALIZAR REGISTRO NODO"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/register" className="text-[10px] font-mono text-slate-500 hover:text-blue-600 uppercase tracking-widest transition-colors">
            ← Cancelar y Seleccionar Otro Perfil
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterIntermunicipal;