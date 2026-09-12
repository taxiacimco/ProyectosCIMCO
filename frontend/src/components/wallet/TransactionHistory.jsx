// Versión Arquitectura: V17.0 - Migración de Streaming NoSQL Firestore a API REST walletService.getTransacciones()
/**
 * Ubicación: frontend\src\components\wallet\TransactionHistory.jsx
 * Misión: Auditar y renderizar la trazabilidad financiera con desglose específico de comisiones deductoras por rol
 *         mediante consumo centralizado de API REST (walletService.getTransacciones) sobre historialsaldos.
 * Estilo: CIMCO-UI V9.3 Glassmorphism (backdrop-blur-md, bg-[#121214]/80, border-white/5).
 */

import React, { useState, useEffect } from 'react';
import { walletService } from '@/services/walletService';
import { useAuth } from '@/hooks/useAuth';
import { Clock, ArrowUpRight, ArrowDownLeft, Loader2, ServerOff, Coins, Receipt, Wallet, Percent, ShieldCheck } from 'lucide-react';
import { formatFechaColombia } from '@/utils/dateFormatter';

const TransactionHistory = ({ targetUid = null }) => {
    const { user, profile } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loadingTx, setLoadingTx] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const cargarHistorial = async () => {
            const uidOperativo = targetUid || user?.uid;
            
            if (!uidOperativo) {
                if (isMounted) setLoadingTx(false);
                return;
            }

            if (isMounted) {
                setLoadingTx(true);
                setError(null);
            }

            try {
                const response = await walletService.getTransacciones({}, controller.signal);
                const rawData = Array.isArray(response) ? response : (response?.data || response?.historial || []);
                
                const txList = (Array.isArray(rawData) ? rawData : []).map((tx) => {
                    const rawFecha = tx?.createdAt || tx?.fecha || tx?.timestamp;
                    let fechaSanitizada = new Date();

                    if (rawFecha) {
                        if (typeof rawFecha?.toDate === 'function') {
                            fechaSanitizada = rawFecha.toDate();
                        } else {
                            const parsed = new Date(rawFecha);
                            if (!isNaN(parsed.getTime())) {
                                fechaSanitizada = parsed;
                            }
                        }
                    }

                    return {
                        id: tx?._id || tx?.id || tx?.transaccionId || Math.random().toString(),
                        ...tx,
                        fechaSanitizada
                    };
                });

                if (isMounted) {
                    setTransactions(txList);
                }
            } catch (err) {
                const isCanceled = err?.name === 'CanceledError' || err?.message === 'canceled';
                if (isCanceled) return;

                console.error("❌ [CIMCO-WALLET-CORE] Error al obtener historial de movimientos:", err);
                if (isMounted) {
                    setError(err?.response?.data?.message || err?.message || "Error al conectar con la base de datos.");
                }
            } finally {
                if (isMounted) {
                    setLoadingTx(false);
                }
            }
        };

        cargarHistorial();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [user?.uid, targetUid]);

    /**
     * 🛡️ Helper para formatear el detalle de deducciones/comisiones según el rol del usuario y tipo de transacción
     */
    const obtenerDetalleComision = (tx) => {
        const rolUsuario = String(tx?.rolUsuario || tx?.rol || tx?.tipoEntidad || profile?.rol || user?.rol || '').toLowerCase().trim();
        const tipoTx = String(tx?.tipoOperacion || tx?.type || tx?.tipo || '').toUpperCase().trim();
        const montoBase = Number(tx?.monto || tx?.valorServicio || tx?.montoBase || tx?.amount || 0);

        // Si es una recarga o crédito directo del CEO, no aplica deducción
        if (['RECARGA', 'CREDIT', 'ABONO', 'RECARGA_MANUAL_CEO'].includes(tipoTx)) {
            return {
                textoBadge: "Abono de Saldo",
                descuentoTexto: "+$0 COP",
                icono: ShieldCheck,
                estiloBadge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
            };
        }

        // 1. Mototaxi / Motoparrillero: Deducción del 10% vinculada al valor del servicio
        if (rolUsuario === 'mototaxi' || rolUsuario === 'motoparrillero' || rolUsuario === 'conductor') {
            const comisionCalculada = tx?.comisionMonto ? Number(tx.comisionMonto) : (montoBase * 0.10);
            return {
                textoBadge: "Comisión 10% Carrera",
                descuentoTexto: `10% ($${comisionCalculada.toLocaleString('es-CO')} COP)`,
                icono: Percent,
                estiloBadge: "text-orange-400 bg-orange-500/10 border-orange-500/20"
            };
        }

        // 2. Motocarga: Deducción fija de $500 COP
        if (rolUsuario === 'motocarga') {
            return {
                textoBadge: "Comisión Fija Motocarga",
                descuentoTexto: "$500 COP",
                icono: Receipt,
                estiloBadge: "text-amber-400 bg-amber-500/10 border-amber-500/20"
            };
        }

        // 3. Despachador: Deducción fija de $500 COP por servicio asignado
        if (rolUsuario === 'despachador') {
            return {
                textoBadge: "Comisión Fija Despacho",
                descuentoTexto: "$500 COP",
                icono: Coins,
                estiloBadge: "text-amber-400 bg-amber-500/10 border-amber-500/20"
            };
        }

        // 4. Intermunicipal: $0 COP de descuento
        if (rolUsuario === 'intermunicipal') {
            return {
                textoBadge: "Servicio Intermunicipal",
                descuentoTexto: "$0 COP (Sin Descuento)",
                icono: ShieldCheck,
                estiloBadge: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
            };
        }

        // 5. Pasajero: Descuento total por "Pago con Billetera" si eligió este método
        if (rolUsuario === 'pasajero' || rolUsuario === 'usuario') {
            const montoPagado = Number(tx?.monto || tx?.amount || 0);
            return {
                textoBadge: "Pago con Billetera",
                descuentoTexto: `Descuento Billetera: -$${montoPagado.toLocaleString('es-CO')} COP`,
                icono: Wallet,
                estiloBadge: "text-blue-400 bg-blue-500/10 border-blue-500/20"
            };
        }

        // Fallback estándar
        return {
            textoBadge: tipoTx || "Deducción General",
            descuentoTexto: `$${Number(tx?.monto || tx?.amount || 0).toLocaleString('es-CO')} COP`,
            icono: ArrowDownLeft,
            estiloBadge: "text-zinc-400 bg-zinc-500/10 border-white/5"
        };
    };

    if (loadingTx) {
        return (
            <div className="flex items-center justify-center py-8 gap-2 text-zinc-500 font-mono text-[10px] tracking-widest uppercase">
                <Loader2 className="animate-spin text-orange-500" size={14} />
                <span>Sincronizando Trazabilidad...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 font-mono text-[10px] uppercase tracking-wider">
                <div className="flex items-center gap-2">
                    <ServerOff size={14} className="shrink-0" />
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full font-mono antialiased">
            {transactions.length === 0 ? (
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest text-center py-6 border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                    Sin movimientos financieros registrados en la bitácora.
                </p>
            ) : (
                <div className="space-y-2.5">
                    {transactions.map((tx) => {
                        const tipoTx = String(tx?.tipoOperacion || tx?.type || tx?.tipo || tx?.concepto || 'Transacción').toUpperCase();
                        const isRecarga = ['RECARGA', 'CREDIT', 'ABONO', 'RECARGA_MANUAL_CEO'].includes(tipoTx);
                        const detalleComision = obtenerDetalleComision(tx);
                        const IconoDetalle = detalleComision.icono;
                        const refId = String(tx?.id || tx?._id || 'S/R');
                        
                        return (
                            <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-[#121214]/80 backdrop-blur-md border border-white/5 hover:border-white/10 transition-all gap-3">
                                <div className="flex items-start sm:items-center gap-3 min-w-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 mt-0.5 sm:mt-0 ${
                                        isRecarga 
                                        ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' 
                                        : 'bg-zinc-500/10 border-white/5 text-zinc-400'
                                    }`}>
                                        {isRecarga ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                                    </div>

                                    <div className="min-w-0 flex flex-col gap-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-[10px] font-black text-zinc-200 uppercase tracking-widest truncate">
                                                {tx?.motivo || tx?.concepto || tipoTx}
                                            </p>
                                            
                                            {/* Badge dinámico de deducción/comisión */}
                                            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md border ${detalleComision.estiloBadge}`}>
                                                <IconoDetalle size={10} className="shrink-0" />
                                                {detalleComision.textoBadge}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 text-[9px] text-zinc-400 font-mono">
                                            <span>Ref: {refId.length > 8 ? refId.substring(0, 8).toUpperCase() : refId.toUpperCase()}</span>
                                            <span className="text-zinc-600">•</span>
                                            <span className="text-zinc-300 font-bold">{detalleComision.descuentoTexto}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 flex sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                                    <p className={`text-xs font-black font-mono ${isRecarga ? 'text-orange-400' : 'text-zinc-200'}`}>
                                        {isRecarga ? '+' : '-'}${Number(tx?.monto || tx?.amount || tx?.montoBase || 0).toLocaleString('es-CO')}
                                    </p>
                                    <p className="text-[8px] text-zinc-500 font-bold uppercase flex items-center gap-1 mt-0.5 tracking-wider font-mono">
                                        <Clock className="opacity-60" size={9} /> 
                                        {formatFechaColombia(tx.fechaSanitizada)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TransactionHistory;