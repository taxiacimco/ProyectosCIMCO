// Versión Arquitectura: V11.2 - Anti-Loop Navigation Defense & Anti-Re-render Guard
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\Login.jsx
 * Misión: Pantalla de Autenticación de Usuarios con protección anti-bucle mediante redirectLockRef,
 * persistencia inteligente del último identificador, soporte de AbortController,
 * sanitización de prefijo +57 y cumplimiento estricto del estándar CIMCO-UI V9.3.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import authService from '@/services/authService';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  UserPlus, 
  KeyRound, 
  ShieldCheck, 
  ArrowRight, 
  AlertTriangle,
  Info
} from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORAGE_KEY = 'cimco_last_user_identifier';

const Login = () => {
  const authContext = useAuth() || {};
  const loginLocal = authContext.loginLocal;
  const user = authContext.user || null;
  const authLoading = authContext.loading || false;
  const isAuthenticated = authContext.isAuthenticated || !!user;

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const roleParam = searchParams ? searchParams.get('role')?.trim()?.toLowerCase() : null;
  
  // 💡 Recuperación inteligente: Prioriza el estado de navegación (registro) y como respaldo usa localStorage
  const [identifier, setIdentifier] = useState(() => {
    return location.state?.phone || localStorage.getItem(STORAGE_KEY) || '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const abortControllerRef = useRef(null);
  const redirectLockRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (authLoading) return;

    if (isAuthenticated && user && !redirectLockRef.current) {
      redirectLockRef.current = true; // Bloquea re-redirecciones múltiples en el mismo ciclo de vida
      const activeRole = (user?.rol || user?.role || 'pasajero').toString().toLowerCase();

      if (!controller.signal.aborted) {
        if (['conductor', 'moto', 'mototaxi', 'motocarga', 'conductor_moto'].includes(activeRole)) {
          navigate('/conductor/home', { replace: true });
        } else if (activeRole === 'despachador') {
          navigate('/despachador/dashboard', { replace: true });
        } else if (['admin', 'superadmin', 'ceo', 'administrador'].includes(activeRole)) {
          navigate('/admin/dashboard', { replace: true });
        } else if (activeRole === 'central') {
          navigate('/central/dashboard', { replace: true });
        } else {
          navigate('/pasajero/home', { replace: true });
        }
      }
    }

    return () => {
      controller.abort();
    };
  }, [user, isAuthenticated, authLoading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    let cleanIdentifier = identifier ? String(identifier).trim() : '';
    let cleanPassword = password ? String(password) : '';

    // Sanitización de prefijo +57
    if (/^\+?573\d{9}$/.test(cleanIdentifier)) {
      cleanIdentifier = cleanIdentifier.replace(/^\+?57/, '');
    } else if (cleanIdentifier.startsWith('+57')) {
      cleanIdentifier = cleanIdentifier.slice(3).trim();
    } else if (cleanIdentifier.startsWith('57') && cleanIdentifier.length === 12) {
      cleanIdentifier = cleanIdentifier.slice(2).trim();
    }

    if (!cleanIdentifier || !cleanPassword.trim()) {
      setError('Por favor ingresa tu correo/celular y tu contraseña.');
      return;
    }

    if (cleanIdentifier.includes('@')) {
      if (!EMAIL_REGEX.test(cleanIdentifier)) {
        setError('El formato del correo electrónico es inválido.');
        return;
      }
    } else if (/^\d+$/.test(cleanIdentifier)) {
      if (!/^[3]\d{9}$/.test(cleanIdentifier)) {
        setError('El número celular debe contener exactamente 10 dígitos (comenzando en 3, sin +57).');
        return;
      }
    }

    setLoading(true);

    try {
      let resData = null;

      if (typeof loginLocal === 'function') {
        resData = await loginLocal(cleanIdentifier, cleanPassword);
      } else if (authService && typeof authService.login === 'function') {
        resData = await authService.login(cleanIdentifier, cleanPassword);
      } else {
        throw new Error('El servicio de autenticación no está disponible en este entorno.');
      }

      if (resData?.token || resData?.success || resData?.user) {
        // 💾 Guardar o limpiar localStorage según la preferencia de sesión
        if (remember && cleanIdentifier) {
          localStorage.setItem(STORAGE_KEY, cleanIdentifier);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }

        const userData = resData.user || resData.data?.user || {};
        const userRole = (userData?.rol || userData?.role || roleParam || 'pasajero').toString().toLowerCase();

        redirectLockRef.current = true; // Previene colisiones con el useEffect post-login

        if (['conductor', 'moto', 'mototaxi', 'motocarga', 'conductor_moto'].includes(userRole)) {
          navigate('/conductor/home', { replace: true });
        } else if (userRole === 'despachador') {
          navigate('/despachador/dashboard', { replace: true });
        } else if (['admin', 'superadmin', 'ceo', 'administrador'].includes(userRole)) {
          navigate('/admin/dashboard', { replace: true });
        } else if (userRole === 'central') {
          navigate('/central/dashboard', { replace: true });
        } else {
          navigate('/pasajero/home', { replace: true });
        }
      } else {
        setError(resData?.message || 'Error al validar credenciales en la central.');
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      const mensajeServidor = err?.response?.data?.message || err?.message || 'No se pudo conectar con la central de control.';
      setError(mensajeServidor);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterRedirect = () => {
    if (roleParam) {
      navigate(`/register?role=${roleParam}`);
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/50 to-amber-50/30 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/85 backdrop-blur-xl border border-slate-200/80 p-8 sm:p-10 rounded-3xl shadow-2xl shadow-indigo-950/10 relative z-10 transition-all duration-300">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-50 border border-amber-200/80 rounded-2xl mb-4 text-amber-600 shadow-sm">
            <Lock size={26} />
          </div>
          <h1 className="text-slate-900 font-black text-3xl tracking-tight uppercase flex items-center justify-center gap-1.5">
            TAXIA <span className="text-amber-500 font-black">CIMCO</span>
          </h1>
          <p className="text-slate-500 font-mono text-[10px] tracking-widest uppercase mt-1 font-bold">
            Central de Control & Autenticación
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-mono font-medium flex items-center gap-3 animate-in fade-in">
            <AlertTriangle size={16} className="shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-800 font-mono text-[11px] uppercase tracking-wider font-black flex items-center gap-1.5">
                <Mail size={13} className="text-amber-600 shrink-0" /> Correo o Celular
              </label>
              <span className="text-[10px] font-mono font-black text-amber-950 bg-amber-100 border border-amber-300/90 px-2 py-0.5 rounded-md shadow-sm">
                10 dígitos (Sin +57)
              </span>
            </div>

            <div className="relative">
              <input 
                type="text" 
                placeholder="usuario@cimco.co o 3001234567" 
                className="w-full bg-slate-50 border border-slate-300 px-4 py-3.5 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-xs font-mono shadow-sm" 
                value={identifier} 
                onChange={(e) => setIdentifier(e.target.value)} 
                required 
              />
            </div>
            
            <p className="text-[10px] text-slate-600 font-mono font-semibold flex items-center gap-1 pt-0.5">
              <Info size={12} className="text-amber-600 shrink-0" />
              <span>Para celular ingresa directamente los 10 números sin el prefijo +57.</span>
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-700 font-mono text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-amber-600" /> Contraseña
            </label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••" 
                className="w-full bg-slate-50/80 border border-slate-200 pl-4 pr-11 py-3.5 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-xs shadow-sm" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-slate-600 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={remember} 
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500/20 cursor-pointer"
              />
              <span>Recordar identificación en este equipo</span>
            </label>
          </div>

          <button 
            type="submit" 
            disabled={loading || authLoading} 
            className="w-full py-4 text-xs font-mono uppercase tracking-[0.2em] rounded-xl font-black text-white bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 shadow-xl shadow-orange-500/20 active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-wait cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              "AUTENTICANDO..."
            ) : (
              <>
                <span>INICIAR SESIÓN</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-slate-200/80">
          <button 
            type="button"
            onClick={handleRegisterRedirect} 
            className="flex flex-col items-center justify-center p-3 bg-slate-50/80 hover:bg-amber-50/60 border border-slate-200 rounded-xl group transition-all text-decoration-none cursor-pointer outline-none"
          >
            <UserPlus size={18} className="text-slate-500 group-hover:text-amber-600 transition-colors mb-1" />
            <span className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">
              Crear Cuenta
            </span>
          </button>

          <Link 
            to="/forgot-password" 
            className="flex flex-col items-center justify-center p-3 bg-slate-50/80 hover:bg-amber-50/60 border border-slate-200 rounded-xl group transition-all text-decoration-none"
          >
            <KeyRound size={18} className="text-slate-500 group-hover:text-amber-600 transition-colors mb-1" />
            <span className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">
              Recuperar Clave
            </span>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Login;