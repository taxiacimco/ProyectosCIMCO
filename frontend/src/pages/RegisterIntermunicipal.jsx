// Versión Arquitectura: V2.1 - Sincronización de Navegación de Retorno Directa al Selector (/register) y Blindaje de Datos
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\RegisterIntermunicipal.jsx
 * Misión: Registro de Operadores Intermunicipales con captura de Empresa/Cooperativa, Placa, Número Interno,
 *         sección de Rutas y Afiliación Logística, Carga Documental Digital (Cédula, Licencia, Tarjeta de Propiedad)
 *         con control estricto de límite de 5 MB por archivo, y sincronización explícita del botón de retorno hacia el selector central (/register).
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism (Indigo Accent).
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/config/api'; 
import { ROLES, DEFAULT_ACCESS_LEVELS } from '@/config/constants';
import { AlertTriangle, UploadCloud, FileText, CheckCircle2, Building2, Bus, MapPin, Route, Check, ArrowLeft } from 'lucide-react';

// Constantes de Validación Documental (Máx 5MB)
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const RegisterIntermunicipal = () => {
  const navigate = useNavigate();
  
  // 📡 ESTADOS DE IDENTIFICACIÓN Y OPERADOR
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');

  // 🚌 SECCIÓN 2: INFORMACIÓN DE UNIDAD Y OPERACIÓN
  const [cooperativa, setCooperativa] = useState('');
  const [placa, setPlaca] = useState('');
  const [numeroInterno, setNumeroInterno] = useState('');

  // 🗺️ SECCIÓN 3: RUTAS Y AFILIACIÓN LOGÍSTICA
  const [rutaOrigen, setRutaOrigen] = useState('');
  const [rutaDestino, setRutaDestino] = useState('');
  const [codigoAfiliacion, setCodigoAfiliacion] = useState('');

  // 📁 FILE STATES FOR VALIDATION (Terna documental obligatoria)
  const [cedulaFile, setCedulaFile] = useState(null);
  const [licenciaFile, setLicenciaFile] = useState(null);
  const [tarjetaFile, setTarjetaFile] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Helper de validación de archivos (Tamaño + Extensión/MIME Type)
  const validateFile = (file, fileLabel) => {
    if (!file) return null;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `El archivo "${fileLabel}" tiene un formato no permitido. Usa imágenes (.jpg, .png, .webp) o PDF.`;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `El archivo "${fileLabel}" excede el límite máximo permitido de ${MAX_FILE_SIZE_MB}MB.`;
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
        e.target.value = ''; // Resetear input
        setFile(null);
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 🛡️ Guardas de seguridad preventivas (Anti-Undefined / Blindaje de Variables)
    if (!nombre?.trim() || !celular?.trim() || !correo?.trim() || !clave?.trim() || !placa?.trim() || !cooperativa?.trim()) {
      setError("⚠️ Error de Validación: Todos los campos operacionales principales son obligatorios.");
      return;
    }

    if (!cedulaFile || !licenciaFile || !tarjetaFile) {
      setError("La carga de Cédula, Licencia y Tarjeta de Propiedad es de carácter obligatorio.");
      return;
    }

    // Re-validación estricta de archivos antes del envío
    const errCedula = validateFile(cedulaFile, 'Cédula');
    const errLicencia = validateFile(licenciaFile, 'Licencia');
    const errTarjeta = validateFile(tarjetaFile, 'Tarjeta de Propiedad');

    if (errCedula || errLicencia || errTarjeta) {
      setError(errCedula || errLicencia || errTarjeta);
      return;
    }

    setLoading(true);

    try {
      // Trazabilidad de Roles y Niveles de Acceso
      const targetRole = ROLES?.CONDUCTOR_INTERMUNICIPAL || 'conductor_intermunicipal';
      const accessLevel = DEFAULT_ACCESS_LEVELS?.[targetRole] ?? 20;

      // Fusión Atómica: Payload estandarizado y limpio hacia el Backend (Sin redundancias)
      const dataPayload = new FormData();
      dataPayload.append('nombre', nombre.trim());
      dataPayload.append('telefono', celular.trim());
      dataPayload.append('email', correo.toLowerCase().trim());
      dataPayload.append('password', clave);
      dataPayload.append('placa', placa.toUpperCase().trim());
      dataPayload.append('numero_interno', numeroInterno?.trim() || '');
      dataPayload.append('empresa', cooperativa.trim());
      dataPayload.append('cooperativa', cooperativa.trim());
      dataPayload.append('ruta_origen', rutaOrigen?.trim() || '');
      dataPayload.append('ruta_destino', rutaDestino?.trim() || '');
      dataPayload.append('codigo_afiliacion', codigoAfiliacion?.trim() || '');
      dataPayload.append('role', targetRole); 
      dataPayload.append('access_level', String(accessLevel));

      // Inyección unificada de ficheros limpios
      dataPayload.append('doc_cedula', cedulaFile);
      dataPayload.append('doc_licencia', licenciaFile);
      dataPayload.append('doc_tarjeta', tarjetaFile);

      const res = await api.post('/api/auth/register', dataPayload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res?.data?.success || res?.status === 200 || res?.status === 201) {
        navigate('/login');
      } else {
        setError(res?.data?.message || "Rechazo del nodo central al procesar la solicitud.");
      }
    } catch (err) {
      console.error("🚨 [CIMCO-INTER-AUTH] Error instrumental crítico:", err);
      setError(err?.response?.data?.message || "Falla en la sincronización del bus de datos intermunicipal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] flex items-center justify-center p-4 font-sans selection:bg-indigo-500/30 relative overflow-hidden">
      {/* Fondo estético CIMCO-UI de gradiente de profundidad */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-black to-black z-0" />

      {/* Contenedor Glassmorphism CIMCO-UI */}
      <div className="w-full max-w-2xl backdrop-blur-md bg-[#121214]/80 border border-white/5 p-6 sm:p-8 rounded-3xl shadow-2xl shadow-black/60 relative z-10 transition-all duration-500 my-8">
        
        {/* Botón de Retorno Explícito a Selección de Rol */}
        <Link 
            to="/register" 
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white font-mono text-xs uppercase tracking-wider transition-colors mb-6 text-decoration-none"
        > 
            <ArrowLeft size={16} /> Volver a Selección de Rol
        </Link>

        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/[0.08] border border-indigo-500/20 rounded-full mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-[9px] font-mono tracking-[0.2em] text-indigo-400 uppercase font-black">Rutas Intermunicipales y Cooperativas</span>
          </div>
          <h2 className="text-white font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 uppercase">Inscripción Conductor Intermunicipal</h2>
          <p className="text-zinc-500 font-mono text-[10px] tracking-[0.1em] mt-1 uppercase font-bold">Unidad de Gestión de Flota Regional e Intercooperativa</p>
        </div>

        {error && (
          <div className="mb-6 text-red-400 bg-red-950/30 p-4 rounded-xl border border-red-500/20 text-[10px] font-mono uppercase tracking-widest font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle size={12} className="shrink-0" />
            <span>SYSTEM_ALERT: {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECCIÓN 1: OPERADOR Y CREDENCIALES */}
          <div className="bg-[#18181b]/40 border border-white/5 rounded-2xl p-4 space-y-4">
            <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono font-bold border-b border-white/5 pb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              Sección 1: Información Personal y Credenciales
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-mono text-[9px] uppercase tracking-wider font-bold ml-1">Nombre Completo del Conductor</label>
                <input 
                  type="text" 
                  placeholder="Ej. Carlos Fuentes" 
                  className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-white focus:border-indigo-500/50 focus:bg-[#16161f] outline-none transition-all text-xs font-mono" 
                  value={nombre} 
                  onChange={(e) => setNombre(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-400 font-mono text-[9px] uppercase tracking-wider font-bold ml-1">Línea Celular</label>
                <input 
                  type="tel" 
                  placeholder="3000000000" 
                  maxLength="10" 
                  className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-white focus:border-indigo-500/50 focus:bg-[#16161f] outline-none transition-all text-xs font-mono" 
                  value={celular} 
                  onChange={(e) => setCelular(e.target.value.replace(/\D/g, ''))} 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-mono text-[9px] uppercase tracking-wider font-bold ml-1">Correo Electrónico de Operaciones</label>
                <input 
                  type="email" 
                  placeholder="ruta@cooperativa.com" 
                  className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-white focus:border-indigo-500/50 focus:bg-[#16161f] outline-none transition-all text-xs font-mono" 
                  value={correo} 
                  onChange={(e) => setCorreo(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-400 font-mono text-[9px] uppercase tracking-wider font-bold ml-1">Contraseña de Acceso</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-white focus:border-indigo-500/50 focus:bg-[#16161f] outline-none transition-all text-xs tracking-widest" 
                  value={clave} 
                  onChange={(e) => setClave(e.target.value)} 
                  required 
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: INFORMACIÓN DE UNIDAD Y OPERACIÓN */}
          <div className="bg-[#18181b]/40 border border-white/5 rounded-2xl p-4 space-y-4">
            <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono font-bold border-b border-white/5 pb-2 flex items-center gap-2">
              <Bus size={12} className="text-indigo-400" />
              Sección 2: Información de Unidad y Operación
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-mono text-[9px] uppercase tracking-wider font-bold ml-1">Empresa / Cooperativa</label>
                <div className="relative">
                  <Building2 size={13} className="absolute left-3 top-3.5 text-zinc-600" />
                  <input 
                    type="text" 
                    placeholder="Ej. Cootrans" 
                    className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 pl-9 rounded-xl text-white focus:border-indigo-500/50 focus:bg-[#16161f] outline-none transition-all text-xs font-mono uppercase" 
                    value={cooperativa} 
                    onChange={(e) => setCooperativa(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-400 font-mono text-[9px] uppercase tracking-wider font-bold ml-1 text-indigo-400">Placa del Vehículo</label>
                <input 
                  type="text" 
                  placeholder="SDF456" 
                  maxLength="6" 
                  className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-white focus:border-indigo-500/50 focus:bg-[#16161f] outline-none transition-all text-xs font-mono uppercase" 
                  value={placa} 
                  onChange={(e) => setPlaca(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-400 font-mono text-[9px] uppercase tracking-wider font-bold ml-1 text-indigo-400">Número Interno Vial</label>
                <input 
                  type="text" 
                  placeholder="Ej. INT-40" 
                  className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-white focus:border-indigo-500/50 focus:bg-[#16161f] outline-none transition-all text-xs font-mono" 
                  value={numeroInterno} 
                  onChange={(e) => setNumeroInterno(e.target.value)} 
                  required 
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: RUTAS Y AFILIACIÓN LOGÍSTICA */}
          <div className="bg-[#18181b]/40 border border-white/5 rounded-2xl p-4 space-y-4">
            <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono font-bold border-b border-white/5 pb-2 flex items-center gap-2">
              <Route size={12} className="text-indigo-400" />
              Sección 3: Rutas y Afiliación Logística
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-mono text-[9px] uppercase tracking-wider font-bold ml-1">Municipio Origen / Base</label>
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-3.5 text-zinc-600" />
                  <input 
                    type="text" 
                    placeholder="Ej. Valledupar" 
                    className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 pl-9 rounded-xl text-white focus:border-indigo-500/50 focus:bg-[#16161f] outline-none transition-all text-xs font-mono" 
                    value={rutaOrigen} 
                    onChange={(e) => setRutaOrigen(e.target.value)} 
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-400 font-mono text-[9px] uppercase tracking-wider font-bold ml-1">Municipio Destino Principal</label>
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-3.5 text-zinc-600" />
                  <input 
                    type="text" 
                    placeholder="Ej. La Jagua de Ibirico" 
                    className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 pl-9 rounded-xl text-white focus:border-indigo-500/50 focus:bg-[#16161f] outline-none transition-all text-xs font-mono" 
                    value={rutaDestino} 
                    onChange={(e) => setRutaDestino(e.target.value)} 
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-400 font-mono text-[9px] uppercase tracking-wider font-bold ml-1">Código de Afiliación / Planilla</label>
                <input 
                  type="text" 
                  placeholder="Ej. AFL-8890" 
                  className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-white focus:border-indigo-500/50 focus:bg-[#16161f] outline-none transition-all text-xs font-mono uppercase" 
                  value={codigoAfiliacion} 
                  onChange={(e) => setCodigoAfiliacion(e.target.value)} 
                />
              </div>
            </div>
          </div>

          {/* 📂 SECCIÓN DE CARGA DOCUMENTAL DIGITAL */}
          <div className="bg-[#18181b]/40 border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <label className="text-zinc-400 font-mono text-[10px] uppercase tracking-widest font-black flex items-center gap-1.5">
                <FileText size={12} className="text-indigo-400" /> Documentación Legal de Transporte (Obligatoria)
              </label>
              
              {/* 💡 INDICADOR DESTACADO DE LÍMITE DE TAMAÑO */}
              <span className="text-[9px] font-mono font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-md uppercase">
                Máx. {MAX_FILE_SIZE_MB} MB por archivo
              </span>
            </div>

            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wide">
              Formatos admitidos: JPG, PNG, WEBP, PDF • Tamaño máximo permitido: <strong className="text-indigo-400">5 MB</strong>
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Cédula */}
              <div className={`border p-4 rounded-xl flex flex-col items-center justify-center text-center relative group transition-colors cursor-pointer ${cedulaFile ? 'bg-indigo-950/20 border-indigo-500/40' : 'bg-black/40 border-white/5 hover:border-indigo-500/20'}`}>
                {cedulaFile ? <Check size={18} className="text-indigo-400" /> : <UploadCloud size={18} className="text-zinc-500" />}
                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-tight mt-1.5 truncate max-w-full">
                  {cedulaFile ? cedulaFile.name : "Cédula Ciudadanía"}
                </span>
                <span className="text-[8px] text-zinc-500 font-mono mt-0.5">{cedulaFile ? `${(cedulaFile.size / (1024 * 1024)).toFixed(2)} MB` : "(Máx 5MB)"}</span>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,application/pdf" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => handleFileChange(e, setCedulaFile, 'Cédula')} 
                />
              </div>

              {/* Licencia */}
              <div className={`border p-4 rounded-xl flex flex-col items-center justify-center text-center relative group transition-colors cursor-pointer ${licenciaFile ? 'bg-indigo-950/20 border-indigo-500/40' : 'bg-black/40 border-white/5 hover:border-indigo-500/20'}`}>
                {licenciaFile ? <Check size={18} className="text-indigo-400" /> : <CheckCircle2 size={18} className="text-zinc-500" />}
                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-tight mt-1.5 truncate max-w-full">
                  {licenciaFile ? licenciaFile.name : "Licencia C2/C3"}
                </span>
                <span className="text-[8px] text-zinc-500 font-mono mt-0.5">{licenciaFile ? `${(licenciaFile.size / (1024 * 1024)).toFixed(2)} MB` : "(Máx 5MB)"}</span>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,application/pdf" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => handleFileChange(e, setLicenciaFile, 'Licencia')} 
                />
              </div>

              {/* Tarjeta de Propiedad */}
              <div className={`border p-4 rounded-xl flex flex-col items-center justify-center text-center relative group transition-colors cursor-pointer ${tarjetaFile ? 'bg-indigo-950/20 border-indigo-500/40' : 'bg-black/40 border-white/5 hover:border-indigo-500/20'}`}>
                {tarjetaFile ? <Check size={18} className="text-indigo-400" /> : <FileText size={18} className="text-zinc-500" />}
                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-tight mt-1.5 truncate max-w-full">
                  {tarjetaFile ? tarjetaFile.name : "Tarjeta Propiedad"}
                </span>
                <span className="text-[8px] text-zinc-500 font-mono mt-0.5">{tarjetaFile ? `${(tarjetaFile.size / (1024 * 1024)).toFixed(2)} MB` : "(Máx 5MB)"}</span>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,application/pdf" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => handleFileChange(e, setTarjetaFile, 'Tarjeta de Propiedad')} 
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-4 text-[10px] font-mono uppercase tracking-[0.4em] rounded-xl font-black bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-wait"
          >
            {loading ? "PROCESANDO_DATA..." : "FINALIZAR_REGISTRO_NODO"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/register" className="text-[9px] font-mono text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-colors duration-300">
            ← Abortar al Hub Principal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterIntermunicipal;