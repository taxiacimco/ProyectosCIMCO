// Versión Arquitectura: V10.9.7 - Sincronización de Importación Nativa y Corrección de Cierre de Bloque JSX
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\ForgotPassword.jsx
 * Misión: Formulario de recuperación OTP premium con mapeo exacto de datos para el controlador central de TAXIA CIMCO.
 * Sincronización: Importación de API limpia y delegada a la resolución nativa de Vite (.js).
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../config/api';

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

            await api.post('/api/auth/forgot-password', { inputUser: inputUser.trim() });
            setSuccess('Código OTP generado con éxito. Revisa la consola de tu servidor Express para obtener el token.');
            setStep(2);
        } catch (err) {
            console.error("❌ Error en forgot-password:", err);
            setError(err.response?.data?.message || err.message || "Error al conectar con el nodo central de autenticación.");
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
            // 🛡️ GUARDA DE SEGURIDAD: Verificación de consistencia de estados locales
            if (!inputUser || inputUser.trim() === '') {
                throw new Error("Identificador de usuario corrupto o inválido en el estado.");
            }
            if (!codigo || codigo.trim() === '') {
                throw new Error("El código OTP de simulación es requerido para firmar el cambio.");
            }
            if (!nuevaPassword || nuevaPassword.length < 6) {
                throw new Error("La nueva clave perimetral debe contener un mínimo de 6 caracteres.");
            }

            await api.post('/api/auth/reset-password', {
                inputUser: inputUser.trim(),
                codigo: codigo.trim(),
                nuevaPassword: nuevaPassword
            });

            setSuccess('🔑 Credencial actualizada con éxito en la base de datos central. Redirigiendo a consola de acceso...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            console.error("❌ Error en reset-password:", err);
            setError(err.response?.data?.message || err.message || "El código ingresado es inválido o ya ha expirado.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md backdrop-blur-xl bg-[#0d0d11]/85 border border-white/[0.06] rounded-2xl p-8 shadow-[0_0_50px_-12px_rgba(6,182,212,0.15)] relative">
            
            <div className="mb-8 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/[0.06] border border-cyan-500/15 rounded-full mb-3">
                    <span className={`h-1.5 w-1.5 rounded-full ${loading ? 'bg-amber-400 animate-ping' : 'bg-cyan-400 animate-pulse'}`} />
                    <span className="text-[10px] font-mono tracking-[0.15em] text-cyan-400 uppercase">Bóveda de Seguridad</span>
                </div>
                <h2 className="text-white font-black text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">RECOVERY NODE</h2>
                <p className="text-zinc-500 text-xs font-mono tracking-wide mt-1 uppercase text-[10px]">Restablecimiento de Credenciales</p>
            </div>

            {error && (
                <div className="mb-6 bg-red-950/30 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-xl font-mono">
                    <span className="font-bold block text-[10px] tracking-wider uppercase text-red-300 mb-0.5">Error de Validación</span>
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-6 bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 text-xs p-3.5 rounded-xl font-mono">
                    <span className="font-bold block text-[10px] tracking-wider uppercase text-cyan-300 mb-0.5">Operación Exitosa</span>
                    {success}
                </div>
            )}

            {step === 1 ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest pl-1">Identificador de la Unidad</label>
                        <input 
                            type="text" 
                            placeholder="Ej. 3003503249 o Correo" 
                            className="w-full bg-[#131318]/90 border border-white/[0.06] p-3.5 rounded-xl text-zinc-100 text-sm focus:border-cyan-500/40 focus:bg-[#16161f] outline-none font-mono transition-all"
                            value={inputUser}
                            onChange={(e) => setInputUser(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-4 py-4 text-xs font-mono uppercase tracking-[0.25em] rounded-xl bg-zinc-100 text-black hover:bg-cyan-500 hover:text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                            className="w-full bg-[#131318]/90 border border-white/[0.06] p-3.5 rounded-xl text-zinc-100 text-sm focus:border-cyan-500/40 focus:bg-[#16161f] outline-none font-mono text-center tracking-[0.5em] font-bold transition-all"
                            value={codigo}
                            onChange={(e) => setCodigo(e.target.value)}
                            maxLength={6}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest pl-1">Nueva Clave de Seguridad</label>
                        <input 
                            type="password" 
                            placeholder="Mínimo 6 caracteres" 
                            className="w-full bg-[#131318]/90 border border-white/[0.06] p-3.5 rounded-xl text-zinc-100 text-sm focus:border-cyan-500/40 focus:bg-[#16161f] outline-none font-mono tracking-widest transition-all"
                            value={nuevaPassword}
                            onChange={(e) => setNuevaPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-4 py-4 text-xs font-mono uppercase tracking-[0.25em] rounded-xl bg-cyan-500 text-white hover:bg-cyan-400 font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50"
                    >
                        {loading ? "Procesando Cambio..." : "Restablecer Contraseña"}
                    </button>
                </form>
            )}

            <div className="mt-8 pt-4 border-t border-white/[0.03] text-center">
                <Link to="/login" className="text-zinc-500 hover:text-zinc-400 font-mono text-[10px] uppercase tracking-widest transition-colors">
                    ← Volver a Consola de Acceso
                </Link>
            </div>
        </div>
    );
};

export default ForgotPassword;