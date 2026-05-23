// Versión Architecture: V4.2 - Detección Automatizada de Roles mediante Parámetros QR y UI Ciber-Neo-Brutalismo
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('pasajero'); // Pasajero por defecto operativo
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 🔍 ESTRATEGIA QR: Escucha automática de Query Strings para preseleccionar rol instantáneamente
    const params = new URLSearchParams(window.location.search);
    const rolEnUrl = params.get('rol');
    
    if (rolEnUrl === 'conductor' || rolEnUrl === 'pasajero' || rolEnUrl === 'admin') {
        setRol(rolEnUrl);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 📡 Petición directa al Servidor Central Node.js en puerto 3000
      const respuesta = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, rol }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok || !data.success) {
        throw new Error(data.message || 'Credenciales o rol inválidos en nodo central.');
      }

      // 🔑 Inyectamos el Token Bearer y el perfil al localStorage del navegador
      const datosUsuario = { email, rol, id: data.id || 'cimco_session_active' };
      login(data.token, datosUsuario);

      alert(`🔑 ¡Autenticación Exitosa! Conectado al nodo central de TAXIA CIMCO.`);
      
      // Enrutamiento seguro basado en rol
      if (rol === 'admin') {
          navigate('/admin/dashboard');
      } else if (rol === 'conductor') {
          navigate('/conductor/home');
      } else {
          navigate('/pasajero/home');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-blue-500 selection:text-white font-sans text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        
        {/* Estética CIMCO-UI: Línea Superior Ciber-Neo-Brutalista */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500" />
        
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">CIMCO LOGIN CORE</h1>
          <p className="text-slate-400 text-xs mt-1">Ecosistema de Transporte Híbrido - La Jagua de Ibirico</p>
          <div className="mt-2 inline-block bg-blue-950/40 border border-blue-800 text-blue-400 px-3 py-0.5 text-[10px] font-mono rounded-full uppercase tracking-wider">
            Canal detectado: {rol}
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-950/50 border border-red-800 text-red-400 text-xs p-3 rounded-lg font-mono">
            ⚠️ ERROR: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-600"
              placeholder="nombre@taxiacimco.com"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
              Contraseña de Acceso
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-600"
              placeholder="••••••••••••"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
              Rol de Acceso Ecosistema
            </label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="pasajero">Pasajero (Ecosistema Urbano)</option>
              <option value="conductor">Conductor (Mototaxi / Motocarga)</option>
              <option value="admin">Administrador / CEO</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-2 py-3.5 px-4 rounded-lg text-sm font-bold tracking-wide transition-all
              ${loading 
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 active:scale-[0.99]'}`}
          >
            {loading ? 'SINCRO EN CURSO...' : 'ACCEDER AL NODO CENTRAL'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;