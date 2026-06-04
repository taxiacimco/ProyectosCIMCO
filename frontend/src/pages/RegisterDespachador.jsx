// Versión Arquitectura: V1.1 - Interfaz Light Mode & Teal (Unificada con Login)
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

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

    try {
      const payload = {
        nombre: nombre.trim(),
        telefono: celular.trim(),
        email: correo.toLowerCase().trim(),
        password: clave,
        empresa: empresa.trim(),
        rol: 'despachador'
      };

      await axios.post('http://localhost:3000/api/auth/register', payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || "Error en el canal de comunicación con el nodo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // 1. Contenedor exterior (Fondo claro)
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 transition-colors duration-500 font-sans">
      
      // 2. Tarjeta interior (Efecto cristal claro y sombras suaves)
      <div className="w-full max-w-lg backdrop-blur-md bg-white/90 border border-slate-200/60 p-8 rounded-2xl shadow-xl shadow-slate-200/50">
        
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/[0.06] border border-teal-500/20 rounded-full mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-[10px] font-mono tracking-[0.15em] text-teal-600 uppercase font-bold">Terminal Control Logístico</span>
          </div>
          {/* Títulos principales: text-slate-800 */}
          <h2 className="text-slate-800 font-black text-2xl tracking-tight">Registro TAXIA CIMCO</h2>
          {/* Subtítulos: text-slate-500 */}
          <p className="text-slate-500 font-mono text-[10px] tracking-wide mt-1 uppercase font-semibold">Módulo: Despachador & Intermunicipal</p>
        </div>

        {error && <div className="mb-4 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 text-xs font-mono">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-slate-500 font-mono text-[10px] uppercase tracking-widest font-bold">Nombre Completo</label>
            {/* Campos de Texto (Inputs) */}
            <input type="text" placeholder="Ej. Terminal Norte Despacho" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg text-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:bg-white outline-none transition-all text-sm" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-slate-500 font-mono text-[10px] uppercase tracking-widest font-bold">Celular</label>
              <input type="tel" placeholder="Ej. 3001234567" maxLength="10" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg text-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:bg-white outline-none transition-all text-sm" value={celular} onChange={(e) => setCelular(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-500 font-mono text-[10px] uppercase tracking-widest font-bold">Correo Electrónico</label>
              <input type="email" placeholder="despacho@cimco.com" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg text-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:bg-white outline-none transition-all text-sm" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-slate-500 font-mono text-[10px] uppercase tracking-widest font-bold">Empresa / Cooperativa</label>
            <input type="text" placeholder="Ej. Cootranscuyo o Vehículo Afiliado" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg text-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:bg-white outline-none transition-all text-sm" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-slate-500 font-mono text-[10px] uppercase tracking-widest font-bold">Clave de Acceso</label>
            <input type="password" placeholder="Mínimo 6 caracteres" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg text-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:bg-white outline-none transition-all tracking-widest text-sm" value={clave} onChange={(e) => setClave(e.target.value)} required />
          </div>
          
          {/* Botones de Acción (Turquesa Vibrante) */}
          <button type="submit" disabled={loading} className="w-full mt-6 py-4 text-xs font-mono uppercase tracking-[0.25em] rounded-xl font-bold bg-teal-500 text-white hover:bg-teal-400 shadow-md hover:shadow-teal-200 transition-all duration-300">
            {loading ? "Sincronizando..." : "Vincular Despachador"}
          </button>
        </form>
        <div className="mt-6 text-center">
          {/* Enlaces de redirección al Login */}
          <Link to="/login" className="text-teal-600 hover:text-teal-700 font-mono text-xs font-bold transition-colors">Regresar al acceso central</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterDespachador;