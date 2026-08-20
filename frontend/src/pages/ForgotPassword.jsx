// Versión Arquitectura: V21.37 - Integración Quirúrgica CIMCO-UI V9.3 y Firebase Auth
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\ForgotPassword.jsx
 * Misión: Restablecimiento seguro y sin costos de facturación mediante Firebase Auth (sendPasswordResetEmail),
 *         seleccionado por defecto para evitar tarifas de mensajería SMS, manteniendo el método secundario de SMS/WhatsApp.
 * UI Standard: CIMCO-UI V9.3 Pure Glassmorphism.
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
  ShieldAlert, 
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

  // Estados de entrada y navegación interna (Correo predeterminado por costo $0)
  const [method, setMethod] = useState('email'); // 'email' | 'phone'
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [step, setStep] = useState(1); // 1: Solicitud, 2: Verificación de Código/SMS, 3: Éxito

  // Estados para validación de código SMS / WhatsApp
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
        setError('Número de celular inválido. Ingrese un número válido de 10 dígitos (ej: 3001234567).');
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
          // Fallback a API Backend si el SDK de Firebase Auth client no estuviera cargado
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
      setResendCooldown(60); // Reiniciar temporizador
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
      // Petición real al Backend Central CIMCO para validar OTP y actualizar la contraseña
      await api.post('/auth/reset-password-sms', { 
        phone: identifier, 
        celular: identifier, 
        code: cleanOtp, 
        otp: cleanOtp,
        newPassword 
      });
      setSuccessMsg('Su contraseña ha sido actualizada exitosamente.');
      setStep(3); // Éxito
    } catch (err) {
      console.error('🚨 [RESET-ERROR] Error al restablecer clave con OTP:', err);
      const errMsg = err?.response?.data?.message || err?.data?.message || err?.message || 'Código de verificación incorrecto o expirado.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/50 via-slate-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      
      {/* Atmósfera de Agilidad y Seguridad */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Tarjeta Principal de Rescate CIMCO-UI V9.3 */}
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 overflow-hidden">
        
        {/* Encabezado de Marca y Seguridad */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>CONEXIÓN CIFRADA Y SEGURA</span>
          </div>

          <h1 className="text-3xl font-black text-white tracking-tight">
            TAXIA <span className="text-amber-500">CIMCO</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Restablecer acceso al nodo central
          </p>
        </div>

        {/* Banner de Mensaje de Error */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-300 text-xs font-medium animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Banner de Mensaje de Éxito / Estado */}
        {successMsg && step !== 3 && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-3 text-emerald-300 text-xs font-medium animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* PASO 1: SELECCIÓN DE MÉTODO Y SOLICITUD */}
        {step === 1 && (
          <form onSubmit={handleSendResetRequest} className="space-y-6">
            
            {/* Pestañas para elegir Correo (Predeterminado $0) o Celular */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => { setMethod('email'); setError(''); setSuccessMsg(''); setIdentifier(''); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  method === 'email'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mail size={14} />
                <span>POR CORREO</span>
              </button>

              <button
                type="button"
                onClick={() => { setMethod('phone'); setError(''); setSuccessMsg(''); setIdentifier(''); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  method === 'phone'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone size={14} />
                <span>POR CELULAR</span>
              </button>
            </div>

            {/* Panel del Campo de Entrada */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  {method === 'email' ? <Mail className="w-4 h-4 text-amber-500" /> : <Phone className="w-4 h-4 text-amber-500" />}
                  {method === 'email' ? 'CORREO ELECTRÓNICO REGISTRADO' : 'NÚMERO DE CELULAR REGISTRADO'}
                </label>
                {method === 'email' && (
                  <span className="text-emerald-400 text-[10px] bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                    <Zap size={10} /> SIN COSTO
                  </span>
                )}
              </div>

              <div className="relative">
                {method === 'email' ? (
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                ) : (
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                )}
                <input
                  type={method === 'email' ? 'email' : 'tel'}
                  required
                  disabled={loading}
                  value={identifier}
                  onChange={handleIdentifierChange}
                  placeholder={method === 'email' ? 'operador@taxiacimco.com' : '3001234567'}
                  className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-100 placeholder-slate-600 rounded-2xl pl-12 pr-4 py-3.5 text-sm transition-all outline-none disabled:opacity-50"
                />
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed pl-1">
                {method === 'email'
                  ? 'Transmitiremos un enlace seguro e instantáneo a tu correo para restablecer tus credenciales mediante Firebase Auth.'
                  : 'Transmitiremos un código de verificación por SMS o WhatsApp a tu teléfono registrado para restablecer tus credenciales.'}
              </p>
            </div>

            {/* Botón Acción */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>
                {loading 
                  ? 'TRANSMITIENDO ENLACE...' 
                  : method === 'email' 
                    ? 'TRANSMITIR ENLACE SEGURO' 
                    : 'ENVIAR CÓDIGO SMS'}
              </span>
            </button>
          </form>
        )}

        {/* PASO 2: VERIFICACIÓN CÓDIGO SMS Y NUEVA CLAVE (MÉTODO CELULAR) */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtpAndReset} className="space-y-4">
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                  CÓDIGO RECIBIDO POR SMS/WHATSAPP ({identifier})
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full py-3 px-4 text-center bg-slate-950/90 border border-amber-500/50 rounded-xl text-amber-400 font-mono text-lg tracking-[0.4em] font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Temporizador y Botón de Reenvío */}
              <div className="flex justify-between items-center pt-1 px-1">
                <span className="text-[10px] text-slate-400 font-mono">¿No recibiste el código?</span>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || loading}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold font-mono text-amber-400 hover:text-amber-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {resendCooldown > 0 ? (
                    <>
                      <Clock size={12} className="animate-spin text-slate-500" />
                      <span>Reenviar en {resendCooldown}s</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw size={12} />
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
                  className="w-full py-3 px-4 bg-slate-950/90 border border-slate-700/80 rounded-xl text-white text-xs tracking-widest focus:outline-none focus:border-amber-500"
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
                  className="w-full py-3 px-4 bg-slate-950/90 border border-slate-700/80 rounded-xl text-white text-xs tracking-widest focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {loading ? 'ACTUALIZANDO...' : 'GUARDAR NUEVA CLAVE Y ENTRAR'}
            </button>
          </form>
        )}

        {/* PASO 3: PANTALLA DE ÉXITO O CORREO ENVIADO */}
        {step === 3 && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 size={32} />
            </div>

            <h3 className="text-lg font-bold text-white uppercase tracking-wide">
              {method === 'email' ? '¡ENLACE TRANSMITIDO!' : '¡CLAVE RESTABLECIDA!'}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {method === 'email'
                ? `Hemos enviado un enlace de restablecimiento a tu correo electrónico (${identifier}). Revisa tu bandeja de entrada o spam para redefinir tu contraseña.`
                : 'Su contraseña ha sido actualizada exitosamente. Ya puede acceder al sistema con su nuevo código.'}
            </p>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full mt-2 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg shadow-amber-500/20"
            >
              IR AL INICIO DE SESIÓN
            </button>
          </div>
        )}

        {/* Retorno al Menú */}
        <div className="mt-8 text-center pt-6 border-t border-slate-800/60">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>VOLVER AL MENÚ DE ACCESO</span>
          </Link>
        </div>

      </div>
    </div>
  );
}