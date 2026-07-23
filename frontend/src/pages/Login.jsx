// Versión Arquitectura: V19.25 - Autenticación Híbrida con Regex Telefónico Estricto y CIMCO-UI V9.3
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\Login.jsx
 * Misión: Componente de autenticación unificado con soporte híbrido (celular/correo), 
 *         validación por máscara/Regex telefónica, visibilidad de contraseña interactiva 
 *         e intercepción de Query Strings (?role=).
 */

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldAlert, KeyRound, Terminal, UserPlus, HelpCircle, Phone, Mail } from 'lucide-react';

// Expresión regular para validar celulares (Soporta formato celular CO de 10 dígitos o formato int. E.164 de 7-15 dígitos)
const PHONE_REGEX = /^(\+?\d{1,4})?[3]\d{9}$|^(\+?\d{7,15})$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = () => {
  const { loginLocal } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // 📥 Intercepción del parámetro del QR / Enlace invertido
  const roleParam = searchParams.get('role')?.trim()?.toLowerCase();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Discriminación lógica del tipo de identificador
  const isEmailInput = identifier.includes('@');

  // Manejador del cambio de identificador con formateo/limpieza preventiva para celulares
  const handleIdentifierChange = (e) => {
    const rawVal = e.target.value;
    
    // Si contiene '@' o letras, asumimos correo; si son números/símbolo '+', aplicamos limpieza telefónica
    if (rawVal.includes('@') || /[a-zA-Z]/.test(rawVal)) {
      setIdentifier(rawVal);
    } else {
      // Filtrar únicamente dígitos numéricos y el símbolo + al inicio
      const phoneOnly = rawVal.replace(/(?!^\+)[^\d]/g, '');
      setIdentifier(phoneOnly);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const valorLimpio = identifier?.trim() || '';

    // 🛡️ GUARDA DE SEGURIDAD 1: Campos incompletos
    if (!valorLimpio || !password?.trim()) {
      setError("VARIABLES_CORE_INVALIDAS: Credenciales incompletas.");
      return;
    }

    // 🛡️ GUARDA DE SEGURIDAD 2: Validación estricta por Regex según el tipo de entrada
    if (isEmailInput) {
      if (!EMAIL_REGEX.test(valorLimpio.toLowerCase())) {
        setError("FORMATO_CORREO_INVALIDO: Estructura de correo electrónico no válida.");
        return;
      }
    } else {
      if (!PHONE_REGEX.test(valorLimpio)) {
        setError("FORMATO_CELULAR_INVALIDO: Debe ser un número celular válido (ej: 3001234567).");
        return;
      }
    }

    setLoading(true);

    try {
      // Middleware centralizado de autenticación con soporte para teléfono/email
      await loginLocal(valorLimpio, password);
      
      // Unificación de redireccionamiento post-login hacia la aduana central de AppRouter.jsx
      navigate('/');
    } catch (err) {
      console.error("🚨 [CIMCO-AUTH-HANDSHAKE] Denegado:", err);
      setError(err?.message || "ERROR_AUTENTICACION: Credenciales no registradas en el nodo central.");
    } finally {
      setLoading(false);
    }
  };

  // 🔄 MATRIZ OMNICANAL DE REDIRECCIÓN INTELIGENTE AL REGISTRO
  const handleRegisterRedirect = () => {
    switch (roleParam) {
      case 'intermunicipal':
        navigate('/register-intermunicipal');
        break;
      case 'moto':
      case 'motocarga':
      case 'mototaxi':
      case 'motoparrillero':
        navigate('/register-moto');
        break;
      case 'pasajero':
        navigate('/register-pasajero');
        break;
      case 'despachador':
        navigate('/register-despachador');
        break;
      case 'admin':
        navigate('/register-admin');
        break;
      default:
        navigate('/register');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      
      {/* VECTOR ESTÉTICO DE FONDO */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-yellow-500/[0.02] rounded-full blur-[100px] pointer-events-none z-0" />

      {/* CONTENEDOR CENTRAL NEO-GLASSMORPHISM */}
      <div className="w-full max-w-[420px] backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-8 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9)] relative z-10 transition-all duration-500">
        
        {/* ENCABEZADO DE CONSOLA */}
        <div className="text-center mb-8 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-500/[0.06] border border-cyan-500/10 rounded-full mb-4">
            <Terminal size={10} className="text-cyan-400 animate-pulse" />
            <span className="text-[9px] font-mono tracking-[0.25em] text-cyan-400 uppercase font-black">
              SECURE_HANDSHAKE_V19.25
            </span>
          </div>
          <h1 className="text-white font-black text-3xl tracking-tighter uppercase font-sans">
            TAXIA<span className="text-cyan-500 ml-1.5 font-bold tracking-widest text-2xl">CIMCO</span>
          </h1>
          <p className="text-zinc-500 font-mono text-[9px] uppercase tracking-[0.2em] mt-1.5 font-bold">
            Consola de Autenticación de Operadores
          </p>
        </div>

        {/* MONITOR DE ALERTAS DEL SISTEMA */}
        {error && (
          <div className="mb-6 flex items-start gap-3 bg-red-500/[0.04] border border-red-500/20 rounded-2xl p-4 transition-all duration-300">
            <ShieldAlert size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div className="font-mono text-[10px] uppercase font-bold tracking-wider text-red-400 leading-normal">
              <span className="block font-black text-red-500 mb-0.5">🚨 CRITICAL_ALERT:</span>
              {error}
            </div>
          </div>
        )}

        {/* NOTIFICACIÓN VISUAL DE DETECCIÓN DE FLUJO INVERTIDO DESDE QR */}
        {roleParam && (
          <div className="mb-6 flex items-center gap-3 bg-cyan-500/[0.04] border border-cyan-500/20 rounded-2xl p-3.5 transition-all duration-300">
            <UserPlus size={14} className="text-cyan-400 shrink-0" />
            <div className="font-mono text-[9px] uppercase font-black tracking-widest text-cyan-400">
              MODO INSCRIPCIÓN: [{roleParam.toUpperCase()}] HABILITADO
            </div>
          </div>
        )}

        {/* FORMULARIO DE ACCESO CORE */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* CAMPO: IDENTIFICADOR TELEFÓNICO / CORREO CON DETECCIÓN DINÁMICA DE ICONO */}
          <div className="space-y-1.5">
            <label className="text-zinc-500 font-mono text-[9px] uppercase tracking-widest font-black pl-1 flex items-center gap-1.5">
              {isEmailInput ? (
                <Mail size={11} className="text-cyan-400" />
              ) : (
                <Phone size={11} className="text-cyan-400" />
              )}
              <span>Identificador Operativo (Celular o Correo)</span>
            </label>
            <div className="relative group">
              <input 
                type="text"
                placeholder="EJ: 3001234567 O OPERADOR@CORREO.COM"
                disabled={loading}
                maxLength={isEmailInput ? 100 : 15}
                className="w-full bg-[#0a0a0c]/60 border border-white/5 rounded-xl py-3.5 px-4 text-zinc-100 font-mono text-xs placeholder:text-zinc-700 tracking-wider focus:outline-none focus:border-cyan-500/30 focus:bg-[#0f0f12] transition-all disabled:opacity-50"
                value={identifier}
                onChange={handleIdentifierChange}
                required
              />
            </div>
          </div>

          {/* CAMPO: LLAVE DE ACCESO */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center pl-1">
              <label className="text-zinc-500 font-mono text-[9px] uppercase tracking-widest font-black block">
                Clave de Acceso
              </label>
            </div>
            <div className="relative group">
              <input 
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                disabled={loading}
                className="w-full bg-[#0a0a0c]/60 border border-white/5 rounded-xl py-3.5 pl-4 pr-12 text-zinc-100 font-mono text-xs placeholder:text-zinc-700 tracking-[0.25em] focus:outline-none focus:border-cyan-500/30 focus:bg-[#0f0f12] transition-all disabled:opacity-50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                tabIndex="-1"
                disabled={loading}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors bg-transparent border-none outline-none cursor-pointer p-0 block disabled:opacity-30"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* DISPARADOR DE AUTENTICACIÓN */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 disabled:from-cyan-900/40 disabled:to-cyan-900/40 disabled:opacity-40 text-black font-mono font-black text-[10px] uppercase tracking-[0.3em] py-4 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
          >
            <KeyRound size={12} className="text-black shrink-0" />
            {loading ? "SÍNCRO_NODO..." : "ABRIR_SESION_TACTICA"}
          </button>

        </form>

        {/* PASARELA DE ENLACES PERIMETRALES */}
        <div className="mt-8 pt-6 border-t border-white/[0.05] grid grid-cols-2 gap-4 relative z-10">
          <button 
            type="button"
            onClick={handleRegisterRedirect}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/5 hover:border-cyan-500/30 bg-black/20 transition-all text-decoration-none group cursor-pointer w-full bg-transparent outline-none"
          >
            <UserPlus size={16} className="text-cyan-500 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 group-hover:text-cyan-400 transition-colors">Crear Cuenta</span>
          </button>
          <Link 
            to="/forgot-password" 
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/5 hover:border-yellow-500/30 bg-black/20 transition-all text-decoration-none group"
          >
            <HelpCircle size={16} className="text-yellow-500 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 group-hover:text-yellow-400 transition-colors">Soporte TI</span>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Login;