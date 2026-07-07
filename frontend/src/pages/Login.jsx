// Versión Arquitectura: V19.10 - Saneamiento de Doble Submit y Enrutamiento Predictivo Unificado
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\Login.jsx
 * Misión: Componente de autenticación con estilos Neo-Glassmorphism.
 * Ajuste V19.10: Eliminación radical de la petición API redundante para mitigar el bucle 404 (Double Submit)
 * y unificación del redireccionamiento post-login hacia la aduana central de AppRouter.jsx.
 */

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldAlert, KeyRound, Terminal, UserPlus, HelpCircle } from 'lucide-react';

const Login = () => {
  const { loginLocal } = useAuth();
  const navigate = useNavigate();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 🛡️ GUARDA DE SEGURIDAD ANTI-UNDEFINED
    if (!identifier.trim() || !password.trim()) {
      setError('Por favor, ingrese sus credenciales completas.');
      setLoading(false);
      return;
    }

    try {
      console.log('📡 [CIMCO-NEXUS-AUTH] Delegando credenciales al AuthProvider de forma única...');

      // 🛠️ REMOCIÓN QUIRÚRGICA: Se elimina el api.post local para evitar el doble envío.
      // Ahora invocamos directamente al proveedor pasándole el identificador y la contraseña.
      await loginLocal(identifier.trim(), password);

      console.log('✅ [CIMCO-NEXUS] Handshake local exitoso. Sincronizando con el router central...');
      
      // 🚀 OPTIMIZACIÓN DRY: Redirigimos a la raíz '/' para activar el RoleBasedRedirect de AppRouter.jsx.
      // Esto previene colisiones de rutas manuales y centraliza el control de acceso por roles.
      navigate('/');

    } catch (err) {
      console.error('🚨 [CIMCO-NEXUS-LOGIN-ERROR]:', err);
      // Extraemos el mensaje del error devuelto por la pasarela del AuthProvider
      setError(err?.response?.data?.message || err?.message || 'Fallo de conexión con el nodo central. Intente nuevamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121214] flex flex-col justify-center items-center p-4 selection:bg-cyan-500/30 relative overflow-hidden">
      
      {/* CAPA ORNAMENTAL DE TELEMETRÍA (NEO-GLASSMOPHISM BACKGROUND) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* CONTENEDOR MAESTRO DE INTERFAZ CIMCO-UI V9.3 */}
      <div className="w-full max-w-[420px] backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-8 shadow-2xl relative z-10 transition-all duration-300">
        
        {/* ENCABEZADO DE IDENTIDAD CORPORATIVA */}
        <div className="flex flex-col items-center text-center mb-8 relative z-10">
          <div className="h-12 w-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center border border-yellow-400/20 shadow-lg shadow-yellow-500/10 mb-4 animate-pulse">
            <Terminal className="text-black" size={22} strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-black tracking-widest text-white uppercase font-sans">
            TAXIA <span className="text-yellow-500">CIMCO</span>
          </h2>
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mt-1.5">
            SISTEMA CENTRAL DE LOGÍSTICA URBANA
          </p>
        </div>

        {/* FEEDBACK DE ERROR BLINDADO */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-fadeIn relative z-10">
            <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-red-200/90 font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* FORMULARIO DE ACCESO OPERATIVO */}
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          
          {/* CAMPO DE IDENTIFICADOR MULTILÍNGÜE */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block pl-1">
              Identificador (Correo o Teléfono)
            </label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                placeholder="ejemplo@correo.com o 3123456789"
                className="w-full h-12 bg-black/40 border border-white/5 rounded-xl px-4 text-sm text-white font-medium placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:bg-black/60 transition-all duration-200"
              />
            </div>
          </div>

          {/* CAMPO DE CONTRASEÑA PROTEGIDA */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block">
                Clave de Seguridad
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••••••"
                className="w-full h-12 bg-black/40 border border-white/5 rounded-xl pl-4 pr-11 text-sm text-white font-mono placeholder:text-zinc-700 focus:outline-none focus:border-cyan-500/50 focus:bg-black/60 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* DISPARADOR DE TRANSMISIÓN */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-500 hover:to-cyan-600 text-black text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed shadow-lg hover:shadow-cyan-500/10 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="h-3 w-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Sincronizando Nodo...
              </>
            ) : (
              <>
                <KeyRound size={12} /> Acceder al Nodo Central
              </>
            )}
          </button>
        </form>

        {/* PASARELA DE ENLACES PERIMETRALES */}
        <div className="mt-8 pt-6 border-t border-white/[0.05] grid grid-cols-2 gap-4 relative z-10">
          <Link 
            to="/register" 
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/5 hover:border-cyan-500/30 bg-black/20 transition-all text-decoration-none group"
          >
            <UserPlus size={16} className="text-cyan-500 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 group-hover:text-cyan-400 transition-colors">Crear Cuenta</span>
          </Link>
          <Link 
            to="/forgot-password" 
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/5 hover:border-yellow-500/30 bg-black/20 transition-all text-decoration-none group"
          >
            <HelpCircle size={16} className="text-yellow-500 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 group-hover:text-yellow-400 transition-colors">Soporte TI</span>
          </Link>
        </div>

      </div>

      {/* NOTA OPERATIVA DE PIE DE PÁGINA */}
      <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mt-6 relative z-10 pointer-events-none">
        NEXUS AUTH v1.1.0 • ENTORNO DE OPERACIÓN PROTEGIDO
      </p>
    </div>
  );
};

export default Login;