// Versión Arquitectura: V20.1 - Recuperación Firebase con Blindaje Anti-Enumeración y Sincronización CIMCO-UI V9.3
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\ForgotPassword.jsx
 * Misión: Nodo seguro para recuperación de credenciales.
 * Seguridad: Estricta política Anti-Enumeración. El sistema jamás revela si un correo existe o no en la base de datos.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ShieldAlert, Mail, ArrowLeft, CheckCircle2, Terminal } from 'lucide-react';

const ForgotPassword = () => {
    const { resetPasswordCentral } = useAuth();
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            // 🛡️ Llamada silenciosa al middleware del ecosistema.
            await resetPasswordCentral(email);
        } catch (error) {
            console.error("🚨 [CIMCO-AUTH] Handshake de recuperación interceptado.");
            // Capturamos el error silenciosamente para no filtrarlo a la UI.
        } finally {
            setLoading(false);
            // 🛡️ ANTI-ENUMERACIÓN: Siempre mostramos éxito y cortamos el flujo de comprobación.
            setIsSubmitted(true);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 relative overflow-hidden">
            {/* FONDO ESTÉTICO CIMCO-UI HOMOLOGADO CON LOGIN */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-900/10 via-black to-black z-0" />
            
            <div className="w-full max-w-md backdrop-blur-md bg-[#121214]/80 border border-white/5 p-8 rounded-3xl shadow-2xl relative z-10">
                
                {/* ENCABEZADO */}
                <div className="mb-8 text-center">
                    <Terminal className="mx-auto text-yellow-500 mb-4" size={40} />
                    <h1 className="text-xl font-black text-white uppercase tracking-tighter">Protocolo de Rescate</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1 tracking-widest uppercase">Restablecer Acceso al Nodo</p>
                </div>

                {!isSubmitted ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl mb-6 flex gap-3 items-start">
                            <ShieldAlert size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-zinc-400 font-mono leading-relaxed uppercase tracking-wider">
                                Ingresa la terminal de correo asociada a tu cuenta. Transmitiremos un token seguro de recuperación.
                            </p>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Terminal de Correo</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-4 text-zinc-600" size={16} />
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/40 p-4 pl-12 rounded-xl border border-white/5 text-sm text-zinc-100 focus:border-yellow-500/50 outline-none transition-all placeholder:text-zinc-700"
                                    placeholder="operador@taxiacimco.com"
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || !email}
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
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 text-center space-y-4">
                        <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
                        <h3 className="text-emerald-400 font-black tracking-widest uppercase text-xs font-mono">Enlace Transmitido</h3>
                        <p className="text-zinc-400 text-[11px] leading-relaxed">
                            Si el correo <strong className="text-zinc-200">{email}</strong> está validado en el ecosistema, recibirás un vector de acceso en breve.
                        </p>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mt-4">
                            Verifica la bandeja de SPAM.
                        </p>
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