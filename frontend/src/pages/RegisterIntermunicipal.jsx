// Versión Arquitectura: V1.6 - Homologación Estructural (numero_interno) y Blindaje CIMCO-UI
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\RegisterIntermunicipal.jsx
 * Misión: Registro de Operadores de Mediana/Larga Distancia con normalización de datos.
 * Regla de Negocio: Consistencia de nomenclatura para procesos de auditoría y despacho.
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/config/api'; 
import { ROLES, DEFAULT_ACCESS_LEVELS } from '@/config/constants';

const RegisterIntermunicipal = () => {
  const navigate = useNavigate();
  
  // Estado con nomenclatura camelCase para consistencia en el Frontend
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [placa, setPlaca] = useState('');
  const [numeroInterno, setNumeroInterno] = useState(''); // Homologado con RegisterMoto.jsx
  const [cooperativa, setCooperativa] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 🛡️ Guardas de seguridad preventivas (Anti-Undefined / Blindaje de Variables)
    if (!nombre || !celular || !correo || !clave || !placa || !cooperativa) {
        setError("⚠️ Error de Validación: Todos los campos operacionales son obligatorios.");
        return;
    }

    setLoading(true);

    try {
      // Trazabilidad de Roles y Niveles de Acceso con Guardas
      const targetRole = ROLES?.CONDUCTOR_INTERMUNICIPAL || 'conductor_intermunicipal';
      const accessLevel = DEFAULT_ACCESS_LEVELS?.[targetRole] ?? 2;

      // Fusión Atómica: Homologación de nomenclatura (numero_interno) para Backend
      const payload = {
        nombre: nombre.trim(),
        telefono: celular.trim(),
        email: correo.toLowerCase().trim(),
        password: clave,
        placa: placa.toUpperCase().trim(),
        numero_interno: numeroInterno.trim(), // Sincronizado con esquema de Moto
        empresa: cooperativa.trim(),
        role: targetRole, // Compatibilidad Middleware
        rol: targetRole,  // Compatibilidad Controlador
        access_level: accessLevel
      };

      await api.post('/api/auth/register', payload);
      navigate('/login');
    } catch (err) {
      // Manejo de errores con trazabilidad
      setError(err.response?.data?.message || "Fallo crítico en la sincronización del nodo intermunicipal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4 font-sans selection:bg-indigo-500/30">
      {/* Contenedor Glassmorphism CIMCO-UI */}
      <div className="w-full max-w-lg backdrop-blur-md bg-[#121214]/80 border border-white/5 p-8 rounded-2xl shadow-2xl shadow-black/60 transition-all duration-500">
        
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/[0.08] border border-indigo-500/20 rounded-full mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-[10px] font-mono tracking-[0.2em] text-indigo-400 uppercase font-black">Infraestructura CIMCO</span>
          </div>
          <h2 className="text-white font-black text-3xl tracking-tighter">Register Intermunicipal</h2>
          <p className="text-slate-500 font-mono text-[10px] tracking-[0.1em] mt-2 uppercase font-bold">Unidad de Gestión de Flota Regional</p>
        </div>

        {error && (
          <div className="mb-6 text-red-400 bg-red-950/30 p-4 rounded-xl border border-red-500/20 text-[11px] font-mono leading-relaxed animate-in fade-in slide-in-from-top-2">
            <span className="font-bold mr-2 text-red-500">SYSTEM_ALERT:</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Fila 1: Nombre y Numero Interno */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-slate-400 font-mono text-[9px] uppercase tracking-[0.2em] font-black ml-1">Operador</label>
              <input 
                type="text" 
                placeholder="Nombre Completo" 
                className="w-full bg-[#0a0a0c]/40 border border-white/5 p-3.5 rounded-xl text-white focus:border-indigo-500/50 focus:bg-[#121214] outline-none transition-all text-sm placeholder:text-slate-700" 
                value={nombre} 
                onChange={(e) => setNombre(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-slate-400 font-mono text-[9px] uppercase tracking-[0.2em] font-black ml-1 text-indigo-400">ID Interno</label>
              <input 
                type="text" 
                placeholder="Ej. 1024" 
                className="w-full bg-[#0a0a0c]/40 border border-indigo-500/10 p-3.5 rounded-xl text-white focus:border-indigo-500/50 focus:bg-[#121214] outline-none transition-all text-sm font-mono placeholder:text-slate-700" 
                value={numeroInterno} 
                onChange={(e) => setNumeroInterno(e.target.value)} 
              />
            </div>
          </div>

          {/* Fila 2: Celular y Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-slate-400 font-mono text-[9px] uppercase tracking-[0.2em] font-black ml-1">Contacto Directo</label>
              <input 
                type="tel" 
                placeholder="Celular" 
                maxLength="10" 
                className="w-full bg-[#0a0a0c]/40 border border-white/5 p-3.5 rounded-xl text-white focus:border-indigo-500/50 focus:bg-[#121214] outline-none transition-all text-sm font-mono placeholder:text-slate-700" 
                value={celular} 
                onChange={(e) => setCelular(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-slate-400 font-mono text-[9px] uppercase tracking-[0.2em] font-black ml-1">Correo Electrónico</label>
              <input 
                type="email" 
                placeholder="usuario@taxiacimco.com" 
                className="w-full bg-[#0a0a0c]/40 border border-white/5 p-3.5 rounded-xl text-white focus:border-indigo-500/50 focus:bg-[#121214] outline-none transition-all text-sm font-mono placeholder:text-slate-700" 
                value={correo} 
                onChange={(e) => setCorreo(e.target.value)} 
                required 
              />
            </div>
          </div>

          {/* Fila 3: Cooperativa y Placa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-slate-400 font-mono text-[9px] uppercase tracking-[0.2em] font-black ml-1">Empresa / Coop</label>
              <input 
                type="text" 
                placeholder="Ej. TransJagua" 
                className="w-full bg-[#0a0a0c]/40 border border-white/5 p-3.5 rounded-xl text-white focus:border-indigo-500/50 focus:bg-[#121214] outline-none transition-all text-sm placeholder:text-slate-700" 
                value={cooperativa} 
                onChange={(e) => setCooperativa(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-slate-400 font-mono text-[9px] uppercase tracking-[0.2em] font-black ml-1 text-indigo-400">Placa Vehicular</label>
              <input 
                type="text" 
                placeholder="ABC-123" 
                maxLength="6" 
                className="w-full bg-[#0a0a0c]/40 border border-indigo-500/10 p-3.5 rounded-xl text-white focus:border-indigo-500/50 focus:bg-[#121214] outline-none transition-all text-sm font-mono uppercase placeholder:text-slate-700" 
                value={placa} 
                onChange={(e) => setPlaca(e.target.value)} 
                required 
              />
            </div>
          </div>

          {/* Clave */}
          <div className="space-y-2">
            <label className="text-slate-400 font-mono text-[9px] uppercase tracking-[0.2em] font-black ml-1">Password de Seguridad</label>
            <input 
              type="password" 
              placeholder="••••••••••••" 
              className="w-full bg-[#0a0a0c]/40 border border-white/5 p-3.5 rounded-xl text-white focus:border-indigo-500/50 focus:bg-[#121214] outline-none transition-all text-sm tracking-[0.3em] placeholder:text-slate-700 placeholder:tracking-normal" 
              value={clave} 
              onChange={(e) => setClave(e.target.value)} 
              required 
            />
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full mt-4 py-4 text-[10px] font-mono uppercase tracking-[0.4em] rounded-xl font-black bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-wait"
          >
            {loading ? "PROCESANDO_DATA..." : "FINALIZAR_REGISTRO_NODO"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/login" className="text-slate-500 hover:text-indigo-400 font-mono text-[10px] uppercase tracking-widest transition-colors duration-300">
            &lt; Regresar al acceso central
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterIntermunicipal;