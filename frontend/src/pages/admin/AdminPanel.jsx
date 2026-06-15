// Versión Arquitectura: V1.9 - Alineación de Endpoint de Recarga y Resolución 404
/**
 * Ubicación: frontend/src/pages/admin/AdminPanel.jsx
 * Misión: Gestión atómica manual de saldos permitiendo indexación por UID, Celular o Correo.
 * Ajuste: Se corrige la ruta de Axios apuntando a '/conductores/saldos/admin/recargar' para homologar con el Router de Express.
 */

import React, { useState } from 'react';
import { DollarSign, User, ShieldCheck, AlertTriangle, Loader, Zap } from 'lucide-react';
import api from '@/config/api'; 
import { useAuth } from '@/hooks/useAuth';

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
            if (!conductorId.trim() || !monto) {
                throw new Error("Parámetros de inyección incompletos.");
            }

            const accessLevel = user?.access_level || 0;
            if (accessLevel < 90) {
                setStatus({ type: 'error', message: 'ERROR CRÍTICO: PERMISOS INSUFICIENTES (REQUERIDO: NIVEL 90+)' });
                setLoading(false);
                return;
            }

            // 🛠️ RESOLUCIÓN 404: Apuntando al prefijo correcto en Express (/conductores)
            const res = await api.post('/conductores/saldos/admin/recargar', {
                conductorId: conductorId.trim(),
                monto: parseFloat(monto),
                operador: user?.nombre || 'CEO_DESCONOCIDO' // Agregamos trazabilidad del operador actual
            });

            if (res.data.success) {
                setStatus({ 
                    type: 'success', 
                    message: `INYECCIÓN APROBADA: ${res.data.message || 'Saldo actualizado correctamente.'}` 
                });
                setConductorId('');
                setMonto('');
            } else {
                throw new Error(res.data.message || "Falla en la inyección de saldo.");
            }
        } catch (error) {
            console.error("❌ Falla Atómica de Recarga:", error);
            setStatus({ 
                type: 'error', 
                message: error.response?.data?.message || error.message || "Error fatal de conexión con el Core."
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#121214]/80 border border-white/5 rounded-2xl p-8 backdrop-blur-md max-w-xl mx-auto shadow-2xl">
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                    <DollarSign size={24} className="text-yellow-500" />
                </div>
                <div>
                    <h2 className="text-xl font-bold tracking-tighter text-white">Inyección de Efectivo</h2>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">Bus de Datos Financiero</p>
                </div>
            </div>

            <div className="space-y-6">
                <form onSubmit={handleRecargar} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold flex items-center gap-2">
                            <User size={12} className="text-cyan-500" /> Identificador del Operador
                        </label>
                        <input
                            type="text"
                            value={conductorId}
                            onChange={(e) => setConductorId(e.target.value)}
                            placeholder="Ej: UID de MongoDB, Celular (10 dígitos) o Correo Electrónico"
                            className="w-full bg-zinc-950/50 border border-white/10 p-3.5 rounded-xl text-white placeholder:text-zinc-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all font-mono text-sm"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold flex items-center gap-2">
                            <DollarSign size={12} className="text-emerald-500" /> Capital a Inyectar (COP)
                        </label>
                        <input
                            type="number"
                            value={monto}
                            onChange={(e) => setMonto(e.target.value)}
                            placeholder="Ej: 50000"
                            className="w-full bg-zinc-950/50 border border-white/10 p-3.5 rounded-xl text-white placeholder:text-zinc-700 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-mono text-lg font-bold"
                            required
                            min="1"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full mt-4 bg-yellow-500 text-zinc-950 py-3.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest transition-all shadow-lg shadow-yellow-600/10 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none hover:bg-yellow-400"
                    >
                        {loading ? (
                            <><Loader className="animate-spin" size={14} /> Transmitiendo al Core...</>
                        ) : (
                            <><Zap size={14} className="fill-current" /> Ejecutar Inyección Atómica</>
                        )}
                    </button>
                </form>

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