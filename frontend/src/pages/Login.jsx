// Versión Arquitectura: V17.5 - Interfaz Suave & Match de Errores Operativos (CIMCO-UI V9.4 Claro)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\Login.jsx
 * Estilo: CIMCO-UI V9.4 Light Mode Glassmorphism
 * Misión: Detectar errores reales del backend y suavizar paleta de colores.
 */

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import api from '../config/api';
import { Eye, EyeOff, ShieldAlert } from 'lucide-react';

const Login = () => {
  const { loginLocal } = useAuth();
  const navigate = useNavigate();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('📡 [CIMCO-TELEMETRY] Iniciando handshake con /api/auth/login...');
      const { data } = await api.post('/api/auth/login', { identifier, password });
      
      if (data.success) {
        console.log('✅ [CIMCO-TELEMETRY] Respuesta recibida:', data);
        loginLocal(data.user, data.token);
        
        const nivelAcceso = data.user.access_level;
        const rol = data.user.role || data.user.rol;

        if (rol === 'ADMIN' || nivelAcceso === 99) {
            console.log('👑 [CIMCO-TELEMETRY] Perfil CEO detectado. Redirigiendo a Consola Central...');
            navigate('/admin');
        } else {
            navigate('/');
        }
      }
    } catch (err) {
      console.error('❌ [CIMCO-TELEMETRY] Error en pasarela:', err.response?.data || err.message);
      
      const status = err.response?.status;
      // Capturamos el mensaje exacto que viene del servidor de desarrollo
      const msgBackend = err.response?.data?.message || '';

      // 🧠 LOGICA DE CAPTURA MEJORADA: Evaluamos tanto el status como el texto devuelto
      if (
        status === 404 || 
        msgBackend.includes("no registrado") || 
        msgBackend.includes("no existe") || 
        msgBackend.includes("sector operativo") // Captura el error de usuario inexistente/inválido en sector operativo
      ) {
          // UI Proactiva: Alerta de registro guiado
          setError('Este usuario no se encuentra registrado en el sector operativo. Redirigiendo al formulario de registro...');
          
          // Redirección automática tras 3 segundos
          setTimeout(() => {
              navigate('/register');
          }, 3000);
      } else {
          setError('Credenciales inválidas. Por favor, verifique su clave de acceso.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    // 🎨 PALETA CLARA: Fondo gris suave/azulino ultra-limpio
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 transition-colors duration-500">
      {/* Tarjeta con efecto cristal claro (Glassmorphism) y bordes sutiles */}
      <div className="w-full max-w-md backdrop-blur-md bg-white/90 border border-slate-200/60 p-8 rounded-2xl shadow-xl shadow-slate-200/50">
        
        <h1 className="text-slate-800 text-xl font-bold mb-6 tracking-widest text-center uppercase">
          Acceso TAXIA CIMCO
        </h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-600 text-[11px] uppercase font-mono transition-all animate-in fade-in zoom-in-95">
            <ShieldAlert size={16} className="mr-2 flex-shrink-0 text-red-500" /> 
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1 font-semibold">
              ID / Teléfono
            </label>
            <input 
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg text-slate-800 focus:border-cyan-500 focus:bg-white outline-none transition-all"
              placeholder="Ej. 3000000000"
              required 
            />
          </div>

          <div className="relative">
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1 font-semibold">
              Clave de Acceso
            </label>
            <input 
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg text-slate-800 focus:border-cyan-500 focus:bg-white outline-none transition-all"
              placeholder="••••••"
              required 
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 transition-colors"
            >
                {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full mt-6 py-4 text-xs font-mono uppercase tracking-[0.25em] rounded-xl transition-all duration-300 font-bold ${
              loading 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-slate-800 text-white hover:bg-cyan-600 shadow-md hover:shadow-cyan-200'
            }`}
          >
            {loading ? 'Procesando...' : 'Acceder al Nodo Central'}
          </button>
        </form>

        {/* --- ESTRUCTURA DEL FOOTER ADAPTADO A COLORES SUAVES --- */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-3 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                ¿Usuario nuevo? <Link to="/register" className="text-cyan-600 hover:text-cyan-700 font-bold transition-colors">REGISTRARSE</Link>
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                ¿Olvidaste tu clave? <Link to="/recuperar" className="text-cyan-600 hover:text-cyan-700 font-bold transition-colors">RECUPERAR CUENTA</Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;