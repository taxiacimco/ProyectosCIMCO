// Versión Arquitectura: V19.30 - Parche de Autenticación Unificada y Manejo de Respuestas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\Login.jsx
 */

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldAlert, KeyRound, UserPlus, HelpCircle, Phone, Mail } from 'lucide-react';

const PHONE_REGEX = /^(\+?\d{1,4})?[3]\d{9}$|^(\+?\d{7,15})$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = () => {
  const { loginLocal } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const roleParam = searchParams.get('role')?.trim()?.toLowerCase();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isEmailInput = identifier.includes('@');

  const handleIdentifierChange = (e) => {
    const rawVal = e.target.value;
    if (rawVal.includes('@') || /[a-zA-Z]/.test(rawVal)) {
      setIdentifier(rawVal);
    } else {
      const phoneOnly = rawVal.replace(/(?!^\+)[^\d]/g, '');
      setIdentifier(phoneOnly);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const valorLimpio = identifier?.trim() || '';

    if (!valorLimpio || !password?.trim()) {
      setError("VARIABLES_CORE_INVALIDAS: Credenciales incompletas.");
      return;
    }

    if (isEmailInput) {
      if (!EMAIL_REGEX.test(valorLimpio.toLowerCase())) {
        setError("FORMATO_CORREO_INVALIDO: Estructura de correo electrónico no válida.");
        return;
      }
    } else {
      if (!PHONE_REGEX.test(valorLimpio)) {
        setError("FORMATO_CELULAR_INVALIDO: Debe ser un número celular válido de 10 dígitos.");
        return;
      }
    }

    setLoading(true);

    try {
      // Petición al proveedor de autenticación
      const res = await loginLocal(valorLimpio, password);
      
      if (res && res.success) {
        // Redirección inteligente basada en el rol recibido o el parámetro
        const userRole = (res.user?.role || res.user?.rol || roleParam || '').toLowerCase();
        
        if (userRole.includes('moto')) {
          navigate('/mototaxi/home');
        } else if (userRole.includes('pasajero')) {
          navigate('/pasajero/home');
        } else if (userRole.includes('despachador')) {
          navigate('/despachador/home');
        } else {
          navigate('/');
        }
      } else {
        // Muestra el mensaje devuelto por el backend
        setError(res?.message || "ERROR_AUTENTICACION: Credenciales no válidas o usuario no registrado.");
      }
    } catch (err) {
      console.error("🚨 [CIMCO-AUTH-HANDSHAKE] Denegado:", err);
      setError(err?.message || "ERROR_CONEXION: No se pudo conectar con el servidor central.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterRedirect = () => {
    switch (roleParam) {
      case 'intermunicipal':
        navigate('/register-intermunicipal?role=intermunicipal');
        break;
      case 'moto':
      case 'motocarga':
      case 'mototaxi':
      case 'motoparrillero':
        navigate(`/register-moto?role=${roleParam}`);
        break;
      case 'pasajero':
        navigate('/register-pasajero?role=pasajero');
        break;
      case 'despachador':
        navigate('/register-despachador?role=despachador');
        break;
      case 'admin':
        navigate('/register-admin?role=admin');
        break;
      default:
        navigate('/register');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="w-full max-w-[420px] backdrop-blur-md bg-[#1E293B]/80 border border-white/10 rounded-3xl p-8 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9)] relative z-10">
        
        <div className="text-center mb-8 relative">
          <div className="flex items-center justify-center gap-2 px-3 py-1 bg-cyan-950/40 border border-cyan-500/30 rounded-full w-fit mx-auto mb-4">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-semibold text-cyan-300 tracking-wide uppercase">
              Conexión Segura {roleParam ? `- ${roleParam.toUpperCase()}` : ''}
            </span>
          </div>
          <h1 className="text-white font-black text-3xl tracking-tighter uppercase font-sans">
            TAXIA<span className="text-cyan-500 ml-1.5 font-bold tracking-widest text-2xl">CIMCO</span>
          </h1>
          <p className="text-xs font-medium text-slate-400 text-center uppercase tracking-wider mt-2 mb-2">
            Centro Inteligente de Movilidad Colombia
          </p>
        </div>

        {error && (
          <div className="mb-6 flex flex-col gap-2 bg-red-500/[0.08] border border-red-500/30 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div className="font-mono text-[10px] uppercase font-bold tracking-wider text-red-400 leading-normal">
                <span className="block font-black text-red-500 mb-0.5">🚨 ACCESO DENEGADO:</span>
                {error}
              </div>
            </div>
            <div className="pt-2 border-t border-red-500/10 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-medium">¿Aún no estás registrado?</span>
              <button
                type="button"
                onClick={handleRegisterRedirect}
                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 underline bg-transparent border-none cursor-pointer p-0"
              >
                Crear cuenta ahora &rarr;
              </button>
            </div>
          </div>
        )}

        {roleParam && (
          <div className="mb-6 flex items-center gap-3 bg-cyan-500/[0.04] border border-cyan-500/20 rounded-2xl p-3.5">
            <UserPlus size={14} className="text-cyan-400 shrink-0" />
            <div className="font-mono text-[9px] uppercase font-black tracking-widest text-cyan-400">
              MODO INSCRIPCIÓN: [{roleParam.toUpperCase()}] HABILITADO
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-slate-400 text-xs font-medium pl-1 flex items-center gap-1.5">
              {isEmailInput ? <Mail size={13} className="text-cyan-400" /> : <Phone size={13} className="text-cyan-400" />}
              <span>Identificador Operativo (Celular o Correo)</span>
            </label>
            <input 
              type="text"
              placeholder="EJ: 3001234567 O OPERADOR@CORREO.COM"
              disabled={loading}
              maxLength={80}
              className="w-full bg-[#0f172a]/60 border border-white/10 rounded-xl py-3.5 px-4 text-slate-100 text-xs placeholder:text-slate-500 tracking-wider focus:outline-none focus:border-cyan-500/50 focus:bg-[#0f172a] transition-all disabled:opacity-50"
              value={identifier}
              onChange={handleIdentifierChange}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-400 text-xs font-medium block pl-1">
              Clave de Acceso
            </label>
            <div className="relative group">
              <input 
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                disabled={loading}
                className="w-full bg-[#0f172a]/60 border border-white/10 rounded-xl py-3.5 pl-4 pr-12 text-slate-100 text-xs placeholder:text-slate-500 tracking-[0.25em] focus:outline-none focus:border-cyan-500/50 focus:bg-[#0f172a] transition-all disabled:opacity-50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                tabIndex="-1"
                disabled={loading}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors bg-transparent border-none outline-none cursor-pointer p-0 block disabled:opacity-30"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed mt-2"
          >
            <KeyRound size={14} className="text-white shrink-0" />
            <span>{loading ? "Sincronizando..." : "Iniciar sesión"}</span>
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/[0.08] grid grid-cols-2 gap-4 relative z-10">
          <button 
            type="button"
            onClick={handleRegisterRedirect}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/10 hover:border-cyan-500/40 bg-slate-900/40 transition-all text-decoration-none group cursor-pointer w-full outline-none"
          >
            <UserPlus size={16} className="text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-slate-300 group-hover:text-cyan-300 transition-colors">Crear Cuenta</span>
          </button>
          <Link 
            to="/forgot-password" 
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/10 hover:border-yellow-500/40 bg-slate-900/40 transition-all text-decoration-none group"
          >
            <HelpCircle size={16} className="text-yellow-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-slate-300 group-hover:text-yellow-300 transition-colors">Soporte TI</span>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Login;