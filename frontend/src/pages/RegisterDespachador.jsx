// Versión Arquitectura: V1.5 - Homologación de Payload (rol/role) y UI Glassmorphism
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\RegisterDespachador.jsx
 * Misión: Registro de Despachadores.
 * Regla de Negocio: Recibe solicitudes directamente del Pasajero y transfiere la carga al Intermunicipal.
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/config/api'; 
import { ROLES, DEFAULT_ACCESS_LEVELS } from '@/config/constants';

const RegisterDespachador = () => {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 🛡️ Guardas de seguridad preventivas
    if (!nombre || !celular || !correo || !clave || !empresa) {
      setError("Todos los campos operativos son estrictamente obligatorios.");
      setLoading(false);
      return;
    }

    try {
      const targetRole = ROLES?.DESPACHADOR || 'despachador';
      const accessLevel = DEFAULT_ACCESS_LEVELS?.[targetRole] ?? 3;

      const payload = {
        nombre: nombre.trim(),
        telefono: celular.trim(),
        email: correo.toLowerCase().trim(),
        password: clave,
        empresa: empresa.trim(),
        role: targetRole, // Middleware
        rol: targetRole,  // Controlador
        access_level: accessLevel
      };

      await api.post('/api/auth/register', payload);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || "Error en el canal de comunicación con el nodo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c] p-4 transition-colors duration-500 font-sans">
      <div className="w-full max-w-lg backdrop-blur-md bg-[#121214]/80 border border-white/5 p-8 rounded-2xl shadow-xl shadow-black/50">
        
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/[0.06] border border-amber-500/20 rounded-full mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] font-mono tracking-[0.15em] text-amber-400 uppercase font-bold">Enrutador Logístico Principal</span>
          </div>
          <h2 className="text-white font-black text-2xl tracking-tight">Registro Despachador</h2>
          <p className="text-slate-400 font-mono text-[10px] tracking-wide mt-1 uppercase font-semibold">Recepción de Pasajeros y Asignación de Rutas</p>
        </div>

        {error && <div className="mb-4 text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-500/20 text-xs font-mono">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-slate-400 font-mono text-[10px] uppercase tracking-widest font-bold">Nombre Completo</label>
            <input type="text" placeholder="Ej. Terminal Norte Despacho" className="w-full bg-[#121214]/50 border border-white/5 p-3 rounded-lg text-white focus:border-amber-500 outline-none transition-all text-sm" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-slate-400 font-mono text-[10px] uppercase tracking-widest font-bold">Celular</label>
              <input type="tel" placeholder="Ej. 3001234567" maxLength="10" className="w-full bg-[#121214]/50 border border-white/5 p-3 rounded-lg text-white focus:border-amber-500 outline-none transition-all text-sm" value={celular} onChange={(e) => setCelular(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-400 font-mono text-[10px] uppercase tracking-widest font-bold">Correo Electrónico</label>
              <input type="email" placeholder="despacho@cimco.com" className="w-full bg-[#121214]/50 border border-white/5 p-3 rounded-lg text-white focus:border-amber-500 outline-none transition-all text-sm" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-slate-400 font-mono text-[10px] uppercase tracking-widest font-bold">Empresa / Terminal</label>
            <input type="text" placeholder="Ej. Terminal de Rutas CIMCO" className="w-full bg-[#121214]/50 border border-white/5 p-3 rounded-lg text-white focus:border-amber-500 outline-none transition-all text-sm" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-slate-400 font-mono text-[10px] uppercase tracking-widest font-bold">Clave de Acceso</label>
            <input type="password" placeholder="Mínimo 6 caracteres" className="w-full bg-[#121214]/50 border border-white/5 p-3 rounded-lg text-white focus:border-amber-500 outline-none transition-all tracking-widest text-sm" value={clave} onChange={(e) => setClave(e.target.value)} required />
          </div>
          
          <button type="submit" disabled={loading} className="w-full mt-6 py-4 text-xs font-mono uppercase tracking-[0.25em] rounded-xl font-bold bg-amber-600 text-white hover:bg-amber-500 transition-all duration-300">
            {loading ? "Sincronizando..." : "Vincular Despachador"}
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link to="/login" className="text-amber-400 hover:text-amber-300 font-mono text-xs font-bold transition-colors">Regresar al acceso central</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterDespachador;