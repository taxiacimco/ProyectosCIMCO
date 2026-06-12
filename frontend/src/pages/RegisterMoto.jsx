// Versión Arquitectura: V1.6 - Estandarización de Payload (snake_case) y Blindaje Anti-Undefined
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\RegisterMoto.jsx
 * Misión: Registro del Escuadrón Táctico (2 y 3 ruedas). 
 * Regla de Negocio: Estos operadores reciben servicios DIRECTAMENTE del pasajero.
 * Ajuste: Normalización de llaves de base de datos a snake_case (numero_interno).
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/config/api'; 
import { ROLES, DEFAULT_ACCESS_LEVELS } from '@/config/constants';

const RegisterMoto = () => {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [tipoMoto, setTipoMoto] = useState(ROLES?.MOTOTAXI || 'mototaxi');
  const [placa, setPlaca] = useState('');
  const [numeroInterno, setNumeroInterno] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 🛡️ Guardas de Seguridad y Validación Estructural
    if (!nombre || !celular || !correo || !clave || !placa) {
      setError("Faltan variables operacionales críticas.");
      return;
    }

    setLoading(true);

    try {
      const selectedRole = tipoMoto || 'mototaxi';
      const accessLevel = DEFAULT_ACCESS_LEVELS?.[selectedRole] ?? 1;

      // 🛡️ Inyección de doble nomenclatura (role/rol) y estandarización a snake_case
      const payload = {
        nombre: nombre.trim(),
        telefono: celular.trim(),
        email: correo.toLowerCase().trim(),
        password: clave,
        placa: placa.toUpperCase().trim(),
        numero_interno: numeroInterno?.trim() || '', // ⚡ CORRECCIÓN: snake_case y fallback seguro
        role: selectedRole, // Para el Middleware
        rol: selectedRole,  // Para el Controlador
        access_level: accessLevel
      };

      await api.post('/api/auth/register', payload);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || "Fallo en el registro del nodo de escuadrón motorizado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] p-4 transition-colors duration-500 font-sans selection:bg-teal-500/30 selection:text-teal-200">
      <div className="w-full max-w-lg backdrop-blur-xl bg-[#121214]/80 border border-white/5 p-8 rounded-2xl shadow-[0_0_50px_-12px_rgba(20,184,166,0.15)] relative">
        
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/[0.06] border border-teal-500/20 rounded-full mb-3">
            <span className={`h-1.5 w-1.5 rounded-full ${loading ? 'bg-amber-400 animate-ping' : 'bg-teal-500 animate-pulse'}`} />
            <span className="text-[10px] font-mono tracking-[0.15em] text-teal-400 uppercase font-bold">Conexión Directa Pasajero</span>
          </div>
          <h2 className="text-white font-black text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">Registro Escuadrón Móvil</h2>
          <p className="text-zinc-500 font-mono text-[10px] tracking-wide mt-1 uppercase font-semibold">Módulo: Mototaxi, Parrillero y Carga</p>
        </div>

        {error && (
            <div className="mb-6 bg-red-950/30 border border-red-500/20 text-red-400 text-[10px] p-3.5 rounded-xl font-mono tracking-widest uppercase flex items-center gap-2">
                <span>{error}</span>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold pl-1">Nombre del Conductor</label>
              <input type="text" placeholder="Ej. Carlos Fuentes" className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-zinc-100 focus:border-teal-500/40 focus:bg-[#16161f] outline-none transition-all text-sm" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold pl-1">Número Interno</label>
              <input type="text" placeholder="Ej. M-045" className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-zinc-100 focus:border-teal-500/40 focus:bg-[#16161f] outline-none transition-all text-sm" value={numeroInterno} onChange={(e) => setNumeroInterno(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold pl-1">Celular</label>
              <input type="tel" placeholder="Ej. 3101234567" maxLength="10" className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-zinc-100 focus:border-teal-500/40 focus:bg-[#16161f] outline-none transition-all text-sm font-mono" value={celular} onChange={(e) => setCelular(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold pl-1">Tipo de Unidad</label>
              <select className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-zinc-100 focus:border-teal-500/40 focus:bg-[#16161f] outline-none transition-all text-sm" value={tipoMoto} onChange={(e) => setTipoMoto(e.target.value)}>
                <option value={ROLES?.MOTOTAXI || 'mototaxi'}>Mototaxi Estándar</option>
                <option value={ROLES?.MOTOPARRILLERO || 'motoparrillero'}>Moto Parrillero</option>
                <option value={ROLES?.MOTOCARGA || 'motocarga'}>Motocarga Logística</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold pl-1">Placa del Vehículo</label>
              <input type="text" placeholder="Ej. XYZ12E" maxLength="6" className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-zinc-100 focus:border-teal-500/40 focus:bg-[#16161f] outline-none transition-all text-sm font-mono uppercase" value={placa} onChange={(e) => setPlaca(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold pl-1">Correo (Usuario)</label>
              <input type="email" placeholder="moto@cimco.com" className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-zinc-100 focus:border-teal-500/40 focus:bg-[#16161f] outline-none transition-all text-sm font-mono" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold pl-1">Clave de Acceso</label>
            <input type="password" placeholder="Mínimo 6 caracteres" className="w-full bg-[#131318]/90 border border-white/[0.06] p-3 rounded-xl text-zinc-100 focus:border-teal-500/40 focus:bg-[#16161f] outline-none transition-all text-sm tracking-widest" value={clave} onChange={(e) => setClave(e.target.value)} required />
          </div>
          
          <button type="submit" disabled={loading} className="w-full mt-6 py-4 text-xs font-mono uppercase tracking-[0.25em] rounded-xl font-bold bg-teal-600 text-white hover:bg-teal-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(20,184,166,0.3)]">
            {loading ? "Sincronizando..." : "Registrar Unidad Vehicular"}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-white/[0.03] text-center">
          <Link to="/login" className="text-zinc-500 hover:text-teal-400 font-mono text-[10px] uppercase tracking-widest transition-colors">
            ← Regresar al acceso central
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterMoto;