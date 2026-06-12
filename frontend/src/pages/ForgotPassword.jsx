// Versión Arquitectura: V17.9 - Unificación Estructural y Blindaje Predictivo OTP (CIMCO-UI V9.3)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\ForgotPassword.jsx
 * Misión: Asegurar la simetría absoluta de payloads con el controlador central Express y mapeo predictivo de códigos HTTP.
 * Seguridad: Implementación de capas predictivas (404, 400, 429, 503) para evitar bypass de flujos reactivos.
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/config/api';
import { ShieldAlert, KeyRound, CheckCircle2 } from 'lucide-react';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [inputUser, setInputUser] = useState('');
    const [codigo, setCodigo] = useState('');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            // 🛡️ GUARDA DE SEGURIDAD: Validación estructural preventiva antes de peticionar
            if (!inputUser || inputUser.trim() === '') {
                throw new Error("El identificador de la unidad (teléfono o email) no puede estar vacío.");
            }

            console.log('📡 [CIMCO-TELEMETRY] Solicitando firma OTP a /api/auth/forgot-password...');
            
            // Unificación estructural del payload simétrico para el backend Express
            const payload = { 
                inputUser: inputUser.trim() 
            };

            await api.post('/api/auth/forgot-password', payload);
            
            setSuccess('Código OTP generado con éxito. Revisa la consola de tu servidor Express para obtener el token.');
            setStep(2);
        } catch (err) {
            console.error("❌ [CIMCO-AUTH] Falla al solicitar OTP:", err);
            
            const status = err.response?.status;
            const mensajeBackend = err.response?.data?.message;

            // LÓGICA INTELIGENTE 🧠: Mapeo de errores por códigos de estado HTTP
            switch (status) {
                case 404:
                    setError("El identificador no se encuentra registrado en el nodo central.");
                    break;
                case 400:
                    setError("Estructura de payload inválida. Verifique los datos de la unidad.");
                    break;
                case 429:
                    setError("Tráfico sospechoso detectado. Solicitudes de OTP bloqueadas temporalmente.");
                    break;
                case 503:
                    setError("El servicio de mensajería/bóveda no está disponible temporalmente.");
                    break;
                default:
                    setError(mensajeBackend || err.message || "Error al conectar con el nodo central de autenticación.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (loading) return;
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            // 🛡️ GUARDA DE SEGURIDAD: Verificación de estados de consistencia locales
            if (!inputUser || inputUser.trim() === '') {
                throw new Error("Identificador de usuario corrupto o inválido en el estado.");
            }
            if (!codigo || codigo.trim() === '') {
                throw new Error("El código OTP de simulación es requerido para firmar el cambio.");
            }
            if (!nuevaPassword || nuevaPassword.length < 6) {
                throw new Error("La nueva clave perimetral debe contener un mínimo de 6 caracteres.");
            }

            console.log('📡 [CIMCO-TELEMETRY] Transmitiendo actualización de credencial a /api/auth/reset-password...');

            // Unificación estructural del payload simétrico para el backend Express
            const payload = {
                inputUser: inputUser.trim(),
                codigo: codigo.trim(),
                nuevaPassword: nuevaPassword
            };

            await api.post('/api/auth/reset-password', payload);

            setSuccess('🔑 Credencial actualizada con éxito en la base de datos central. Redirigiendo a consola de acceso...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            console.error("❌ [CIMCO-AUTH] Falla en reseteo de contraseña:", err);
            
            const status = err.response?.status;
            const mensajeBackend = err.response?.data?.message;

            // LÓGICA INTELIGENTE 🧠: Mapeo de errores en segundo paso de restablecimiento
            switch (status) {
                case 400:
                    setError(mensajeBackend || "Código OTP malformado o expirado.");
                    break;
                case 401:
                    setError("Código OTP inválido. Firma de seguridad rechazada.");
                    break;
                case 429:
                    setError("Demasiados intentos fallidos. El token ha sido invalidado por seguridad.");
                    break;
                case 503:
                    setError("Transacción interrumpida. La base de datos central no responde.");
                    break;
                default:
                    setError(mensajeBackend || err.message || "El código ingresado es inválido o ya ha expirado.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#09090b] flex items-center justify-center p-4 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
            <div className="w-full max-w-md backdrop-blur-xl bg-[#121214]/80 border border-white/5 rounded-2xl p-8 shadow-[0_0_50px_-12px_rgba(6,182,212,0.15)] relative">
                
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/[0.06] border border-cyan-500/15 rounded-full mb-3">
                        <span className={`h-1.5 w-1.5 rounded-full ${loading ? 'bg-amber-400 animate-ping' : 'bg-cyan-400 animate-pulse'}`} />
                        <span className="text-[10px] font-mono tracking-[0.15em] text-cyan-400 uppercase">Bóveda de Seguridad</span>
                    </div>
                    <h2 className="text-white font-black text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">RECOVERY NODE</h2>
                    <p className="text-zinc-500 text-xs font-mono tracking-wide mt-1 uppercase text-[10px]">Restablecimiento de Credenciales</p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-950/30 border border-red-500/20 text-red-400 text-[10px] font-mono p-3.5 rounded-xl uppercase tracking-widest flex items-center gap-2 animate-in fade-in duration-300">
                        <ShieldAlert size={14} className="text-red-400 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="mb-6 bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono p-3.5 rounded-xl uppercase tracking-widest flex items-center gap-2 animate-in fade-in duration-300">
                        <CheckCircle2 size={14} className="text-cyan-400 flex-shrink-0" />
                        <span>{success}</span>
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleRequestOtp} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest pl-1">Identificador de la Unidad</label>
                            <input 
                                type="text" 
                                placeholder="Ej. 3003503249 o Correo" 
                                className="w-full bg-[#131318]/90 border border-white/[0.06] p-4 rounded-xl text-zinc-100 text-sm focus:border-cyan-500/40 focus:bg-[#16161f] outline-none font-mono transition-all"
                                value={inputUser}
                                onChange={(e) => setInputUser(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-6 py-4 text-xs font-mono uppercase tracking-[0.25em] rounded-xl bg-zinc-100 text-black hover:bg-cyan-500 hover:text-white font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Generando OTP..." : "Solicitar Código OTP"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest pl-1">Código OTP de Simulación</label>
                            <input 
                                type="text" 
                                placeholder="Ingresa el código de 6 dígitos" 
                                className="w-full bg-[#131318]/90 border border-white/[0.06] p-4 rounded-xl text-zinc-100 text-sm focus:border-cyan-500/40 focus:bg-[#16161f] outline-none font-mono text-center tracking-[0.5em] font-bold transition-all"
                                value={codigo}
                                onChange={(e) => setCodigo(e.target.value)}
                                maxLength={6}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest pl-1">Nueva Clave de Seguridad</label>
                            <div className="relative">
                                <input 
                                    type="password" 
                                    placeholder="Mínimo 6 caracteres" 
                                    className="w-full bg-[#131318]/90 border border-white/[0.06] p-4 rounded-xl text-zinc-100 text-sm focus:border-cyan-500/40 focus:bg-[#16161f] outline-none font-mono tracking-widest transition-all"
                                    value={nuevaPassword}
                                    onChange={(e) => setNuevaPassword(e.target.value)}
                                    required
                                />
                                <KeyRound size={16} className="absolute right-4 top-4 text-zinc-500" />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-6 py-4 text-xs font-mono uppercase tracking-[0.25em] rounded-xl bg-cyan-500 text-white hover:bg-cyan-400 font-bold transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50"
                        >
                            {loading ? "Procesando Cambio..." : "Restablecer Contraseña"}
                        </button>
                    </form>
                )}

                <div className="mt-8 pt-4 border-t border-white/[0.03] text-center">
                    <Link to="/login" className="text-zinc-500 hover:text-cyan-400 font-mono text-[10px] uppercase tracking-widest transition-colors">
                        ← Volver a Consola de Acceso
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;