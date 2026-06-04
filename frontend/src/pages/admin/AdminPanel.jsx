// Versión Arquitectura: V1.2 - Sincronización de Endpoint de Recargas (API_URL Modular)
/**
 * Ubicación: frontend/src/pages/admin/AdminPanel.jsx
 * Misión: Gestión atómica manual de saldos de conductores mediante el bus Express/MongoDB.
 * Seguridad: Componente blindado. Solo renderizable bajo rol 'admin'.
 */

import React, { useState } from 'react';
import axios from 'axios';
import { DollarSign, User, ShieldCheck, AlertTriangle, Loader, Zap } from 'lucide-react';
import { API_URL } from '../../config/api'; 
import { useAuth } from '../../hooks/useAuth';

const AdminPanel = () => {
    const { user } = useAuth();
    const [conductorId, setConductorId] = useState('');
    const [monto, setMonto] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    const handleRecargar = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            // 🛡️ GUARDA ANTI-UNDEFINED OBLIGATORIA
            if (!conductorId.trim() || !monto) {
                throw new Error("Parámetros de inyección incompletos.");
            }

            const tokenJWT = localStorage.getItem('token') || '';

            // 📡 Disparo atómico al endpoint modularizado (/api/conductores/recargar-saldo)
            const response = await axios.post(`${API_URL}/recargar-saldo`, {
                conductorId: conductorId.trim(),
                monto: parseFloat(monto),
                operador: user?.email || 'ADMIN_UI_PANEL'
            }, {
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokenJWT}`
                }
            });

            if (response.data.success) {
                setStatus({ type: 'success', message: `✅ Inyección Atómica Exitosa. Balance Actualizado.` });
                setConductorId('');
                setMonto('');
            }
        } catch (error) {
            console.error("❌ Falla en la inyección de capital:", error);
            setStatus({ type: 'error', message: error.response?.data?.message || error.message || "❌ Error crítico de comunicación con Express MDB." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] p-8 font-sans text-zinc-100 antialiased selection:bg-yellow-500/30">
            <div className="max-w-md mx-auto space-y-6">
                
                {/* CABECERA */}
                <div className="backdrop-blur-md bg-[#121214]/60 border border-zinc-800/40 p-4 rounded-2xl mb-2 flex items-center justify-between">
                    <div>
                        <h1 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-zinc-200">
                            <ShieldCheck className="text-yellow-500" size={20} /> Tesorería Admin
                        </h1>
                        <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">Operador: {user?.email || "No Identificado"}</p>
                    </div>
                </div>

                {/* FORMULARIO GLASSMORPHISM */}
                <form onSubmit={handleRecargar} className="backdrop-blur-xl bg-[#121214]/80 border border-zinc-800/60 p-6 rounded-2xl shadow-2xl space-y-5">
                    
                    <div className="space-y-2">
                        <label className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">Target ID (Conductor Hex/UID)</label>
                        <div className="relative flex items-center">
                            <User size={14} className="absolute left-3.5 text-zinc-500" />
                            <input 
                                required
                                disabled={loading}
                                value={conductorId}
                                onChange={(e) => setConductorId(e.target.value)}
                                className="w-full bg-zinc-950/60 border border-zinc-800/80 rounded-xl py-3 pl-9 pr-4 text-xs font-mono text-zinc-200 focus:border-yellow-500/50 outline-none placeholder-zinc-700 transition-colors"
                                placeholder="Ej: 64b7c89..."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">Monto a Inyectar ($ COP)</label>
                        <div className="relative flex items-center">
                            <DollarSign size={14} className="absolute left-3.5 text-yellow-500" />
                            <input 
                                type="number"
                                required
                                disabled={loading}
                                min="1"
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                                className="w-full bg-zinc-950/60 border border-zinc-800/80 rounded-xl py-3 pl-9 pr-4 text-xs font-mono text-yellow-500 font-bold focus:border-yellow-500/50 outline-none placeholder-zinc-700 transition-colors"
                                placeholder="Ej: 50000"
                            />
                        </div>
                    </div>

                    <button 
                        disabled={loading}
                        className="w-full bg-yellow-600 hover:bg-yellow-500 text-zinc-950 py-3.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest transition-all shadow-lg shadow-yellow-600/10 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? (
                            <><Loader className="animate-spin" size={14} /> Transmitiendo al Core...</>
                        ) : (
                            <><Zap size={14} className="fill-current" /> Ejecutar Inyección Atómica</>
                        )}
                    </button>
                </form>

                {/* SISTEMA DE NOTIFICACIONES */}
                {status.message && (
                    <div className={`p-4 rounded-xl text-[10px] font-mono uppercase tracking-wide leading-relaxed border flex items-start gap-2.5 animate-in fade-in zoom-in-95 ${
                        status.type === 'success' 
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' 
                        : 'bg-red-950/20 border-red-500/30 text-red-400'
                    }`}>
                        {status.type === 'success' ? <ShieldCheck size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
                        <span>{status.message}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;