// Versión Arquitectura: V12.2 - Aislamiento de Entorno de Desarrollo y Supresión de Credenciales Quemadas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\RegisterAdmin.jsx
 * Misión: Sembrar los perfiles de Alta Gerencia y Operaciones en entorno local de forma segura.
 * Seguridad: Bloqueo estricto fuera del entorno de 'development' y remoción de credenciales hardcodeadas.
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/config/api';
import { ROLES, DEFAULT_ACCESS_LEVELS } from '@/config/constants';

const RegisterAdmin = () => {
  const navigate = useNavigate();
  const [log, setLog] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados para inyección dinámica (remoción de credenciales quemadas)
  const [correoInyeccion, setCorreoInyeccion] = useState('');
  const [claveInyeccion, setClaveInyeccion] = useState('');

  // 🛡️ GUARDA DE SEGURIDAD: Aislamiento estricto de entorno
  const isDevelopment = import.meta.env.MODE === 'development';

  const ejecutarInyeccion = async (perfil) => {
    setLoading(true);
    setLog('');

    // 🛡️ Blindaje de variables Anti-Undefined
    if (!correoInyeccion?.trim() || !claveInyeccion?.trim()) {
      setLog("❌ Error de Validación: Debe especificar un correo y clave operativa para la inyección.");
      setLoading(false);
      return;
    }

    try {
      let payload = {};

      if (perfil === 'CEO') {
        payload = {
          nombre: "CARLOS MARIO CEO",
          telefono: "3101112233",
          email: correoInyeccion.toLowerCase().trim(),
          password: claveInyeccion,
          role: ROLES?.ADMIN || 'admin', 
          access_level: DEFAULT_ACCESS_LEVELS?.[ROLES?.ADMIN] ?? 99
        };
      } else if (perfil === 'SECRETARIA') {
        payload = {
          nombre: "Maria Secretaria CIMCO",
          telefono: "3107778899",
          email: correoInyeccion.toLowerCase().trim(),
          password: claveInyeccion,
          role: ROLES?.SECRETARIA || 'secretaria', 
          access_level: DEFAULT_ACCESS_LEVELS?.[ROLES?.SECRETARIA] ?? 50
        };
      }

      // Enviar comando directo al endpoint de registro
      await api.post('/api/auth/register', payload);
      
      setLog(`✅ Perfil [${perfil}] indexado con éxito en el clúster local con el usuario: ${correoInyeccion}`);
      
      // Limpiar campos por seguridad tras la inyección exitosa
      setCorreoInyeccion('');
      setClaveInyeccion('');
      
    } catch (err) {
      setLog(`❌ Error: ${err.response?.data?.message || 'Fallo de conexión con el nodo central'}`);
    } finally {
      setLoading(false);
    }
  };

  // 🛡️ RENDERIZADO DE BLOQUEO (Si se filtra a Producción)
  if (!isDevelopment) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/[0.15] rounded-full blur-[150px] pointer-events-none animate-pulse" />
        <div className="w-full max-w-lg backdrop-blur-xl bg-[#0b0b0f]/95 border border-red-500/30 rounded-2xl p-10 shadow-[0_0_50px_-10px_rgba(239,68,68,0.4)] relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 mb-6">
            <span className="text-red-500 text-2xl font-black">!</span>
          </div>
          <h1 className="text-red-500 font-black text-2xl tracking-widest uppercase mb-2">Acceso Restringido</h1>
          <p className="text-zinc-400 font-mono text-xs tracking-wider mb-8 leading-relaxed">
            El entorno de inyección de cuentas está estrictamente deshabilitado en el clúster de producción.<br/>Violación de políticas de seguridad evadida.
          </p>
          <Link to="/login" className="inline-block px-8 py-3 bg-red-950/40 text-red-400 border border-red-500/20 hover:bg-red-900/50 hover:text-red-300 font-mono text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all">
            Retornar a Zona Segura
          </Link>
        </div>
      </div>
    );
  }

  // RENDERIZADO DE DESARROLLO (Modo Seguro Activo)
  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center p-4 font-sans relative overflow-hidden selection:bg-red-500/30">
      {/* Resplandor Rojo de advertencia de infraestructura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md backdrop-blur-xl bg-[#0b0b0f]/95 border border-red-500/10 rounded-2xl p-8 shadow-2xl shadow-black relative z-10">
        
        {/* Encabezado Restringido */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/[0.08] border border-red-500/30 rounded-full mb-3">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-[10px] font-mono tracking-[0.2em] text-red-400 uppercase font-bold">Terminal Interno de Control</span>
          </div>
          <h2 className="text-zinc-100 font-black text-xl tracking-tight uppercase">Inicializador de Cuentas</h2>
          <p className="text-zinc-500 font-mono text-[9px] tracking-widest mt-1 uppercase">Entorno Local de Pruebas CIMCO</p>
        </div>

        {/* Consola de Logs */}
        {log && (
          <div className="mb-6 bg-black/50 border border-zinc-800/80 p-3 rounded-xl font-mono text-[11px] text-zinc-300 whitespace-pre-line leading-relaxed border-l-2 border-l-red-500">
            {log}
          </div>
        )}

        <div className="space-y-5">
          <p className="text-[10px] text-zinc-400 text-center font-mono uppercase tracking-wider mb-2 border-b border-white/5 pb-3">
            Defina credenciales dinámicas para la inyección de roles:
          </p>

          {/* Inputs Dinámicos para Evitar Credenciales Quemadas */}
          <div className="space-y-3 bg-zinc-950/50 p-4 rounded-xl border border-white/5">
            <div className="space-y-1.5">
              <label className="text-zinc-500 font-mono text-[9px] uppercase tracking-[0.2em] font-black pl-1">Correo de Asignación</label>
              <input 
                type="email" 
                placeholder="ej. admin@cimco.test" 
                className="w-full bg-[#050507]/80 border border-red-500/10 p-3 rounded-lg text-zinc-200 focus:border-red-500/40 outline-none transition-all text-xs font-mono placeholder:text-zinc-700" 
                value={correoInyeccion} 
                onChange={(e) => setCorreoInyeccion(e.target.value)} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-zinc-500 font-mono text-[9px] uppercase tracking-[0.2em] font-black pl-1">Clave Operativa</label>
              <input 
                type="password" 
                placeholder="••••••" 
                className="w-full bg-[#050507]/80 border border-red-500/10 p-3 rounded-lg text-zinc-200 focus:border-red-500/40 outline-none transition-all text-xs tracking-widest placeholder:tracking-normal placeholder:text-zinc-700" 
                value={claveInyeccion} 
                onChange={(e) => setClaveInyeccion(e.target.value)} 
              />
            </div>
          </div>

          {/* ACCIÓN 1: ADMINISTRADOR MÁXIMO / CEO */}
          <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl space-y-3 transition-colors hover:border-red-500/20">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white font-mono">⚡ El Administrador Máximo / CEO</span>
              <span className="text-[9px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20 font-mono font-bold">LVL 99</span>
            </div>
            <button 
              type="button" 
              onClick={() => ejecutarInyeccion('CEO')} 
              disabled={loading || !correoInyeccion || !claveInyeccion} 
              className="w-full bg-red-600/90 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono uppercase text-[10px] font-bold tracking-[0.2em] py-3 rounded-lg transition-all shadow-md shadow-red-900/20 active:scale-[0.98]"
            >
              {loading ? "Ejecutando..." : "Inyectar Perfil CEO"}
            </button>
          </div>

          {/* ACCIÓN 2: SOPORTE Y OPERACIONES / SECRETARIA */}
          <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl space-y-3 transition-colors hover:border-zinc-700">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white font-mono">🎧 Soporte y Operaciones</span>
              <span className="text-[9px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700 font-mono font-bold">LVL 50</span>
            </div>
            <button 
              type="button" 
              onClick={() => ejecutarInyeccion('SECRETARIA')} 
              disabled={loading || !correoInyeccion || !claveInyeccion} 
              className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-200 font-mono uppercase text-[10px] font-bold tracking-[0.2em] py-3 rounded-lg transition-all active:scale-[0.98]"
            >
              {loading ? "Ejecutando..." : "Inyectar Perfil Secretaria"}
            </button>
          </div>
        </div>

        {/* Retorno seguro */}
        <div className="mt-8 text-center border-t border-zinc-900 pt-4">
          <Link to="/login" className="text-zinc-600 hover:text-red-400 font-mono text-[10px] uppercase tracking-widest transition-colors">
            ← Regresar al Acceso Público
          </Link>
        </div>

      </div>
    </div>
  );
};

export default RegisterAdmin;