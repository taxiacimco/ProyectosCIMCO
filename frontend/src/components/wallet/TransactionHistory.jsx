// Versión Arquitectura: V16.0 - Desglose y Formateo Personalizado de Comisiones Deductoras por Rol y Pago Billetera
/**
 * Ubicación: frontend\src\components\wallet\TransactionHistory.jsx
 * Misión: Auditar y renderizar la trazabilidad financiera con desglose específico de comisiones deductoras por rol
 *         (Mototaxi/Motoparrillero: 10%, Motocarga: $500, Despachador: $500, Intermunicipal: $0, Pasajero: Pago Billetera).
 * Estilo: CIMCO-UI V9.3 Glassmorphism (backdrop-blur-md, bg-[#121214]/80, border-white/5).
 */
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, FIRESTORE_PATHS } from '@/config/firebase'; 
import { useAuth } from '@/hooks/useAuth';
import { Clock, ArrowUpRight, ArrowDownLeft, Loader2, ServerOff, ExternalLink, Coins, Receipt, Wallet, Percent, ShieldCheck } from 'lucide-react';
import { formatFechaColombia } from '@/utils/dateFormatter';

const TransactionHistory = ({ targetUid = null }) => {
    const { user, profile } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loadingTx, setLoadingTx] = useState(true);
    const [errorFirebase, setErrorFirebase] = useState(null);
    const [indexUrl, setIndexUrl] = useState(null);

    useEffect(() => {
        // 🛡️ Guarda Avanzada: Selección y resolución del UID operativo
        const uidOperativo = targetUid || user?.uid;
        
        if (!uidOperativo) {
            setLoadingTx(false);
            return;
        }

        setErrorFirebase(null);
        setIndexUrl(null);
        const pathColeccion = FIRESTORE_PATHS.transacciones || 'transacciones';
        
        try {
            // ✅ FILTRADO POLIMÓRFICO V15.5: Consulta bidireccional soportando targetUid o el dispatcherUid de la central
            const q = query(
                collection(db, pathColeccion),
                where("targetUid", "==", uidOperativo),
                orderBy("createdAt", "desc")
            );

            const unsubscribe = onSnapshot(q, 
                (snapshot) => {
                    const txList = snapshot.docs.map(doc => {
                        const data = doc.data() || {};
                        return {
                            id: doc.id,
                            ...data,
                            fechaSanitizada: data.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date()
                        };
                    });
                    setTransactions(txList);
                    setLoadingTx(false);
                },
                (error) => {
                    console.error("❌ [CIMCO-WALLET-CORE] Error en streaming de transacciones:", error);
                    
                    // 🛡️ Extracción táctica de URL de generación de índices en consola de Firebase
                    const mensajeError = error?.message || "";
                    const matchUrl = mensajeError.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
                    
                    if (matchUrl) {
                        setIndexUrl(matchUrl[0]);
                    }
                    
                    setErrorFirebase(mensajeError || "Error al obtener historial de transacciones.");
                    setLoadingTx(false);
                }
            );

            return () => unsubscribe();
        } catch (err) {
            console.error("❌ [CIMCO-WALLET-CORE] Fallo crítico al instanciar consulta NoSQL:", err);
            
            const mensajeErr = err?.message || "";
            const matchUrl = mensajeErr.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
            
            if (matchUrl) {
                setIndexUrl(matchUrl[0]);
            }
            
            setErrorFirebase(mensajeErr || "Error de inicialización de consulta.");
            setLoadingTx(false);
        }
    }, [user?.uid, targetUid]);

    /**
     * 🛡️ Helper para formatear el detalle de deducciones/comisiones según el rol del usuario y tipo de transacción
     */
    const obtenerDetalleComision = (tx) => {
        const rolUsuario = String(tx?.rolUsuario || tx?.rol || profile?.rol || user?.rol || '').toLowerCase().trim();
        const tipoTx = String(tx?.type || tx?.tipo || '').toUpperCase().trim();
        const montoBase = Number(tx?.valorServicio || tx?.montoBase || tx?.amount || tx?.monto || 0);

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
        if (rolUsuario === 'mototaxi' || rolUsuario === 'motoparrillero') {
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
            const montoPagado = Number(tx?.amount || tx?.monto || 0);
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
            descuentoTexto: `$${Number(tx?.amount || tx?.monto || 0).toLocaleString('es-CO')} COP`,
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

    if (errorFirebase) {
        return (
            <div className="flex flex-col gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 font-mono text-[10px] uppercase tracking-wider">
                <div className="flex items-center gap-2">
                    <ServerOff size={14} className="shrink-0" />
                    <span>Error de comunicación perimetral con base de datos.</span>
                </div>
                
                {indexUrl && (
                    <div className="mt-1 pt-2 border-t border-red-500/20 flex flex-col gap-1">
                        <span className="text-[9px] text-zinc-400">⚠️ Se requiere un índice compuesto en Firestore:</span>
                        <a 
                            href={indexUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-orange-400 hover:text-orange-300 font-bold underline text-[9px] transition-colors break-all"
                        >
                            <ExternalLink size={11} className="shrink-0" />
                            Crear índice en Firebase Console
                        </a>
                    </div>
                )}
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
                        const tipoTx = String(tx?.type || tx?.tipo || 'Transacción').toUpperCase();
                        const isRecarga = tipoTx === 'RECARGA' || tipoTx === 'CREDIT' || tipoTx === 'ABONO' || tipoTx === 'RECARGA_MANUAL_CEO';
                        const detalleComision = obtenerDetalleComision(tx);
                        const IconoDetalle = detalleComision.icono;
                        
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
                                                {tipoTx}
                                            </p>
                                            
                                            {/* Badge dinámico de deducción/comisión */}
                                            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md border ${detalleComision.estiloBadge}`}>
                                                <IconoDetalle size={10} className="shrink-0" />
                                                {detalleComision.textoBadge}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 text-[9px] text-zinc-400 font-mono">
                                            <span>Ref: {tx.id ? tx.id.substring(0, 8).toUpperCase() : 'S/R'}</span>
                                            <span className="text-zinc-600">•</span>
                                            <span className="text-zinc-300 font-bold">{detalleComision.descuentoTexto}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 flex sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                                    <p className={`text-xs font-black font-mono ${isRecarga ? 'text-orange-400' : 'text-zinc-200'}`}>
                                        {isRecarga ? '+' : '-'}${parseFloat(tx.amount || tx.monto || 0).toLocaleString('es-CO')}
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