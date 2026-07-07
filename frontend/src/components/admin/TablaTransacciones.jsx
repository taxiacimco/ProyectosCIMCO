// Versión Arquitectura: V1.2 - Inyección Local de Formateador Monetario e Integridad Transaccional
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\admin\TablaTransacciones.jsx
 * Misión: Renderizar el historial reactivo de auditoría financiera con diseño Glassmorphism (CIMCO-UI V9.3).
 * Seguridad: Protección total Anti-Undefined mediante operadores de encadenamiento opcional y fallbacks de respaldo.
 * Ajuste V1.2: Inyección local e implementación del formateador monetario 'formatearMoneda' localizado (es-CO) para mitigar el ReferenceError fatal en producción.
 */

import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock, CircleDollarSign, Database } from 'lucide-react';
import { formatFechaColombia } from '@/utils/dateFormatter'; // Utilidad homologada del ecosistema interno

// 🪙 Formateador Monetario Localizado (Pesos Colombianos) para mitigar ReferenceError en Runtime
const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(valor);
};

const TablaTransacciones = ({ transacciones = [] }) => {
    
    // Función auxiliar para renderizar insignias de tipo con el estándar estético CIMCO-UI
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

    return (
        <div className="w-full backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            {/* Header de la Tabla */}
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

            {/* Contenedor Responsivo / Tabla */}
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
                            {transacciones.map((tx, index) => (
                                <tr 
                                    key={tx?.id || tx?._id || index} 
                                    className="hover:bg-white/[0.02] transition-colors duration-150 group"
                                >
                                    {/* Celda: Fecha */}
                                    <td className="p-4 pl-6">
                                        <div className="flex items-center gap-2 text-zinc-400 font-medium">
                                            <Clock size={12} className="text-zinc-500" />
                                            {tx?.fecha || tx?.createdAt || tx?.timestamp ? (
                                                formatFechaColombia(tx?.fecha || tx?.createdAt || tx?.timestamp)
                                            ) : (
                                                <span className="text-zinc-600 italic">Fecha Incierta</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Celda: Identificador Operativo */}
                                    <td className="p-4">
                                        <div className="text-zinc-200 font-semibold truncate max-w-[180px]">
                                            {tx?.usuarioId || tx?.userId || tx?.driverId || 'SISTEMA_CORE'}
                                        </div>
                                        <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-wide">
                                            Ref: {tx?.referencia || tx?.id || 'Transacción Directa'}
                                        </div>
                                    </td>

                                    {/* Celda: Badge de Tipo */}
                                    <td className="p-4">
                                        {renderBadgeTipo(tx?.tipo || tx?.type || '')}
                                    </td>

                                    {/* Celda: Valor */}
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
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default TablaTransacciones;