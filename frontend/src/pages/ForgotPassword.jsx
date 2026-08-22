// Versión Arquitectura: V21.38 - Integración Quirúrgica CIMCO-UI V9.3 & Psicología de Color (Slate/Emerald/Amber)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\ForgotPassword.jsx
 * Misión: Restablecimiento seguro y de alto rendimiento de acceso a la plataforma TAXIA CIMCO.
 * Lógica: Preserva la arquitectura dual de recuperación (Firebase Auth nativo por Correo $0 Costo + Backend SMS/WhatsApp OTP),
 *         fusilada quirúrgicamente con la interfaz de usuario CIMCO-UI V9.3 basada en Glassmorphism y Psicología del Color (Slate, Emerald & Amber).
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/config/api';
import { auth } from '@/config/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { 
  Phone, 
  Mail, 
  ArrowLeft, 
  ShieldCheck, 
  KeyRound, 
  CheckCircle2, 
  Smartphone,
  RotateCcw,
  Clock,
  Zap,
  AlertCircle
} from 'lucide-react';

const PHONE_REGEX = /^[3]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const navigate = useNavigate();

  // Estados de entrada y flujo de recuperación
  const [method, setMethod] = useState('email'); // 'email' | 'phone'
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [step, setStep] = useState(1); // 1: Solicitud, 2: Verificación OTP, 3: Éxito Final

  // Estados para validación de código SMS / WhatsApp y cambio de contraseña
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Temporizador de reenvío de código (en segundos)
  const [resendCooldown, setResendCooldown] = useState(0);

  // Efecto para controlar la cuenta regresiva del temporizador
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  const handleIdentifierChange = (e) => {
    const rawVal = e?.target?.value || '';
    if (method === 'phone') {
      const phoneOnly = rawVal.replace(/(?!^\+)[^\d]/g, '');
      setIdentifier(phoneOnly);
    } else {
      setIdentifier(rawVal);
    }
  };

  const handleSendResetRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const valorLimpio = identifier?.trim() || '';

    if (!valorLimpio) {
      setError('Por favor ingrese la información requerida.');
      return;
    }

    if (method === 'email') {
      if (!EMAIL_REGEX.test(valorLimpio.toLowerCase())) {
        setError('El correo electrónico ingresado no es válido.');
        return;
      }
    } else {
      if (!PHONE_REGEX.test(valorLimpio)) {
        setError('Número de celular inválido. Ingrese un número válido de 10 dígitos (ej: 3137508444).');
        return;
      }
    }

    setLoading(true);

    try {
      if (method === 'email') {
        // ⚡ MÉTODO GRATUITO $0 COSTOS: Firebase Auth NATIVO
        if (auth) {
          await sendPasswordResetEmail(auth, valorLimpio.toLowerCase());
          setSuccessMsg('Hemos enviado un enlace de restablecimiento a tu correo electrónico.');
          setStep(3); // Avanza a confirmación de correo enviado
        } else {
          // Fallback a API Backend si el SDK de Firebase Auth client no estuviera inicializado
          await api.post('/auth/forgot-password', { email: valorLimpio.toLowerCase() });
          setSuccessMsg('Hemos enviado un enlace de restablecimiento a tu correo electrónico.');
          setStep(3);
        }
      } else {
        // Petición al Backend Central CIMCO para envío de SMS/WhatsApp OTP
        await api.post('/auth/forgot-password-sms', { phone: valorLimpio, celular: valorLimpio });
        setStep(2); // Avanza a la pantalla de verificación de código SMS
        setResendCooldown(60); // Inicia temporizador de 60 segundos
      }
    } catch (err) {
      console.error('🚨 [RECOVERY-ERROR] Error en solicitud de recuperación:', err);
      
      let errMsg = 'Ocurrió un error al procesar la solicitud. Intenta nuevamente.';
      
      if (err?.code === 'auth/user-not-found') {
        errMsg = 'No existe ninguna cuenta registrada con este correo electrónico.';
      } else if (err?.code === 'auth/invalid-email') {
        errMsg = 'El correo electrónico ingresado no es válido.';
      } else if (err?.code === 'auth/too-many-requests') {
        errMsg = 'Demasiadas solicitudes en poco tiempo. Por favor espere unos minutos.';
      } else if (err?.response?.data?.message) {
        errMsg = err.response.data.message;
      } else if (err?.message) {
        errMsg = err.message;
      }

      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading) return;

    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password-sms', { phone: identifier, celular: identifier });
      setSuccessMsg('✅ Nuevo código reenviado exitosamente.');
      setResendCooldown(60);
    } catch (err) {
      console.error('🚨 [RESEND-ERROR] Error reexpidiendo OTP:', err);
      const errMsg = err?.response?.data?.message || err?.data?.message || err?.message || 'No se pudo reenviar el código. Intente de nuevo más tarde.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanOtp = otpCode?.trim() || '';

    if (!cleanOtp || cleanOtp.length < 4) {
      setError('Ingrese un código de verificación válido.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('La nueva clave debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      // Petición al Backend Central CIMCO para validar OTP y actualizar contraseña
      await api.post('/auth/reset-password-sms', { 
        phone: identifier, 
        celular: identifier, 
        code: cleanOtp, 
        otp: cleanOtp,
        newPassword 
      });
      setSuccessMsg('Su contraseña ha sido actualizada exitosamente.');
      setStep(3);
    } catch (err) {
      console.error('🚨 [RESET-ERROR] Error al restablecer clave con OTP:', err);
      const errMsg = err?.response?.data?.message || err?.data?.message || err?.message || 'Código de verificación incorrecto o expirado.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      
      {/* Resplandores ambientales de fondo (Psicología de Seguridad + Agilidad) */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Tarjeta Principal Glassmorphism CIMCO-UI V9.3 */}
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/50 relative z-10 transition-all duration-300">
        
        {/* Insignia Superior de Seguridad */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide uppercase">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>CONEXIÓN CIFRADA Y SEGURA</span>
          </div>
        </div>

        {/* Encabezado Principal */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-white mb-1">
            TAXIA <span className="text-amber-500">CIMCO</span>
          </h1>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            RESTABLECER ACCESO AL NODO CENTRAL
          </p>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Mensaje de Éxito / Feedback */}
        {successMsg && step !== 3 && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* PASO 1: SELECCIÓN DE MÉTODO Y SOLICITUD */}
        {step === 1 && (
          <form onSubmit={handleSendResetRequest} className="space-y-5">
            
            {/* Selector Píldora de Método */}
            <div className="grid grid-cols-2 gap-1 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800/80 mb-6">
              <button
                type="button"
                onClick={() => { setMethod('email'); setError(''); setSuccessMsg(''); setIdentifier(''); }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  method === 'email'
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>POR CORREO</span>
              </button>

              <button
                type="button"
                onClick={() => { setMethod('phone'); setError(''); setSuccessMsg(''); setIdentifier(''); }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  method === 'phone'
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>POR CELULAR</span>
              </button>
            </div>

            {/* Campo de Entrada */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {method === 'email' ? 'CORREO ELECTRÓNICO REGISTRADO' : 'NÚMERO CELULAR REGISTRADO'}
                </label>
                {method === 'email' && (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> SIN COSTO
                  </span>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  {method === 'email' ? <Mail className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                </div>
                <input
                  type={method === 'email' ? 'email' : 'tel'}
                  required
                  disabled={loading}
                  value={identifier}
                  onChange={handleIdentifierChange}
                  placeholder={method === 'email' ? 'operador@taxiacimco.com' : '3137508444'}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all duration-200 disabled:opacity-50"
                />
              </div>

              <p className="mt-2 text-[11px] text-slate-500 leading-normal">
                {method === 'email'
                  ? 'Transmitiremos un enlace seguro e instantáneo a tu correo para restablecer tus credenciales mediante Firebase Auth.'
                  : 'Transmitiremos un código de verificación SMS de 6 dígitos a tu celular registrado para validar tu identidad.'}
              </p>
            </div>

            {/* Botón Principal CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 active:scale-[0.99] text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>{method === 'email' ? 'TRANSMITIR ENLACE SEGURO' : 'ENVIAR CÓDIGO DE ACCESO'}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* PASO 2: VERIFICACIÓN CÓDIGO SMS Y NUEVA CLAVE */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtpAndReset} className="space-y-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                  CÓDIGO RECIBIDO POR SMS ({identifier})
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full py-3 px-4 text-center bg-slate-950 border border-amber-500/50 rounded-xl text-amber-400 font-mono text-lg tracking-[0.4em] font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Temporizador y Reenvío */}
              <div className="flex justify-between items-center pt-1 px-1">
                <span className="text-[10px] text-slate-500 font-mono">¿No recibiste el código?</span>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || loading}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold font-mono text-amber-500 hover:text-amber-400 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {resendCooldown > 0 ? (
                    <>
                      <Clock className="w-3 h-3 animate-spin text-slate-500" />
                      <span>Reenviar en {resendCooldown}s</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3 h-3" />
                      <span>Reenviar código</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 mt-2">
                  NUEVA CLAVE DE ACCESO
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full py-3 px-4 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs tracking-widest focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                  CONFIRMAR NUEVA CLAVE
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full py-3 px-4 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs tracking-widest focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.99] text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>GUARDAR NUEVA CLAVE Y ENTRAR</span>
              )}
            </button>
          </form>
        )}

        {/* PASO 3: CONFIRMACIÓN Y ÉXITO */}
        {step === 3 && (
          <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-white uppercase tracking-wide">
              {method === 'email' ? '¡ENLACE TRANSMITIDO!' : '¡CLAVE RESTABLECIDA!'}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed font-sans px-2">
              {method === 'email'
                ? `Hemos transmitido un enlace de restablecimiento seguro a tu correo (${identifier}). Revisa tu bandeja de entrada o carpeta de spam para redefinir tu contraseña.`
                : 'Su contraseña ha sido actualizada exitosamente en el sistema. Ya puede acceder con sus nuevas credenciales.'}
            </p>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full mt-2 py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-amber-500/20 cursor-pointer"
            >
              IR AL INICIO DE SESIÓN
            </button>
          </div>
        )}

        {/* Retorno al Menú Principal */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors duration-200 uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>VOLVER AL MENÚ DE ACCESO</span>
          </Link>
        </div>

      </div>
    </div>
  );
}