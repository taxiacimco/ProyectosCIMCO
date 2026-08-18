// Versión Arquitectura: V21.34 - Autenticación Dual (Email / Celular +57) con Normalización Anti-Sufijo y Guardián Anti-Loop
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\Login.jsx
 * Misión: Componente de Inicio de Sesión con consulta dual (Correo Electrónico o Celular Colombiano),
 * normalización automática del prefijo telefónico (+57 / 57), guardián de autenticación activa (Anti-Loop),
 * pantalla de recuperación de clave y estética Dark Glassmorphism Premium (CIMCO-UI V9.3).
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldAlert, KeyRound, UserPlus, HelpCircle, Phone, Mail, LogIn, Lock } from 'lucide-react';

const PHONE_REGEX = /^(\+?57)?(3\d{9})$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = () => {
  const authContext = useAuth() || {};
  const loginLocal = authContext.loginLocal;
  const user = authContext.user || null;
  const authLoading = authContext.loading || false;

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const roleParam = searchParams ? searchParams.get('role')?.trim()?.toLowerCase() : null;
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // 🛡️ GUARDIÁN DE AUTENTICACIÓN (ANTI-LOOP): Si ya hay sesión activa, redirige según el rol
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      const userRole = (user.rol || user.role || '').toLowerCase();
      if (userRole === 'conductor' || userRole === 'moto' || userRole === 'mototaxi') {
        navigate('/conductor/dashboard', { replace: true });
      } else if (userRole === 'despachador') {
        navigate('/despachador/dashboard', { replace: true });
      } else if (userRole === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/pasajero/dashboard', { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  // 🎯 NORMALIZACIÓN DUAL DE IDENTIFICADOR (CORREO O CELULAR +57)
  const sanitizeIdentifier = (rawInput) => {
    const cleaned = (rawInput || '').trim();

    if (EMAIL_REGEX.test(cleaned.toLowerCase())) {
      return { type: 'email', value: cleaned.toLowerCase() };
    }

    // Normalización de número celular (remueve espacios, guiones y corchetes)
    const digitsOnly = cleaned.replace(/\D/g, '');

    // Si tiene 10 dígitos y empieza por 3 (Ej: 3001234567) -> normaliza a +57
    if (digitsOnly.length === 10 && digitsOnly.startsWith('3')) {
      return { type: 'phone', value: `+57${digitsOnly}`, rawPhone: digitsOnly };
    }

    // Si tiene 12 dígitos y empieza por 573 (Ej: 573001234567) -> normaliza a +57
    if (digitsOnly.length === 12 && digitsOnly.startsWith('573')) {
      return { type: 'phone', value: `+${digitsOnly}`, rawPhone: digitsOnly.slice(2) };
    }

    return { type: 'unknown', value: cleaned };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanPassword = password || '';
    if (!identifier || !cleanPassword) {
      setError('⚠️ Por favor ingresa tus credenciales de acceso.');
      return;
    }

    const processedId = sanitizeIdentifier(identifier);

    if (processedId.type === 'unknown') {
      setError('⚠️ Ingresa un correo electrónico válido o un número celular colombiano (10 dígitos).');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        login: processedId.value,
        identifier: processedId.value,
        email: processedId.type === 'email' ? processedId.value : undefined,
        telefono: processedId.type === 'phone' ? processedId.value : undefined,
        password: cleanPassword
      };

      if (typeof loginLocal === 'function') {
        const result = await loginLocal(payload);
        
        if (result && result.success) {
          const loggedUser = result.user || user;
          const userRole = (loggedUser?.rol || loggedUser?.role || '').toLowerCase();

          if (userRole === 'conductor' || userRole === 'moto' || userRole === 'mototaxi') {
            navigate('/conductor/dashboard', { replace: true });
          } else if (userRole === 'despachador') {
            navigate('/despachador/dashboard', { replace: true });
          } else if (userRole === 'admin') {
            navigate('/admin/dashboard', { replace: true });
          } else {
            navigate('/pasajero/dashboard', { replace: true });
          }
        } else {
          setError(result?.message || 'Credenciales incorrectas o cuenta inactiva.');
        }
      } else {
        throw new Error('Servicio de autenticación no inicializado correctamente.');
      }
    } catch (err) {
      console.error('🚨 [LOGIN-ERROR]:', err);
      const apiMsg = err?.response?.data?.message || err?.message || 'Error al conectar con la central de autenticación.';
      setError(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterRedirect = () => {
    if (roleParam) {
      const cleanRole = roleParam.toLowerCase();
      if (cleanRole === 'pasajero') {
        navigate('/register-pasajero');
      } else if (cleanRole === 'moto' || cleanRole === 'mototaxi') {
        navigate('/register-moto');
      } else if (cleanRole === 'intermunicipal') {
        navigate('/register-intermunicipal');
      } else if (cleanRole === 'despachador') {
        navigate('/register-despachador');
      } else {
        navigate('/register');
      }
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Ambientes de Luz Posterior (CIMCO-UI V9.3 Glassmorphism) */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#121214]/80 backdrop-blur-md border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        
        {/* Logo / Encabezado */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-cyan-500/20 border border-white/10 mb-3 shadow-inner">
            <Lock className="text-amber-400" size={22} />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-white">
            TAXIA <span className="text-amber-400">CIMCO</span>
          </h1>
          <p className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mt-1">
            Central de Control & Autenticación
          </p>
        </div>

        {/* Notificación de Error */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-start gap-3">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario de Autenticación Dual */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Identificador: Correo o Teléfono */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Mail size={12} className="text-amber-400" />
              <Phone size={12} className="text-cyan-400" />
              <span>Correo o Celular (+57)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Ej: usuario@cimco.co o 3001234567"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-sans"
                required
              />
            </div>
          </div>

          {/* Clave de Acceso */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <KeyRound size={12} className="text-amber-400" />
                <span>Contraseña</span>
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-sans pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Botón Submit */}
          <button
            type="submit"
            disabled={loading || authLoading}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            <LogIn size={16} />
            <span>{loading ? 'Sincronizando...' : 'Iniciar Sesión'}</span>
          </button>
        </form>

        {/* Acciones Secundarias */}
        <div className="grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-white/5 relative z-10">
          <button
            type="button"
            onClick={handleRegisterRedirect}
            className="flex flex-col items-center justify-center gap-2 py-2.5 px-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer outline-none group"
          >
            <UserPlus size={16} className="text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 group-hover:text-cyan-300 transition-colors">Crear Cuenta</span>
          </button>

          <Link
            to="/forgot-password"
            className="flex flex-col items-center justify-center gap-2 py-2.5 px-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-colors text-decoration-none group"
          >
            <HelpCircle size={16} className="text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 group-hover:text-amber-300 transition-colors">Recuperar Clave</span>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Login;