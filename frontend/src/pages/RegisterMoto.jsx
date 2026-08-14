// Versión Arquitectura: V2.4 - Registro Escuadrón Moto con Retorno Explícito a Selección de Rol y Blindaje Multipart 5MB
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\RegisterMoto.jsx
 * Misión: Registro del Escuadrón Moto con sección de información de unidad/operación (Placa, Número Interno, Empresa/Cooperativa, Tipo de Unidad)
 *         y sección de ajustes de unidad con carga documental digital (Cédula, Licencia, Tarjeta de Propiedad) validando el límite de 5 MB por archivo,
 *         soporte de navegación de retorno a /register y gestión atómica de multipart/form-data.
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism (Teal Accent).
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import api from '@/config/api'; 
import { ROLES, DEFAULT_ACCESS_LEVELS } from '@/config/constants';
import { ShieldCheck, FileText, Camera, UploadCloud, AlertTriangle, Building2, Truck, Check, ArrowLeft } from 'lucide-react';

// 🛡️ CONSTANTES DE VALIDACIÓN DOCUMENTAL (MÁX 5MB)
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const RegisterMoto = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams ? searchParams.get('role') : null;
  const cooperativaParam = searchParams ? searchParams.get('cooperativa') || searchParams.get('empresa') : '';

  // 📡 ESTADOS CORE E INYECCIÓN DE SUB-ROL Y EMPRESA DESDE QR
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [tipoMoto, setTipoMoto] = useState(ROLES?.MOTOTAXI || 'mototaxi');
  const [placa, setPlaca] = useState('');
  const [numeroInterno, setNumeroInterno] = useState('');
  const [empresa, setEmpresa] = useState(cooperativaParam || '');

  // 📁 ESTADOS DE DOCUMENTOS LEGALES DE TRANSPORTE Y PREVIEWS
  const [docCedula, setDocCedula] = useState(null);
  const [docLicencia, setDocLicencia] = useState(null);
  const [docTarjetaPropiedad, setDocTarjetaPropiedad] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔄 SINCRONIZACIÓN QR CON FALLBACK ROBUSTO
  useEffect(() => {
    const defaultRole = ROLES?.MOTOTAXI || 'mototaxi';

    if (roleParam) {
      const normalizedRole = String(roleParam).toLowerCase().trim();
      const mototaxiRole = String(ROLES?.MOTOTAXI || 'mototaxi').toLowerCase();
      const parrilleroRole = String(ROLES?.MOTOPARRILLERO || 'motoparrillero').toLowerCase();
      const cargaRole = String(ROLES?.MOTOCARGA || 'motocarga').toLowerCase();

      // Mapeo seguro con fallback
      if (normalizedRole === mototaxiRole || normalizedRole === 'moto') {
        setTipoMoto(ROLES?.MOTOTAXI || 'mototaxi');
      } else if (normalizedRole === parrilleroRole) {
        setTipoMoto(ROLES?.MOTOPARRILLERO || 'motoparrillero');
      } else if (normalizedRole === cargaRole) {
        setTipoMoto(ROLES?.MOTOCARGA || 'motocarga');
      } else {
        setTipoMoto(defaultRole);
      }
    } else {
      setTipoMoto(defaultRole);
    }

    if (cooperativaParam) {
      setEmpresa(cooperativaParam);
    }
  }, [roleParam, cooperativaParam]);

  // 🔍 HELPER DE VALIDACIÓN DE ARCHIVOS (Tamaño + Formato MIME)
  const validateFile = (file, fileLabel) => {
    if (!file) return null;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `El archivo "${fileLabel}" tiene un formato no válido. Se permiten imágenes (.jpg, .png, .webp) o PDF.`;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `⚠️ El archivo "${fileLabel}" excede el límite permitido de ${MAX_FILE_SIZE_MB} MB.`;
    }

    return null;
  };

  const handleFileChange = (e, setFile, fileLabel) => {
    setError('');
    if (e?.target?.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validationError = validateFile(selectedFile, fileLabel);

      if (validationError) {
        setError(validationError);
        e.target.value = ''; // Resetear el input file
        setFile(null);
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 🛡️ GUARDAS DE SEGURIDAD OPERATIVA
    if (!nombre?.trim() || !celular?.trim() || !correo?.trim() || !clave?.trim() || !placa?.trim()) {
      setError("Faltan variables operacionales críticas.");
      return;
    }

    if (!docCedula || !docLicencia || !docTarjetaPropiedad) {
      setError("Falta documentación obligatoria: Cédula, Licencia y Tarjeta de Propiedad.");
      return;
    }

    // 🔬 RE-VALIDACIÓN PREVENTIVA DE ARCHIVOS
    const errCedula = validateFile(docCedula, 'Cédula');
    const errLicencia = validateFile(docLicencia, 'Licencia');
    const errTarjeta = validateFile(docTarjetaPropiedad, 'Tarjeta de Propiedad');

    if (errCedula || errLicencia || errTarjeta) {
      setError(errCedula || errLicencia || errTarjeta);
      return;
    }

    setLoading(true);

    try {
      const selectedRole = tipoMoto || 'mototaxi';
      const accessLevel = DEFAULT_ACCESS_LEVELS?.[selectedRole] ?? 1;

      // Compilación del FormData binario para transporte seguro multipart hacia el backend
      const payloadData = new FormData();
      payloadData.append('nombre', nombre.trim());
      payloadData.append('telefono', celular.trim());
      payloadData.append('email', correo.toLowerCase().trim());
      payloadData.append('password', clave);
      payloadData.append('placa', placa.toUpperCase().trim());
      payloadData.append('numero_interno', numeroInterno?.trim() || '');
      payloadData.append('empresa', empresa?.trim() || '');
      payloadData.append('cooperativa', empresa?.trim() || '');
      payloadData.append('tipo_unidad', selectedRole);
      payloadData.append('role', selectedRole); 
      payloadData.append('rol', selectedRole);  
      payloadData.append('access_level', String(accessLevel));

      // Inyección de ficheros para auditoría legal
      payloadData.append('documento_cedula', docCedula);
      payloadData.append('documento_licencia', docLicencia);
      payloadData.append('documento_tarjeta', docTarjetaPropiedad);

      const respuesta = await api.post('/api/auth/register', payloadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (respuesta?.data?.success || respuesta?.status === 200 || respuesta?.status === 201) {
        navigate('/login');
      } else {
        setError(respuesta?.data?.message || "Error al sincronizar con el Nodo Central.");
      }
    } catch (err) {
      console.error("🚨 [CIMCO-MOTO-AUTH] Falla crítica de registro:", err);
      setError(err?.response?.data?.message || "Fallo en el registro del nodo de escuadrón motorizado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] flex items-center justify-center p-4 transition-colors duration-500 font-sans selection:bg-teal-500/30 selection:text-teal-200 relative overflow-hidden">
      {/* FONDO ESTÉTICO CIMCO-UI HOMOLOGADO */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-black to-black z-0" />

      <div className="w-full max-w-2xl backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_-12px_rgba(20,184,166,0.15)] relative z-10 my-8">
        
        {/* Botón de Retorno Explícito a Selección de Rol */}
        <Link 
            to="/register" 
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white font-mono text-xs uppercase tracking-wider transition-colors mb-6 text-decoration-none"
        > 
            <ArrowLeft size={16} /> Volver a Selección de Rol
        </Link>

        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-1.5 bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full text-[9px] font-mono tracking-widest text-teal-400 uppercase font-bold mb-3">
            <ShieldCheck size={10} /> Conexión Directa Escuadrón Móvil
          </div>
          <h2 className="text-white font-black text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 uppercase">Registro Escuadrón Motorizado</h2>
          <p className="text-zinc-500 font-mono text-[10px] tracking-wide mt-1 uppercase font-semibold">Módulo: Mototaxi, Parrillero y Carga Logística</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-950/30 border border-red-500/20 rounded-xl p-3.5 flex items-center gap-2 text-red-400 text-[10px] font-mono uppercase tracking-widest font-bold animate-in fade-in slide-in-from-top-2">
            <AlertTriangle size={12} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* SECCIÓN 1: DATOS PERSONALES DEL OPERADOR */}
          <div className="bg-[#18181b]/40 border border-white/5 rounded-2xl p-4 space-y-4">
            <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono font-bold border-b border-white/5 pb-2 flex items-center gap-2">
              <ShieldCheck size={12} className="text-teal-400" />
              Sección 1: Información de Conductor y Credenciales
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold pl-1">Nombre Completo</label>
                <input type="text" placeholder="Ej. Carlos Fuentes" className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-zinc-100 focus:border-teal-500/40 focus:bg-[#16161f] outline-none transition-all text-xs font-mono" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold pl-1">Teléfono Celular</label>
                <input type="tel" placeholder="Ej. 3101234567" maxLength="10" className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-zinc-100 focus:border-teal-500/40 focus:bg-[#16161f] outline-none transition-all text-xs font-mono" value={celular} onChange={(e) => setCelular(e.target.value.replace(/\D/g, ''))} required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold pl-1">Correo Electrónico</label>
                <input type="email" placeholder="moto@cimco.com" className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-zinc-100 focus:border-teal-500/40 focus:bg-[#16161f] outline-none transition-all text-xs font-mono" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold pl-1">Contraseña de Acceso</label>
                <input type="password" placeholder="Mínimo 6 caracteres" className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-zinc-100 focus:border-teal-500/40 focus:bg-[#16161f] outline-none transition-all text-xs tracking-widest" value={clave} onChange={(e) => setClave(e.target.value)} required />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: INFORMACIÓN DE UNIDAD Y OPERACIÓN */}
          <div className="bg-[#18181b]/40 border border-white/5 rounded-2xl p-4 space-y-4">
            <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono font-bold border-b border-white/5 pb-2 flex items-center gap-2">
              <Truck size={12} className="text-teal-400" />
              Sección 2: Información de Unidad y Operación
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold pl-1">Placa del Vehículo</label>
                <input type="text" placeholder="Ej. XYZ12E" maxLength="6" className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-zinc-100 focus:border-teal-500/40 focus:bg-[#16161f] outline-none transition-all text-xs font-mono uppercase" value={placa} onChange={(e) => setPlaca(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold pl-1">Número Interno</label>
                <input type="text" placeholder="Ej. M-045" className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-zinc-100 focus:border-teal-500/40 focus:bg-[#16161f] outline-none transition-all text-xs font-mono" value={numeroInterno} onChange={(e) => setNumeroInterno(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold pl-1">Empresa / Cooperativa</label>
                <div className="relative">
                  <Building2 size={13} className="absolute left-3 top-3.5 text-zinc-600" />
                  <input type="text" placeholder="Ej. COOPTRANS" className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 pl-9 rounded-xl text-zinc-100 focus:border-teal-500/40 focus:bg-[#16161f] outline-none transition-all text-xs font-mono uppercase" value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold pl-1">Tipo de Unidad Operativa</label>
              <select className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-zinc-300 focus:border-teal-500/40 focus:bg-[#16161f] outline-none transition-all text-xs font-mono font-bold" value={tipoMoto} onChange={(e) => setTipoMoto(e.target.value)}>
                <option value={ROLES?.MOTOTAXI || 'mototaxi'}>MOTOTAXI ESTÁNDAR</option>
                <option value={ROLES?.MOTOPARRILLERO || 'motoparrillero'}>MOTO PARRILLERO</option>
                <option value={ROLES?.MOTOCARGA || 'motocarga'}>MOTOCARGA LOGÍSTICA</option>
              </select>
            </div>
          </div>

          {/* SECCIÓN DE AJUSTES DE UNIDAD Y DOCUMENTACIÓN OPERATIVA */}
          <div className="bg-[#18181b]/40 border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <label className="text-zinc-400 font-mono text-[10px] uppercase tracking-widest font-black flex items-center gap-1.5">
                <FileText size={12} className="text-teal-400" /> Sección 3: Ajustes de Unidad y Documentación Operativa
              </label>
              
              {/* 💡 INDICADOR DESTACADO DE LÍMITE DE TAMAÑO */}
              <span className="text-[9px] font-mono font-bold bg-teal-500/10 border border-teal-500/30 text-teal-300 px-2 py-0.5 rounded-md uppercase">
                Máx. {MAX_FILE_SIZE_MB} MB por archivo
              </span>
            </div>

            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wide">
              Formatos admitidos: JPG, PNG, WEBP, PDF • Límite estricto por soporte binario: <strong className="text-teal-400">5 MB</strong>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Cédula */}
              <div className={`border p-4 rounded-xl flex flex-col items-center justify-center text-center relative group transition-colors cursor-pointer ${docCedula ? 'bg-teal-950/20 border-teal-500/40' : 'bg-black/40 border-white/5 hover:border-teal-500/20'}`}>
                {docCedula ? <Check size={18} className="text-teal-400" /> : <UploadCloud size={18} className="text-zinc-500" />}
                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-tight mt-1.5 truncate max-w-full">
                  {docCedula ? docCedula.name : "Cédula Ciudadanía"}
                </span>
                <span className="text-[8px] text-zinc-500 font-mono mt-0.5">{docCedula ? `${(docCedula.size / (1024 * 1024)).toFixed(2)} MB` : "(Máx 5MB)"}</span>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,application/pdf" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => handleFileChange(e, setDocCedula, 'Cédula')} 
                />
              </div>

              {/* Licencia */}
              <div className={`border p-4 rounded-xl flex flex-col items-center justify-center text-center relative group transition-colors cursor-pointer ${docLicencia ? 'bg-teal-950/20 border-teal-500/40' : 'bg-black/40 border-white/5 hover:border-teal-500/20'}`}>
                {docLicencia ? <Check size={18} className="text-teal-400" /> : <Camera size={18} className="text-zinc-500" />}
                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-tight mt-1.5 truncate max-w-full">
                  {docLicencia ? docLicencia.name : "Licencia Conducción"}
                </span>
                <span className="text-[8px] text-zinc-500 font-mono mt-0.5">{docLicencia ? `${(docLicencia.size / (1024 * 1024)).toFixed(2)} MB` : "(Máx 5MB)"}</span>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,application/pdf" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => handleFileChange(e, setDocLicencia, 'Licencia')} 
                />
              </div>

              {/* Tarjeta de Propiedad */}
              <div className={`border p-4 rounded-xl flex flex-col items-center justify-center text-center relative group transition-colors cursor-pointer ${docTarjetaPropiedad ? 'bg-teal-950/20 border-teal-500/40' : 'bg-black/40 border-white/5 hover:border-teal-500/20'}`}>
                {docTarjetaPropiedad ? <Check size={18} className="text-teal-400" /> : <FileText size={18} className="text-zinc-500" />}
                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-tight mt-1.5 truncate max-w-full">
                  {docTarjetaPropiedad ? docTarjetaPropiedad.name : "Tarjeta Propiedad"}
                </span>
                <span className="text-[8px] text-zinc-500 font-mono mt-0.5">{docTarjetaPropiedad ? `${(docTarjetaPropiedad.size / (1024 * 1024)).toFixed(2)} MB` : "(Máx 5MB)"}</span>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,application/pdf" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => handleFileChange(e, setDocTarjetaPropiedad, 'Tarjeta de Propiedad')} 
                />
              </div>
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="w-full py-4 text-xs font-mono uppercase tracking-[0.25em] rounded-xl font-bold bg-teal-600 text-white hover:bg-teal-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(20,184,166,0.3)]">
            {loading ? "Verificando Documentos y Sincronizando..." : "Registrar Unidad Vehicular"}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-white/[0.03] text-center">
          <Link to="/register" className="text-zinc-500 hover:text-teal-400 font-mono text-[10px] uppercase tracking-widest transition-colors">
            ← Cambiar Perfil Operativo
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterMoto;