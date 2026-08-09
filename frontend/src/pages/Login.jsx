// Versión Arquitectura: V19.31 - Persistencia de Identificador Operativo y Rediseño Glassmorphism CIMCO-UI
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\Login.jsx
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldAlert, KeyRound, UserPlus, HelpCircle, Phone, Mail, Shield, Lock, LogIn } from 'lucide-react';

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

  // Persistencia: Cargar el último identificador guardado al montar el componente
  useEffect(() => {
    const ultimoIdentificador = localStorage.getItem('taxia_ultimo_identificador');
    if (ultimoIdentificador) {
      setIdentifier(ultimoIdentificador);
    }
  }, []);

  const isEmailInput = identifier?.includes('@') || false;

  const handleIdentifierChange = (e) => {
    const rawVal = e.target.value || '';
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

    // Persistencia: Guardar identificador en localStorage inmediatamente
    localStorage.setItem('taxia_ultimo_identificador', valorLimpio);

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
    <div className="min-h-screen bg-[#080d1a] bg-gradient-to-br from-[#080d1a] via-[#0f172a] to-[#1e1b4b] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      
      {/* Resplandores de fondo para efecto tecnológico */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Tarjeta Principal de Login CIMCO-UI Glassmorphism */}
      <div className="w-full max-w-[420px] bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9)] relative z-10">
        
        {/* Encabezado e Identidad */}
        <div className="text-center mb-8 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Shield className="w-3.5 h-3.5" />
            <span>Conexión Segura {roleParam ? `- ${roleParam.toUpperCase()}` : 'TLS'}</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1 uppercase font-sans">
            TAXIA <span className="text-cyan-400 font-bold tracking-widest text-2xl">CIMCO</span>
          </h1>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mt-1">
            Centro Inteligente de Movilidad Colombia
          </p>
        </div>

        {/* Banner de Error */}
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

        {/* Banner de Modo Inscripción por Rol */}
        {roleParam && (
          <div className="mb-6 flex items-center gap-3 bg-cyan-500/[0.04] border border-cyan-500/20 rounded-2xl p-3.5">
            <UserPlus size={14} className="text-cyan-400 shrink-0" />
            <div className="font-mono text-[9px] uppercase font-black tracking-widest text-cyan-400">
              MODO INSCRIPCIÓN: [{roleParam.toUpperCase()}] HABILITADO
            </div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Campo Identificador Operativo */}
          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              {isEmailInput ? <Mail size={13} className="text-cyan-400" /> : <Phone size={13} className="text-cyan-400" />}
              <span>Identificador Operativo (Celular o Correo)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                disabled={loading}
                maxLength={80}
                value={identifier}
                onChange={handleIdentifierChange}
                placeholder="EJ: 3001234567 O OPERADOR@CORREO.COM"
                className="w-full py-3.5 px-4 bg-slate-950/60 border border-slate-700/60 rounded-xl text-slate-100 placeholder-slate-500 text-xs tracking-wider focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all duration-200 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Campo Clave de Acceso */}
          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
              Clave de Acceso
            </label>
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full py-3.5 pl-4 pr-12 bg-slate-950/60 border border-slate-700/60 rounded-xl text-slate-100 placeholder-slate-500 text-xs tracking-[0.25em] focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all duration-200 disabled:opacity-50"
              />
              <button
                type="button"
                tabIndex="-1"
                disabled={loading}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 hover:text-cyan-400 transition-colors bg-transparent border-none outline-none cursor-pointer p-0 disabled:opacity-30"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Botón Principal de Acción */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed transform active:scale-95"
          >
            {loading ? (
              <KeyRound size={14} className="text-white shrink-0 animate-spin" />
            ) : (
              <LogIn size={14} className="text-white shrink-0" />
            )}
            <span>{loading ? "Sincronizando..." : "Iniciar sesión"}</span>
          </button>
        </form>

        {/* Acciones Secundarias */}
        <div className="grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-slate-800 relative z-10">
          <button
            type="button"
            onClick={handleRegisterRedirect}
            className="flex flex-col items-center justify-center gap-2 py-2.5 px-3 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer outline-none group"
          >
            <UserPlus size={16} className="text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-slate-300 group-hover:text-cyan-300 transition-colors">Crear Cuenta</span>
          </button>

          <Link
            to="/forgot-password"
            className="flex flex-col items-center justify-center gap-2 py-2.5 px-3 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-colors text-decoration-none group"
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