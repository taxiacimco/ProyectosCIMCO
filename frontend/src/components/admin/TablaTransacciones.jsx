// Versión Arquitectura: V19.2 - Integración de Tipos Especiales de Transacciones y Filtros Contables por Tipo/Rol
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\admin\TablaTransacciones.jsx
 * Misión: Renderizar el historial de auditoría financiera con diseño Glassmorphism CIMCO-UI V9.3,
 *         soportando paginación por servidor, mapeo/parseo ampliado de tipos de movimiento 
 *         (CEO, Comisiones de Carrera/Fija, Pagos Servicio Pasajero) y filtros avanzados por Tipo y Rol.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    ArrowUpRight, 
    ArrowDownLeft, 
    Clock, 
    CircleDollarSign, 
    Database, 
    Search, 
    ChevronLeft, 
    ChevronRight, 
    Calendar, 
    Filter,
    RefreshCw,
    UserCheck,
    Coins,
    Receipt,
    ShieldAlert
} from 'lucide-react';
import { formatFechaColombia } from '@/utils/dateFormatter';
import { resolverFechaSegura } from '@/utils/dateUtils';

// 🛡️ SINGLETON: Instancia re-utilizable fuera del ciclo de render
const currencyFormatterCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
});

const formatearMoneda = (valor = 0) => {
    const montoNumerico = Number(valor) || 0;
    return currencyFormatterCOP.format(montoNumerico);
};

const renderBadgeTipo = (tipo = '') => {
    const t = String(tipo).toUpperCase().trim();

    switch (t) {
        case 'RECARGA_MANUAL_CEO':
        case 'RECARGA':
        case 'CREDIT':
        case 'INGRESO':
            return (
                <span className="flex items-center gap-1.5 w-fit text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                    <ArrowDownLeft size={12} />
                    RECARGA CEO
                </span>
            );

        case 'DEBITO_MANUAL_CEO':
            return (
                <span className="flex items-center gap-1.5 w-fit text-[10px] text-rose-400 font-mono font-bold bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md">
                    <ArrowUpRight size={12} />
                    DÉBITO CEO
                </span>
            );

        case 'COMISION_CARRERA_10':
            return (
                <span className="flex items-center gap-1.5 w-fit text-[10px] text-orange-400 font-mono font-bold bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-md">
                    <Coins size={12} />
                    COMISIÓN 10%
                </span>
            );

        case 'COMISION_FIJA_500':
            return (
                <span className="flex items-center gap-1.5 w-fit text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                    <Receipt size={12} />
                    COMISIÓN FIJA $500
                </span>
            );

        case 'PAGO_SERVICIO_PASAJERO':
            return (
                <span className="flex items-center gap-1.5 w-fit text-[10px] text-blue-400 font-mono font-bold bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-md">
                    <CircleDollarSign size={12} />
                    PAGO PASAJERO
                </span>
            );

        default:
            return (
                <span className="flex items-center gap-1.5 w-fit text-[10px] text-cyan-400 font-mono font-bold bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-md">
                    <ArrowUpRight size={12} />
                    {t || 'OTRO DÉBITO'}
                </span>
            );
    }
};

const renderBadgeRol = (rol = '') => {
    const r = String(rol).toLowerCase().trim();
    
    if (r === 'mototaxi' || r === 'motoparrillero') {
        return (
            <span className="text-[9px] text-orange-300 bg-orange-950/40 border border-orange-500/20 px-2 py-0.5 rounded font-bold uppercase">
                {r}
            </span>
        );
    }
    if (r === 'motocarga' || r === 'despachador') {
        return (
            <span className="text-[9px] text-amber-300 bg-amber-950/40 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase">
                {r}
            </span>
        );
    }
    if (r === 'pasajero' || r === 'usuario') {
        return (
            <span className="text-[9px] text-blue-300 bg-blue-950/40 border border-blue-500/20 px-2 py-0.5 rounded font-bold uppercase">
                {r}
            </span>
        );
    }
    return (
        <span className="text-[9px] text-zinc-400 bg-zinc-900 border border-white/5 px-2 py-0.5 rounded font-bold uppercase">
            {r || 'S/R'}
        </span>
    );
};

const TablaTransacciones = ({ 
    transacciones: transaccionesProp = [], 
    totalRegistros: totalRegistrosProp = 0,
    page: pageProp = 1,
    limit: limitProp = 10,
    onParamsChange = null,
    loading = false 
}) => {
    // 🛡️ ESTADOS PARA CONTROLES DE SERVIDOR
    const [page, setPage] = useState(pageProp);
    const [limit, setLimit] = useState(limitProp);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [tipoFiltro, setTipoFiltro] = useState('TODOS');
    const [rolFiltro, setRolFiltro] = useState('TODOS');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Ref estable para evitar bucles si onParamsChange no está memorizado en el padre
    const onParamsChangeRef = useRef(onParamsChange);
    useEffect(() => {
        onParamsChangeRef.current = onParamsChange;
    }, [onParamsChange]);

    // Ref para prevenir la petición duplicada al montar el componente
    const isFirstRender = useRef(true);

    // Sincronización de props entrantes cuando el padre actualiza paginación
    useEffect(() => { setPage(pageProp); }, [pageProp]);
    useEffect(() => { setLimit(limitProp); }, [limitProp]);

    // 🛡️ AMORTIGUACIÓN DE BÚSQUEDA (DEBOUNCE 400ms)
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1);
        }, 400);

        return () => clearTimeout(handler);
    }, [searchTerm]);

    // 🛡️ NOTIFICAR CAMBIOS AL SERVIDOR / COMPONENTE PADRE
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (typeof onParamsChangeRef.current === 'function') {
            onParamsChangeRef.current({
                page,
                limit,
                search: debouncedSearch,
                type: tipoFiltro,
                rol: rolFiltro,
                startDate,
                endDate
            });
        }
    }, [page, limit, debouncedSearch, tipoFiltro, rolFiltro, startDate, endDate]);

    // 🛡️ PROCESAMIENTO MODO HYBRID / CLIENTE FALLBACK
    const dataset = useMemo(() => {
        return Array.isArray(transaccionesProp) ? transaccionesProp : [];
    }, [transaccionesProp]);

    const esModoServidor = typeof onParamsChange === 'function';

    const transaccionesFiltradas = useMemo(() => {
        if (esModoServidor) return dataset;

        return dataset.filter(tx => {
            const query = debouncedSearch.toLowerCase().trim();
            const id = String(tx?.id || tx?._id || '').toLowerCase();
            const ref = String(tx?.referencia || '').toLowerCase();
            const user = String(tx?.usuarioId || tx?.userId || tx?.driverId || '').toLowerCase();
            const tipo = String(tx?.tipo || tx?.type || '').toUpperCase();
            const rol = String(tx?.rolUsuario || tx?.userRole || tx?.rol || '').toUpperCase();

            const matchQuery = !query || id.includes(query) || ref.includes(query) || user.includes(query);
            const matchTipo = tipoFiltro === 'TODOS' || tipo === tipoFiltro;
            const matchRol = rolFiltro === 'TODOS' || rol === rolFiltro;

            return matchQuery && matchTipo && matchRol;
        });
    }, [dataset, debouncedSearch, tipoFiltro, rolFiltro, esModoServidor]);

    const totalRegistros = esModoServidor ? (totalRegistrosProp || dataset.length) : transaccionesFiltradas.length;
    const totalPaginas = Math.max(1, Math.ceil(totalRegistros / limit));

    const transaccionesPaginadas = useMemo(() => {
        if (esModoServidor) return transaccionesFiltradas;
        const inicio = (page - 1) * limit;
        return transaccionesFiltradas.slice(inicio, inicio + limit);
    }, [transaccionesFiltradas, page, limit, esModoServidor]);

    const handleCambioPagina = (nuevaPagina) => {
        if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
            setPage(nuevaPagina);
        }
    };

    return (
        <div className="w-full backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl overflow-hidden shadow-xl flex flex-col gap-0 font-mono antialiased text-zinc-100">
            {/* ENCABEZADO Y CONTROLES DE FILTRADO AMORTIGUADO */}
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex items-center gap-2">
                    <CircleDollarSign className="text-yellow-500 shrink-0" size={18} />
                    <div>
                        <h3 className="text-xs font-black tracking-widest uppercase text-zinc-200">
                            Auditoría Global de Caja
                        </h3>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                            Paginación Servidor & Filtros Contables de Comisión
                        </span>
                    </div>
                </div>

                {/* BARRA DE FILTROS Y BÚSQUEDA */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    {/* BUSCADOR DEBOUNCED */}
                    <div className="relative flex-1 min-w-[180px] lg:w-56">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                        <input 
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="BUSCAR ID, REF, USUARIO..."
                            className="w-full bg-[#0c0c0e] border border-white/5 rounded-xl pl-9 pr-3 py-1.5 text-[10px] font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/40 transition-colors uppercase tracking-wider"
                        />
                    </div>

                    {/* SELECTOR DE TIPO / COMISIÓN */}
                    <div className="relative">
                        <select
                            value={tipoFiltro}
                            onChange={(e) => {
                                setTipoFiltro(e.target.value);
                                setPage(1);
                            }}
                            className="bg-[#0c0c0e] border border-white/5 rounded-xl px-3 py-1.5 text-[10px] font-bold text-zinc-300 focus:outline-none focus:border-yellow-500/40 uppercase tracking-wider appearance-none pr-8 cursor-pointer"
                        >
                            <option value="TODOS">TODOS LOS TIPOS</option>
                            <option value="RECARGA_MANUAL_CEO">RECARGA CEO</option>
                            <option value="DEBITO_MANUAL_CEO">DÉBITO CEO</option>
                            <option value="COMISION_CARRERA_10">COMISIÓN 10% (MOTOTAXI/PARRILLERO)</option>
                            <option value="COMISION_FIJA_500">COMISIÓN FIJA $500 (MOTOCARGA/DESPACHADOR)</option>
                            <option value="PAGO_SERVICIO_PASAJERO">PAGO SERVICIO PASAJERO</option>
                        </select>
                        <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={12} />
                    </div>

                    {/* SELECTOR DE ROL DE USUARIO */}
                    <div className="relative">
                        <select
                            value={rolFiltro}
                            onChange={(e) => {
                                setRolFiltro(e.target.value);
                                setPage(1);
                            }}
                            className="bg-[#0c0c0e] border border-white/5 rounded-xl px-3 py-1.5 text-[10px] font-bold text-zinc-300 focus:outline-none focus:border-yellow-500/40 uppercase tracking-wider appearance-none pr-8 cursor-pointer"
                        >
                            <option value="TODOS">TODOS LOS ROLES</option>
                            <option value="MOTOTAXI">MOTOTAXI</option>
                            <option value="MOTOPARRILLERO">MOTOPARRILLERO</option>
                            <option value="MOTOCARGA">MOTOCARGA</option>
                            <option value="DESPACHADOR">DESPACHADOR</option>
                            <option value="PASAJERO">PASAJERO</option>
                        </select>
                        <UserCheck className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={12} />
                    </div>

                    {/* FILTROS DE FECHAS */}
                    <div className="flex items-center gap-1 bg-[#0c0c0e] border border-white/5 rounded-xl px-2 py-1">
                        <Calendar className="text-zinc-500 shrink-0" size={12} />
                        <input 
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            className="bg-transparent text-[9px] font-bold text-zinc-300 focus:outline-none uppercase"
                        />
                        <span className="text-zinc-600 text-[9px]">-</span>
                        <input 
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                            className="bg-transparent text-[9px] font-bold text-zinc-300 focus:outline-none uppercase"
                        />
                    </div>

                    <div className="text-[9px] font-bold text-zinc-400 bg-zinc-950/60 border border-white/5 px-2.5 py-1.5 rounded-xl uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                        {loading && <RefreshCw size={10} className="animate-spin text-yellow-500" />}
                        Total: <span className="text-yellow-400">{totalRegistros}</span>
                    </div>
                </div>
            </div>

            {/* TABLA DE AUDITORÍA */}
            <div className="overflow-x-auto w-full min-h-[250px] relative">
                {loading && (
                    <div className="absolute inset-0 z-20 backdrop-blur-sm bg-[#121214]/60 flex items-center justify-center">
                        <RefreshCw className="text-yellow-500 animate-spin" size={24} />
                    </div>
                )}

                {!Array.isArray(transaccionesPaginadas) || transaccionesPaginadas.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center gap-2">
                        <Database className="text-zinc-600 animate-pulse" size={28} />
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
                                <th className="p-4">Rol</th>
                                <th className="p-4">Tipo / Comisión</th>
                                <th className="p-4 text-right pr-6">Monto Consolidado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs text-zinc-300">
                            {transaccionesPaginadas.map((tx, index) => {
                                const keyTransaccion = tx?.id || tx?._id || tx?.referencia || `tx-fallback-${index}`;
                                const fechaObjetivo = resolverFechaSegura(tx?.fecha || tx?.createdAt || tx?.timestamp);
                                const tipoString = String(tx?.tipo || tx?.type || '').toUpperCase();
                                const rolString = tx?.rolUsuario || tx?.userRole || tx?.rol || '';

                                return (
                                    <tr key={keyTransaccion} className="hover:bg-white/[0.02] transition-colors duration-150 group">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-2 text-zinc-400 font-medium">
                                                <Clock size={12} className="text-zinc-500 shrink-0" />
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
                                            {renderBadgeRol(rolString)}
                                        </td>

                                        <td className="p-4">
                                            {renderBadgeTipo(tipoString)}
                                        </td>

                                        <td className="p-4 text-right pr-6">
                                            <span className={`text-sm font-mono font-black ${
                                                tipoString === 'RECARGA_MANUAL_CEO' || tipoString === 'RECARGA' || tipoString === 'CREDIT' || tipoString === 'INGRESO'
                                                ? 'text-emerald-400' 
                                                : tipoString === 'PAGO_SERVICIO_PASAJERO'
                                                ? 'text-blue-400'
                                                : 'text-orange-400'
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

            {/* CONTROLES DE PAGINACIÓN */}
            <div className="p-4 border-t border-white/5 bg-white/[0.01] flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px]">
                <div className="flex items-center gap-2">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Registros por página:</span>
                    <select
                        value={limit}
                        onChange={(e) => {
                            setLimit(Number(e.target.value));
                            setPage(1);
                        }}
                        className="bg-[#0c0c0e] border border-white/5 rounded-lg px-2 py-1 text-zinc-300 font-bold focus:outline-none"
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-zinc-400 font-bold tracking-wider">
                        Página <span className="text-white">{page}</span> de <span className="text-white">{totalPaginas}</span>
                    </span>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleCambioPagina(page - 1)}
                            disabled={page <= 1 || loading}
                            className="p-1.5 rounded-lg border border-white/5 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <button
                            onClick={() => handleCambioPagina(page + 1)}
                            disabled={page >= totalPaginas || loading}
                            className="p-1.5 rounded-lg border border-white/5 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TablaTransacciones;