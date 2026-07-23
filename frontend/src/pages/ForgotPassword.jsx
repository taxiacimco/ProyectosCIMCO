// Versión Arquitectura: V20.2 - Recuperación Firebase con Claridad UX Anti-Enumeración y Sincronización CIMCO-UI V9.3
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\ForgotPassword.jsx
 * Misión: Nodo seguro para recuperación de credenciales.
 * Seguridad: Estricta política Anti-Enumeración. El sistema jamás revela la existencia o inexistencia de un correo en BD.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ShieldAlert, Mail, ArrowLeft, CheckCircle2, Terminal, RefreshCw, Inbox } from 'lucide-react';

const ForgotPassword = () => {
    const { resetPasswordCentral } = useAuth();
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail) return;

        setLoading(true);
        try {
            // 🛡️ Llamada silenciosa al middleware del ecosistema
            await resetPasswordCentral(cleanEmail);
        } catch (error) {
            console.error("🚨 [CIMCO-AUTH] Handshake de recuperación interceptado o no procesado.");
            // Se captura el error silenciosamente para proteger la privacidad del vector de usuarios
        } finally {
            setLoading(false);
            // 🛡️ ANTI-ENUMERACIÓN: Siempre avanzamos al estado de confirmación
            setIsSubmitted(true);
        }
    };

    const handleResetState = () => {
        setIsSubmitted(false);
        setEmail('');
    };

    return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-yellow-500/30">
            {/* FONDO ESTÉTICO CIMCO-UI HOMOLOGADO CON LOGIN */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-900/10 via-black to-black z-0" />
            
            <div className="w-full max-w-md backdrop-blur-md bg-[#121214]/80 border border-white/5 p-8 rounded-3xl shadow-2xl relative z-10">
                
                {/* ENCABEZADO */}
                <div className="mb-8 text-center">
                    <Terminal className="mx-auto text-yellow-500 mb-4" size={40} />
                    <h1 className="text-xl font-black text-white uppercase tracking-tighter">Protocolo de Rescate</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1 tracking-widest uppercase font-semibold">Restablecer Acceso al Nodo Central</p>
                </div>

                {!isSubmitted ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl mb-6 flex gap-3 items-start">
                            <ShieldAlert size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-zinc-400 font-mono leading-relaxed uppercase tracking-wider">
                                Ingresa la terminal de correo asociada a tu cuenta. Transmitiremos un token seguro para reestablecer tus credenciales.
                            </p>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1 font-mono">Terminal de Correo</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-4 text-zinc-600" size={16} />
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/40 p-4 pl-12 rounded-xl border border-white/5 text-xs font-mono text-zinc-100 focus:border-yellow-500/50 outline-none transition-all placeholder:text-zinc-700"
                                    placeholder="operador@taxiacimco.com"
                                    disabled={loading}
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || !email.trim()}
                            className="w-full mt-4 py-4 text-xs font-mono uppercase tracking-[0.25em] rounded-xl bg-yellow-500 text-black hover:bg-yellow-400 font-black transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                "Transmitir Enlace Seguro"
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        <CheckCircle2 size={42} className="text-emerald-500 mx-auto" />
                        
                        <div className="space-y-1">
                            <h3 className="text-emerald-400 font-black tracking-widest uppercase text-xs font-mono">
                                Protocolo Transmitido Exitosamente
                            </h3>
                            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                                Destino: <span className="text-zinc-300 font-bold">{email}</span>
                            </p>
                        </div>

                        {/* AVISO EXPLICATIVO MEJORADO PARA UX */}
                        <div className="bg-black/50 p-4 rounded-xl border border-white/5 text-left space-y-2">
                            <div className="flex items-center gap-2 text-yellow-500 text-[10px] font-mono font-bold uppercase tracking-wider">
                                <Inbox size={14} /> Revisa tu Bandeja
                            </div>
                            <p className="text-zinc-400 text-[11px] leading-relaxed">
                                Si el correo ingresado está registrado en nuestra plataforma, recibirás un enlace de restablecimiento en breve.
                            </p>
                            <p className="text-[10px] text-zinc-500 font-mono leading-tight pt-1">
                                💡 Tip: Si no lo ves en unos minutos, revisa tu carpeta de <strong className="text-zinc-400">correo no deseado (SPAM)</strong> o verifica si cometiste algún error al escribirlo.
                            </p>
                        </div>

                        <button 
                            type="button" 
                            onClick={handleResetState} 
                            className="inline-flex items-center justify-center gap-2 text-zinc-400 hover:text-yellow-400 font-mono text-[10px] uppercase tracking-widest transition-colors pt-2"
                        >
                            <RefreshCw size={12} /> ¿Cometiste un error? Reintentar con otro correo
                        </button>
                    </div>
                )}

                <div className="mt-8 pt-6 border-t border-white/[0.05] text-center">
                    <Link to="/login" className="inline-flex items-center justify-center gap-2 text-zinc-500 hover:text-white font-mono text-[10px] uppercase tracking-widest transition-colors">
                        <ArrowLeft size={12} /> Abortar y Volver al Centro
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;