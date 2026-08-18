// Versión Arquitectura: V21.34 - Integración Backend Real OTP/Reset y Temporizador de Reenvío SMS
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\ForgotPassword.jsx
 * Misión: Implementar la recuperación de contraseña flexible por Número de Celular (Código SMS/WhatsApp) 
 *         o Correo Electrónico con conexión real al backend de API Central CIMCO / Firebase,
 *         e incorporación de temporizador defensivo de reenvío de OTP.
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
  Clock
} from 'lucide-react';

const PHONE_REGEX = /^(\+?\d{1,4})?[3]\d{9}$|^(\+?\d{7,15})$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPassword = () => {
  const navigate = useNavigate();

  // Estados de entrada y navegación interna
  const [method, setMethod] = useState('phone'); // 'phone' | 'email'
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [step, setStep] = useState(1); // 1: Solicitud, 2: Verificación de Código/SMS (para celular), 3: Éxito

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

    if (method === 'phone') {
      if (!PHONE_REGEX.test(valorLimpio)) {
        setError('Número de celular inválido. Ingrese un número válido de 10 dígitos (ej: 3001234567).');
        return;
      }
    } else {
      if (!EMAIL_REGEX.test(valorLimpio.toLowerCase())) {
        setError('Correo electrónico con formato incorrecto.');
        return;
      }
    }

    setLoading(true);

    try {
      if (method === 'phone') {
        // Petición real al Backend Central CIMCO para envío de SMS/WhatsApp OTP
        await api.post('/auth/forgot-password-sms', { phone: valorLimpio, celular: valorLimpio });
        setStep(2); // Avanza a la pantalla de verificación de código SMS
        setResendCooldown(60); // Inicia temporizador de 60 segundos
      } else {
        // Intentar envío vía Backend API o en su defecto mediante Firebase Auth
        try {
          await api.post('/auth/forgot-password', { email: valorLimpio.toLowerCase() });
        } catch (backendErr) {
          console.warn('⚠️ [RECOVERY-FALLBACK] Backend falló, intentando Firebase Auth:', backendErr);
          if (auth) {
            await sendPasswordResetEmail(auth, valorLimpio.toLowerCase());
          } else {
            throw backendErr;
          }
        }
        setStep(3); // Avanza a confirmación de correo enviado
      }
    } catch (err) {
      console.error('🚨 [RECOVERY-ERROR] Error en solicitud de recuperación:', err);
      const errMsg = err?.response?.data?.message || err?.data?.message || err?.message || 'Error al procesar la solicitud. Verifique los datos.';
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
    <div className="min-h-screen bg-[#080d1a] bg-gradient-to-br from-[#080d1a] via-[#0f172a] to-[#1e1b4b] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      
      {/* Luces de Fondo Glassmorphism */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Tarjeta Principal de Rescate */}
      <div className="w-full max-w-[440px] bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9)] relative z-10">
        
        {/* Encabezado */}
        <div className="text-center mb-6 relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-3">
            <KeyRound size={12} /> PROTOCOLO DE RESCATE DE CLAVE
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase font-sans">
            TAXIA <span className="text-cyan-400">CIMCO</span>
          </h1>
          <p className="text-[11px] text-slate-400 tracking-wider font-medium mt-1 uppercase">
            Restablecer acceso al nodo central
          </p>
        </div>

        {/* Banner de Mensaje de Error */}
        {error && (
          <div className="mb-5 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-3.5 text-xs text-red-200">
            <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div className="font-semibold">{error}</div>
          </div>
        )}

        {/* Banner de Mensaje de Éxito / Estado */}
        {successMsg && (
          <div className="mb-5 flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 text-xs text-emerald-200">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="font-semibold">{successMsg}</div>
          </div>
        )}

        {/* PASO 1: SELECCIÓN DE MÉTODO Y SOLICITUD */}
        {step === 1 && (
          <form onSubmit={handleSendResetRequest} className="space-y-5">
            
            {/* Pestañas para elegir Celular o Correo */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => { setMethod('phone'); setError(''); setSuccessMsg(''); setIdentifier(''); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  method === 'phone'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone size={14} />
                <span>POR CELULAR</span>
              </button>

              <button
                type="button"
                onClick={() => { setMethod('email'); setError(''); setSuccessMsg(''); setIdentifier(''); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  method === 'email'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mail size={14} />
                <span>POR CORREO</span>
              </button>
            </div>

            {/* Panel del Campo de Entrada */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-3">
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider flex items-center gap-2">
                {method === 'phone' ? <Phone size={14} className="text-cyan-400" /> : <Mail size={14} className="text-cyan-400" />}
                <span>{method === 'phone' ? 'NÚMERO DE CELULAR REGISTRADO' : 'CORREO ELECTRÓNICO REGISTRADO'}</span>
              </label>

              <input
                type={method === 'phone' ? 'tel' : 'email'}
                required
                disabled={loading}
                value={identifier}
                onChange={handleIdentifierChange}
                placeholder={method === 'phone' ? 'EJ: 3001234567' : 'EJ: OPERADOR@TAXICIMCO.COM'}
                className="w-full py-3.5 px-4 bg-slate-950/70 border border-slate-700/60 rounded-xl text-slate-100 placeholder-slate-500 text-xs font-mono tracking-wider focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all disabled:opacity-50"
              />

              <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
                {method === 'phone'
                  ? 'Transmitiremos un código de verificación por SMS o WhatsApp a su teléfono registrado para crear una nueva clave inmediatamente.'
                  : 'Transmitiremos un enlace seguro y temporal a su correo para restablecer sus credenciales.'}
              </p>
            </div>

            {/* Botón Acción */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {loading ? (
                <span>PROCESANDO...</span>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>{method === 'phone' ? 'ENVIAR CÓDIGO SMS' : 'TRANSMITIR ENLACE SEGURO'}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* PASO 2: VERIFICACIÓN CÓDIGO SMS Y NUEVA CLAVE (MÉTODO CELULAR) */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtpAndReset} className="space-y-4">
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-3">
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
                  className="w-full py-3 px-4 text-center bg-slate-950/80 border border-cyan-500/50 rounded-xl text-cyan-400 font-mono text-lg tracking-[0.4em] font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              {/* Temporizador y Botón de Reenvío */}
              <div className="flex justify-between items-center pt-1 px-1">
                <span className="text-[10px] text-slate-400 font-mono">¿No recibiste el código?</span>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || loading}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold font-mono text-cyan-400 hover:text-cyan-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
                  className="w-full py-3 px-4 bg-slate-950/80 border border-slate-700/60 rounded-xl text-white text-xs tracking-widest focus:outline-none focus:border-cyan-400"
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
                  className="w-full py-3 px-4 bg-slate-950/80 border border-slate-700/60 rounded-xl text-white text-xs tracking-widest focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
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
              {method === 'phone' ? '¡CLAVE RESTABLECIDA!' : '¡ENLACE TRANSMITIDO!'}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {method === 'phone'
                ? 'Su contraseña ha sido actualizada exitosamente. Ya puede acceder al sistema con su nuevo código.'
                : `Se ha enviado un correo a ${identifier} con las instrucciones exactas para redefinir su clave.`}
            </p>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full mt-2 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              IR AL INICIO DE SESIÓN
            </button>
          </div>
        )}

        {/* Footer / Volver al Login */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft size={14} />
            <span>Volver al menú de acceso</span>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ForgotPassword;