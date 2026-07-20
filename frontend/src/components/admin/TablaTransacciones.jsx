// Versión Arquitectura: V1.4 - Extracción Segura de Timestamps y Blindaje Antifrase
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\admin\TablaTransacciones.jsx
 * Misión: Renderizar el historial de auditoría financiera con diseño Glassmorphism.
 * Saneamiento V1.4: Adaptación inteligente del objeto Timestamp de Firestore antes del parseo de fecha local.
 */

import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock, CircleDollarSign, Database } from 'lucide-react';
import { formatFechaColombia } from '@/utils/dateFormatter'; 

const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(valor);
};

const TablaTransacciones = ({ transacciones = [] }) => {
    
    const renderBadgeTipo = (tipo = '') => {
        const t = tipo.toUpperCase();
        if (t === 'RECARGA' || t === 'CREDIT') {
            return (
                <span className="flex items-center gap-1.5 w-fit text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                    <ArrowDownLeft size={12} />
                    RECARGA
                </span>
            );
        }
        return (
            <span className="flex items-center gap-1.5 w-fit text-[10px] text-cyan-400 font-mono font-bold bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-md">
                <ArrowUpRight size={12} />
                DEBITO
            </span>
        );
    };

    // Helper interno para desempaquetar de forma segura cualquier tipo de fecha proveniente de Firestore
    const resolverFechaSegura = (campoFecha) => {
        if (!campoFecha) return null;
        // Si es un Timestamp de Firestore, ejecutamos toDate() de forma segura
        if (typeof campoFecha === 'object' && campoFecha.toDate && typeof campoFecha.toDate === 'function') {
            return campoFecha.toDate();
        }
        if (campoFecha?.seconds) {
            return new Date(campoFecha.seconds * 1000);
        }
        return campoFecha;
    };

    return (
        <div className="w-full backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CircleDollarSign className="text-yellow-500" size={18} />
                    <h3 className="text-xs font-black tracking-widest uppercase text-zinc-200">
                        Auditoría Global de Caja
                    </h3>
                </div>
                <div className="text-[9px] font-bold text-zinc-500 bg-zinc-950/60 border border-white/5 px-2 py-1 rounded uppercase tracking-wider font-mono">
                    Registros: {transacciones?.length || 0}
                </div>
            </div>

            <div className="overflow-x-auto w-full">
                {!transacciones || transacciones.length === 0 ? (
                    <div className="p-8 flex flex-col items-center justify-center text-center gap-2">
                        <Database className="text-zinc-600 animate-pulse" size={24} />
                        <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                            Cero movimientos detectados en la matriz
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse font-mono antialiased">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.01] text-[9px] uppercase tracking-widest text-zinc-500 font-black">
                                <th className="p-4 pl-6">Estampa Temporal</th>
                                <th className="p-4">Identificador Operativo</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4 text-right pr-6">Monto Consolidado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs text-zinc-300">
                            {transacciones.map((tx, index) => {
                                const keyTransaccion = tx?.id || tx?._id || tx?.referencia || `tx-fallback-${index}`;
                                const fechaObjetivo = resolverFechaSegura(tx?.fecha || tx?.createdAt || tx?.timestamp);

                                return (
                                    <tr key={keyTransaccion} className="hover:bg-white/[0.02] transition-colors duration-150 group">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-2 text-zinc-400 font-medium">
                                                <Clock size={12} className="text-zinc-500" />
                                                {fechaObjetivo ? (
                                                    formatFechaColombia(fechaObjetivo)
                                                ) : (
                                                    <span className="text-zinc-600 italic">Fecha Incierta</span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="p-4">
                                            <div className="text-zinc-200 font-semibold truncate max-w-[180px]">
                                                {tx?.usuarioId || tx?.userId || tx?.driverId || 'SISTEMA_CORE'}
                                            </div>
                                            <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-wide">
                                                Ref: {tx?.referencia || tx?.id || 'Transacción Directa'}
                                            </div>
                                        </td>

                                        <td className="p-4">
                                            {renderBadgeTipo(tx?.tipo || tx?.type || '')}
                                        </td>

                                        <td className="p-4 text-right pr-6">
                                            <span className={`text-sm font-mono font-black ${
                                                tx?.tipo?.toUpperCase() === 'RECARGA' || tx?.tipo?.toUpperCase() === 'CREDIT' || tx?.type?.toUpperCase() === 'RECARGA'
                                                ? 'text-emerald-400' 
                                                : 'text-cyan-400'
                                            }`}>
                                                {formatearMoneda(tx?.monto || tx?.amount || 0)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default TablaTransacciones;