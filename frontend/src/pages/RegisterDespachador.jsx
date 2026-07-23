// Versión Arquitectura: V1.6 - Asignación Estricta de Sede/Terminal (Level 3) y Payload Dinámico Híbrido
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\RegisterDespachador.jsx
 * Misión: Registro de Despachadores con validación rigurosa de Terminal/Sede para Nivel de Acceso 3.
 * Regla de Negocio: Recibe solicitudes de Pasajeros y gestiona despachos hacia Intermunicipales.
 * Estilo: CIMCO-UI V9.3 Glassmorphism (Amber Theme).
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/config/api'; 
import { ROLES, DEFAULT_ACCESS_LEVELS } from '@/config/constants';
import { Building2, MapPin, AlertTriangle, UploadCloud, FileText } from 'lucide-react';

// Constantes de Validación Documental Preventiva (Máx 5MB)
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const RegisterDespachador = () => {
  const navigate = useNavigate();

  // 📡 ESTADOS CORE
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  
  // 🏢 REQUISITOS OPERATIVOS ACCESS LEVEL 3 (Sede y Empresa)
  const [empresa, setEmpresa] = useState('');
  const [terminalSede, setTerminalSede] = useState('');

  // 📁 DOCUMENTACIÓN ADICIONAL / OPCIONAL (Preparación para FormData)
  const [docIdentidadFile, setDocIdentidadFile] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Helper de validación de archivos opcionales
  const validateFile = (file, fileLabel) => {
    if (!file) return null;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `El archivo "${fileLabel}" tiene un formato no válido. Usa imágenes (.jpg, .png) o PDF.`;
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

    // 🛡️ GUARDA DE SEGURIDAD ESTRICTA PARA ACCESS_LEVEL 3
    if (!nombre?.trim() || !celular?.trim() || !correo?.trim() || !clave?.trim()) {
      setError("Todos los campos personales de acceso son obligatorios.");
      return;
    }

    if (!empresa?.trim() || !terminalSede?.trim()) {
      setError("⚠️ Error de Gobernanza Level 3: Se requiere especificar Empresa Matriz y Sede/Terminal de Operación.");
      return;
    }

    if (docIdentidadFile) {
      const errDoc = validateFile(docIdentidadFile, 'Documento de Identificación');
      if (errDoc) {
        setError(errDoc);
        return;
      }
    }

    setLoading(true);

    try {
      const targetRole = ROLES?.DESPACHADOR || 'despachador';
      const accessLevel = DEFAULT_ACCESS_LEVELS?.[targetRole] ?? 3;

      let requestData;
      let requestHeaders = {};

      // 🔄 MIGRACIÓN DINÁMICA: Si adjunta documento, usa multipart/form-data; si no, envía JSON.
      if (docIdentidadFile) {
        const formDataPayload = new FormData();
        formDataPayload.append('nombre', nombre.trim());
        formDataPayload.append('telefono', celular.trim());
        formDataPayload.append('email', correo.toLowerCase().trim());
        formDataPayload.append('password', clave);
        formDataPayload.append('empresa', empresa.trim());
        formDataPayload.append('terminal_sede', terminalSede.trim());
        formDataPayload.append('role', targetRole);
        formDataPayload.append('access_level', String(accessLevel));

        if (docIdentidadFile instanceof File) {
          formDataPayload.append('doc_identificacion', docIdentidadFile);
        }

        requestData = formDataPayload;
        requestHeaders = { 'Content-Type': 'multipart/form-data' };
      } else {
        requestData = {
          nombre: nombre.trim(),
          telefono: celular.trim(),
          email: correo.toLowerCase().trim(),
          password: clave,
          empresa: empresa.trim(),
          terminal_sede: terminalSede.trim(),
          role: targetRole,
          access_level: accessLevel
        };
      }

      const res = await api.post('/api/auth/register', requestData, {
        headers: requestHeaders
      });

      if (res?.data?.success || res?.status === 200 || res?.status === 201) {
        navigate('/login');
      } else {
        setError(res?.data?.message || "Rechazo del nodo central al vincular el despachador.");
      }
    } catch (err) {
      console.error("🚨 [CIMCO-DESPACHO-AUTH] Error de registro:", err);
      setError(err?.response?.data?.message || "Error en el canal de comunicación con el nodo de despacho.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c] p-4 transition-colors duration-500 font-sans selection:bg-amber-500/30 relative overflow-hidden">
      {/* Fondo estético CIMCO-UI */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-black to-black z-0" />

      <div className="w-full max-w-lg backdrop-blur-md bg-[#121214]/80 border border-white/5 p-8 rounded-2xl shadow-xl shadow-black/50 relative z-10">
        
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/[0.06] border border-amber-500/20 rounded-full mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] font-mono tracking-[0.15em] text-amber-400 uppercase font-bold">Enrutador Logístico Principal (Level 3)</span>
          </div>
          <h2 className="text-white font-black text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 uppercase">Registro Despachador</h2>
          <p className="text-slate-400 font-mono text-[10px] tracking-wide mt-1 uppercase font-semibold">Recepción de Pasajeros y Asignación de Rutas</p>
        </div>

        {error && (
          <div className="mb-4 text-red-400 bg-red-950/30 p-3.5 rounded-xl border border-red-500/20 text-xs font-mono flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle size={14} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-slate-400 font-mono text-[10px] uppercase tracking-widest font-bold">Nombre del Operador / Encargado</label>
            <input 
              type="text" 
              placeholder="Ej. Carlos Despacho Norte" 
              className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-white focus:border-amber-500/50 outline-none transition-all text-xs font-mono" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              disabled={loading}
              required 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-slate-400 font-mono text-[10px] uppercase tracking-widest font-bold">Línea Celular</label>
              <input 
                type="tel" 
                placeholder="Ej. 3001234567" 
                maxLength="10" 
                className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-white focus:border-amber-500/50 outline-none transition-all text-xs font-mono" 
                value={celular} 
                onChange={(e) => setCelular(e.target.value)} 
                disabled={loading}
                required 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-400 font-mono text-[10px] uppercase tracking-widest font-bold">Correo de Despacho</label>
              <input 
                type="email" 
                placeholder="despacho@cimco.com" 
                className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-white focus:border-amber-500/50 outline-none transition-all text-xs font-mono" 
                value={correo} 
                onChange={(e) => setCorreo(e.target.value)} 
                disabled={loading}
                required 
              />
            </div>
          </div>

          {/* 🏢 MÓDULO LEVEL 3: EMPRESA Y TERMINAL / SEDE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-3">
            <div className="space-y-1.5">
              <label className="text-amber-400 font-mono text-[10px] uppercase tracking-widest font-bold flex items-center gap-1">
                <Building2 size={12} /> Empresa / Cooperativa
              </label>
              <input 
                type="text" 
                placeholder="Ej. Cootransbol" 
                className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-white focus:border-amber-500/50 outline-none transition-all text-xs font-mono" 
                value={empresa} 
                onChange={(e) => setEmpresa(e.target.value)} 
                disabled={loading}
                required 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-amber-400 font-mono text-[10px] uppercase tracking-widest font-bold flex items-center gap-1">
                <MapPin size={12} /> Terminal / Sede
              </label>
              <input 
                type="text" 
                placeholder="Ej. Sede Norte Módulo 4" 
                className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-white focus:border-amber-500/50 outline-none transition-all text-xs font-mono" 
                value={terminalSede} 
                onChange={(e) => setTerminalSede(e.target.value)} 
                disabled={loading}
                required 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-400 font-mono text-[10px] uppercase tracking-widest font-bold">Clave de Acceso Central</label>
            <input 
              type="password" 
              placeholder="Mínimo 6 caracteres" 
              className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-white focus:border-amber-500/50 outline-none transition-all tracking-widest text-xs" 
              value={clave} 
              onChange={(e) => setClave(e.target.value)} 
              disabled={loading}
              required 
            />
          </div>

          {/* 📂 SOPORTE DOCUMENTAL OPCIONAL */}
          <div className="border-t border-white/5 pt-3">
            <label className="text-zinc-400 font-mono text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5 mb-2">
              <FileText size={12} className="text-amber-400" /> Documento de Identificación / Credencial (Opcional)
            </label>
            
            <div className="bg-black/40 border border-white/5 p-3 rounded-xl flex items-center justify-between relative hover:border-amber-500/20 transition-colors cursor-pointer">
              <div className="flex items-center gap-2.5 truncate">
                <UploadCloud size={16} className={docIdentidadFile ? "text-emerald-400" : "text-zinc-500"} />
                <span className="text-[10px] font-mono text-zinc-300 truncate">
                  {docIdentidadFile ? docIdentidadFile.name : "Adjuntar PDF o Imagen"}
                </span>
              </div>
              <input 
                type="file" 
                accept="image/jpeg,image/png,image/webp,application/pdf" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={(e) => handleFileChange(e, setDocIdentidadFile, 'Documento de Identificación')} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full mt-6 py-4 text-xs font-mono uppercase tracking-[0.25em] rounded-xl font-bold bg-amber-600 text-white hover:bg-amber-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(217,119,6,0.2)]"
          >
            {loading ? "VINCULANDO_NODO..." : "VINCULAR DESPACHADOR"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-amber-400 hover:text-amber-300 font-mono text-xs font-bold transition-colors">
            ← Regresar al acceso central
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterDespachador;