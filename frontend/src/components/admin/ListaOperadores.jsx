// Versión Arquitectura: V16.1 - Alerta Combinada de Saldo Insuficiente y Bloqueo de Activación para Conductores Suspendidos (< $2.000 COP)
/**
 * Ubicación: frontend\src\components\admin\ListaOperadores.jsx
 * Misión: Renderizar la malla virtualizada de operadores recuperando registros desde la API central 
 *         con fallback de lectura reactiva a Firestore.
 * UI Standard: CIMCO-UI V9.3 Pure Glassmorphism.
 * Ajuste V16.1:
 *   1. Columna de Estado con Saldo Vinculado: Si estado === 'APROBADO' y saldo < 2000 COP, muestra
 *      alerta combinada `<span className="bg-orange-500/10 text-orange-400">APROBADO (SIN SALDO)</span>`.
 *   2. Bloqueo de Activación para Suspendidos con Saldo < 2000 COP: Deshabilita o advierte al administrador
 *      impidiendo reactivar a un operador suspendido con saldo insuficiente en el Modal y en la lista.
 */

import React, { useState, useEffect, useRef } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Shield, ShieldAlert, UserCheck, UserX, Search, Loader, Database, CheckCircle, Hourglass, X, AlertTriangle } from 'lucide-react';
import { deduplicarEntidades } from '@/utils/deduplicar';
import { useVirtualizer } from '@tanstack/react-virtual';

// ✅ Normalización de API_BASE_URL para evitar sufijos '/api' duplicados
const RAW_API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = RAW_API_URL.replace(/\/api\/?$/, '');

const normalizarEntidadUsuario = (idDoc, rawData = {}) => {
    const rolEstandar = (rawData?.rol || rawData?.role || rawData?.subrol || 'operador').toString().toLowerCase().trim();
    
    let esActivo = true;
    if (rawData?.isActive !== undefined) {
        esActivo = Boolean(rawData.isActive);
    } else if (rawData?.estado !== undefined) {
        esActivo = rawData.estado === 'APROBADO' || rawData.estado === 'active';
    }

    return {
        id: idDoc || rawData?._id,
        _id: rawData?._id || idDoc,
        ...rawData,
        rol: rolEstandar,
        role: rolEstandar,
        estado: rawData?.estado || (esActivo ? 'APROBADO' : 'PENDIENTE'),
        isActive: esActivo
    };
};

export const ListaOperadores = ({ conductores: conductoresProp, onAprobarConductor }) => {
    const [usuariosLocal, setUsuariosLocal] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(!conductoresProp);
    const [errorFirestore, setErrorFirestore] = useState(null);
    const isMounted = useRef(true);

    // 🛡️ Estado del Modal de Moderación con Causa Razonada
    const [modalModeracion, setModalModeracion] = useState({
        isOpen: false,
        operador: null,
        accion: '', // 'APROBAR' | 'SUSPENDER' | 'ACTIVAR'
        nuevoEstado: '',
        nuevoActive: false
    });
    const [justificacion, setJustificacion] = useState('');
    const [errorModal, setErrorModal] = useState(null);
    const [procesandoModeracion, setProcesandoModeracion] = useState(false);

    // 🛡️ Ref para el contenedor de Scroll de la Virtualización
    const parentRef = useRef(null);

    useEffect(() => {
        isMounted.current = true;

        if (conductoresProp) {
            setLoading(false);
            return;
        }

        setLoading(true);
        let unsubscribeFirestore = null;

        const syncOperadores = async () => {
            try {
                const token = localStorage.getItem('cimco_token');
                const headers = {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                };

                // Petición directa al Backend Express vía API_BASE_URL
                const response = await fetch(`${API_BASE_URL}/api/conductores`, { headers });
                if (response.ok) {
                    const data = await response.json();
                    const listaMongo = Array.isArray(data) ? data : (data.conductores || data.data || []);
                    
                    if (isMounted.current) {
                        const normalizados = listaMongo.map(u => normalizarEntidadUsuario(u._id || u.id, u));
                        
                        // 🛡️ FILTRO ANTI-DUPLICADOS
                        const listaLimpia = deduplicarEntidades(normalizados);

                        setUsuariosLocal(listaLimpia);
                        setLoading(false);
                        setErrorFirestore(null);
                        return; // Carga exitosa desde MongoDB
                    }
                }
            } catch (err) {
                console.warn("⚠️ [CIMCO-REST]: Fallo al consultar backend, recurriendo a Firestore...", err);
            }

            if (!isMounted.current) return;

            // Fallback de lectura a Firestore si la API no responde
            const pathColeccion = FIRESTORE_PATHS?.users || 'usuarios'; 
            const q = query(collection(db, pathColeccion));
            
            unsubscribeFirestore = onSnapshot(q, 
                (snapshot) => {
                    if (!isMounted.current) return;
                    const lista = snapshot.docs.map(docSnap => 
                        normalizarEntidadUsuario(docSnap.id, docSnap.data())
                    );
                    
                    const listaLimpia = deduplicarEntidades(lista);

                    setUsuariosLocal(listaLimpia);
                    setLoading(false);
                    setErrorFirestore(null);
                }, 
                (err) => {
                    console.error("❌ [CIMCO-FIRESTORE-OPERADORES]:", err);
                    if (isMounted.current) {
                        setErrorFirestore("Fallo en la comunicación con el canal de seguridad.");
                        setLoading(false);
                    }
                }
            );
        };

        syncOperadores();

        return () => {
            isMounted.current = false;
            if (typeof unsubscribeFirestore === 'function') {
                unsubscribeFirestore();
            }
        };
    }, [conductoresProp]);

    const listaBruta = conductoresProp || usuariosLocal;
    const listaMapeada = deduplicarEntidades(listaBruta);

    const obtenerNombreMostrar = (u) => {
        const nombreDirecto = u?.nombre || u?.nombreCompleto || u?.displayName;
        if (nombreDirecto && nombreDirecto !== 'SIN REGISTRO') {
            return nombreDirecto;
        }
        if (u?.email) {
            return u.email.split('@')[0].replace(/[._-]/g, ' ').toUpperCase();
        }
        return `OPERADOR ${(u?.rol || u?.role || '').toUpperCase() || 'REGISTRADO'}`;
    };

    const usuariosFiltrados = listaMapeada.filter(u => {
        const queryNormalize = busqueda.toLowerCase().trim();
        const nombre = obtenerNombreMostrar(u).toLowerCase();
        const email = (u?.email || '').toLowerCase();
        const rol = (u?.rol || u?.role || u?.subrol || '').toLowerCase();
        const id = (u?.id || u?._id || '').toLowerCase();
        const telefono = (u?.telefono || u?.telefonoMovil || '').toLowerCase();

        return nombre.includes(queryNormalize) || 
               email.includes(queryNormalize) || 
               rol.includes(queryNormalize) ||
               id.includes(queryNormalize) ||
               telefono.includes(queryNormalize);
    });

    // 🛡️ Virtualizador de Renderizado para Mallas Extensas
    const rowVirtualizer = useVirtualizer({
        count: usuariosFiltrados.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 68,
        overscan: 5,
    });

    // 🛡️ Control Modal de Moderación
    const abrirModalModeracion = (operador, accion) => {
        if (!operador) return;
        const esAprobar = accion === 'APROBAR';
        const esSuspender = accion === 'SUSPENDER';
        
        const nuevoActive = esAprobar ? true : (esSuspender ? false : true);
        const nuevoEstado = esAprobar ? 'APROBADO' : (esSuspender ? 'INACTIVO' : 'APROBADO');

        const saldoNum = Number(operador.saldoWallet || operador.saldo || operador.balance || 0);
        let errorInicial = null;

        if (accion === 'ACTIVAR' && saldoNum < 2000) {
            errorInicial = 'Bloqueo de Seguridad: No es posible activar a un conductor suspendido con un saldo inferior a $2.000 COP.';
        }

        setModalModeracion({
            isOpen: true,
            operador,
            accion,
            nuevoEstado,
            nuevoActive
        });
        setJustificacion('');
        setErrorModal(errorInicial);
    };

    const cerrarModalModeracion = () => {
        if (procesandoModeracion) return;
        setModalModeracion({
            isOpen: false,
            operador: null,
            accion: '',
            nuevoEstado: '',
            nuevoActive: false
        });
        setJustificacion('');
        setErrorModal(null);
    };

    // 🛡️ Mutación de Estado Centralizada por API REST (Sin Direct Writes a DB)
    const ejecutarModeracion = async () => {
        const { operador, accion, nuevoEstado, nuevoActive } = modalModeracion;
        if (!operador) return;

        const saldoNum = Number(operador.saldoWallet || operador.saldo || operador.balance || 0);
        if (accion === 'ACTIVAR' && saldoNum < 2000) {
            setErrorModal('Acción bloqueada: El operador posee un saldo inferior a $2.000 COP. Recargue el saldo antes de activar.');
            return;
        }

        if (!justificacion || !justificacion.trim()) {
            setErrorModal('Debe ingresar una causa o justificación obligatoria para continuar.');
            return;
        }

        const idValido = operador.id || operador._id;
        if (!idValido) {
            setErrorModal('Identificador de operador no válido.');
            return;
        }

        setProcesandoModeracion(true);
        setErrorModal(null);

        try {
            const token = localStorage.getItem('cimco_token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const endpoint = accion === 'APROBAR'
                ? `${API_BASE_URL}/api/conductores/${idValido}/aprobar`
                : `${API_BASE_URL}/api/conductores/${idValido}/estado`;

            const bodyPayload = {
                isActive: nuevoActive,
                estado: nuevoEstado,
                justificacion: justificacion.trim(),
                motivo: justificacion.trim()
            };

            const res = await fetch(endpoint, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(bodyPayload)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || errorData.error || `Error HTTP ${res.status} en el servidor central`);
            }

            if (accion === 'APROBAR' && onAprobarConductor) {
                onAprobarConductor(idValido, nuevoEstado);
            }

            // Actualización optimista de la UI
            setUsuariosLocal(prev => prev.map(u => {
                const currentId = u.id || u._id;
                if (currentId === idValido) {
                    return {
                        ...u,
                        estado: nuevoEstado,
                        isActive: nuevoActive,
                        justificacionUltima: justificacion.trim()
                    };
                }
                return u;
            }));

            cerrarModalModeracion();
        } catch (err) {
            console.error("❌ [CIMCO-MODERATION-REST-ERROR]:", err);
            setErrorModal(err.message || "Fallo en la comunicación con la API central de moderación.");
        } finally {
            setProcesandoModeracion(false);
        }
    };

    return (
        <div className="w-full flex flex-col gap-4 font-mono antialiased text-zinc-100 relative">
            {/* PANEL DE BÚSQUEDA */}
            <div className="w-full backdrop-blur-md bg-[#121214]/80 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input 
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="FILTRAR POR ID, NOMBRE, TELEFONO O ROL..."
                        className="w-full bg-zinc-950/80 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/30 transition-colors uppercase tracking-wider"
                    />
                </div>
                <div className="text-[10px] bg-zinc-950/60 border border-white/5 px-3 py-1.5 rounded-lg text-zinc-400 font-bold uppercase tracking-widest shrink-0">
                    Malla: <span className="text-yellow-500">{usuariosFiltrados.length}</span> Operadores Visibles
                </div>
            </div>

            {loading ? (
                <div className="h-64 backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-xl">
                    <Loader className="animate-spin text-yellow-500" size={28} />
                    <span className="tracking-widest uppercase text-[10px] text-zinc-500">Mapeando Entidades Logísticas...</span>
                </div>
            ) : errorFirestore ? (
                <div className="backdrop-blur-md bg-red-500/5 border border-red-500/10 rounded-2xl p-6 text-center flex flex-col items-center gap-3">
                    <ShieldAlert className="text-red-500" size={32} />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">Error de Enlace Central</h3>
                    <p className="text-[11px] text-zinc-500">{errorFirestore}</p>
                </div>
            ) : (
                <div className="w-full backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl overflow-hidden shadow-xl flex flex-col">
                    {usuariosFiltrados.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-center gap-2">
                            <Database className="text-zinc-700 animate-pulse" size={28} />
                            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">No se localizan coincidencias</p>
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto">
                            <div className="min-w-[800px] w-full">
                                {/* ENCABEZADO FIJO DE LA MALLA */}
                                <div className="bg-white/[0.02] border-b border-white/5 text-[9px] uppercase tracking-widest text-zinc-500 font-black grid grid-cols-12 px-6 py-3.5 items-center">
                                    <div className="col-span-3">Operador</div>
                                    <div className="col-span-2">Teléfono</div>
                                    <div className="col-span-2">Subrol</div>
                                    <div className="col-span-2">Estado</div>
                                    <div className="col-span-1 text-right">Saldo</div>
                                    <div className="col-span-2 text-right">Acciones / Moderación</div>
                                </div>

                                {/* CONTENEDOR VIRTUALIZADO DE FILAS */}
                                <div ref={parentRef} className="max-h-[520px] overflow-y-auto custom-scrollbar relative w-full">
                                    <div
                                        style={{
                                            height: `${rowVirtualizer.getTotalSize()}px`,
                                            width: '100%',
                                            position: 'relative',
                                        }}
                                    >
                                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                            const c = usuariosFiltrados[virtualRow.index];
                                            if (!c) return null;
                                            const idValido = c.id || c._id;
                                            const keyEstable = idValido || `${c.telefono || 'op'}-${virtualRow.index}`;
                                            const subrolVisual = c.subrol || c.rol || c.role || 'Mototaxi';
                                            const estaAprobado = c.estado === 'APROBADO' || c.estado === 'active';
                                            const saldoNum = Number(c.saldoWallet || c.saldo || c.balance || 0);

                                            return (
                                                <div
                                                    key={keyEstable}
                                                    data-index={virtualRow.index}
                                                    ref={rowVirtualizer.measureElement}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        width: '100%',
                                                        transform: `translateY(${virtualRow.start}px)`,
                                                    }}
                                                    className="grid grid-cols-12 px-6 py-3.5 border-b border-white/5 text-xs text-zinc-300 hover:bg-white/[0.02] transition-colors duration-150 items-center"
                                                >
                                                    <div className="col-span-3 pr-2 truncate">
                                                        <div className="font-bold text-zinc-200 uppercase truncate">
                                                            {obtenerNombreMostrar(c)}
                                                        </div>
                                                        <div className="text-[9px] text-zinc-600 font-mono tracking-wide mt-0.5 truncate">
                                                            ID: {idValido || 'S/I'}
                                                        </div>
                                                    </div>
                                                    <div className="col-span-2 font-mono text-zinc-400 truncate">
                                                        {c.telefono || c.telefonoMovil || 'S/N'}
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-white/5 bg-zinc-800/40 text-zinc-400 uppercase tracking-wider inline-flex items-center gap-1 truncate max-w-full">
                                                            <Shield size={10} className="shrink-0" />
                                                            <span className="truncate">{subrolVisual}</span>
                                                        </span>
                                                    </div>
                                                    <div className="col-span-2">
                                                        {c.estado === 'APROBADO' && saldoNum < 2000 ? (
                                                            <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1">
                                                                <AlertTriangle size={11} className="shrink-0" /> APROBADO (SIN SALDO)
                                                            </span>
                                                        ) : estaAprobado ? (
                                                            <span className="inline-flex items-center gap-1 rounded bg-green-900/40 px-2.5 py-1 text-[10px] text-green-400 font-bold border border-green-500/40">
                                                                <CheckCircle size={11} className="shrink-0" /> APROBADO
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded bg-yellow-900/40 px-2.5 py-1 text-[10px] text-yellow-400 font-bold border border-yellow-500/40 animate-pulse">
                                                                <Hourglass size={11} className="shrink-0" /> PENDIENTE
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="col-span-1 font-mono font-bold text-emerald-400 text-right truncate">
                                                        ${saldoNum.toLocaleString('es-CO')}
                                                    </div>
                                                    <div className="col-span-2 text-right flex items-center justify-end gap-1.5">
                                                        {!estaAprobado && (
                                                            <button
                                                                onClick={() => abrirModalModeracion(c, 'APROBAR')}
                                                                className="rounded bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-[10px] text-white font-bold transition uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95"
                                                            >
                                                                Aprobar
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => abrirModalModeracion(c, estaAprobado ? 'SUSPENDER' : 'ACTIVAR')} 
                                                            disabled={!estaAprobado && saldoNum < 2000}
                                                            title={!estaAprobado && saldoNum < 2000 ? "Saldo insuficiente (< $2.000 COP) para activar" : ""}
                                                            className={`text-[9px] font-black tracking-widest uppercase transition-all duration-200 px-2 py-1 rounded-lg border active:scale-95 ${
                                                                !estaAprobado && saldoNum < 2000
                                                                    ? 'border-zinc-800 text-zinc-600 bg-zinc-900/50 cursor-not-allowed opacity-50'
                                                                    : estaAprobado 
                                                                        ? 'border-red-500/20 text-red-400 hover:bg-red-500/10' 
                                                                        : 'border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10'
                                                            }`}
                                                        >
                                                            {estaAprobado ? 'SUSPENDER' : 'ACTIVAR'}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL DE MODERACIÓN CON CAUSA RAZONADA */}
            {modalModeracion.isOpen && modalModeracion.operador && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="w-full max-w-md bg-[#121214] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 font-mono">
                        {/* HEADER DEL MODAL */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <div className="flex items-center gap-2">
                                {modalModeracion.accion === 'SUSPENDER' ? (
                                    <UserX className="text-red-400" size={20} />
                                ) : modalModeracion.accion === 'APROBAR' ? (
                                    <UserCheck className="text-emerald-400" size={20} />
                                ) : (
                                    <Shield className="text-cyan-400" size={20} />
                                )}
                                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                                    Confirmación de Moderación
                                </h3>
                            </div>
                            <button
                                onClick={cerrarModalModeracion}
                                disabled={procesandoModeracion}
                                className="text-zinc-500 hover:text-white transition-colors p-1"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* DETALLES DE LA ENTIDAD */}
                        <div className="bg-zinc-950/60 border border-white/5 p-3 rounded-xl flex flex-col gap-1.5 text-xs">
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-500 text-[10px] uppercase font-bold">Operador:</span>
                                <span className="font-bold text-zinc-200 uppercase truncate max-w-[200px]">
                                    {obtenerNombreMostrar(modalModeracion.operador)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-500 text-[10px] uppercase font-bold">Saldo Actual:</span>
                                <span className={`font-mono font-bold text-xs ${
                                    Number(modalModeracion.operador.saldoWallet || modalModeracion.operador.saldo || modalModeracion.operador.balance || 0) < 2000
                                        ? 'text-orange-400'
                                        : 'text-emerald-400'
                                }`}>
                                    ${Number(modalModeracion.operador.saldoWallet || modalModeracion.operador.saldo || modalModeracion.operador.balance || 0).toLocaleString('es-CO')} COP
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-500 text-[10px] uppercase font-bold">Acción Requerida:</span>
                                <span className={`font-extrabold text-[10px] uppercase px-2 py-0.5 rounded border ${
                                    modalModeracion.accion === 'SUSPENDER'
                                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                        : modalModeracion.accion === 'APROBAR'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                }`}>
                                    {modalModeracion.accion} OPERADOR
                                </span>
                            </div>
                        </div>

                        {/* CAPTURA DE CAUSA RAZONADA */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                                <AlertTriangle size={12} className="text-yellow-500" />
                                Causa Razonada / Justificación Auditada (Obligatoria):
                            </label>
                            <textarea
                                rows={3}
                                value={justificacion}
                                onChange={(e) => setJustificacion(e.target.value)}
                                placeholder="Ingrese el motivo detallado de la moderación para el libro de auditoría central..."
                                disabled={procesandoModeracion || (modalModeracion.accion === 'ACTIVAR' && Number(modalModeracion.operador.saldoWallet || modalModeracion.operador.saldo || modalModeracion.operador.balance || 0) < 2000)}
                                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/40 transition-colors uppercase resize-none font-mono disabled:opacity-50"
                            />
                        </div>

                        {errorModal && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 text-[10px] text-red-400 font-bold flex items-center gap-2">
                                <ShieldAlert size={14} className="shrink-0" />
                                <span>{errorModal}</span>
                            </div>
                        )}

                        {/* BOTONES DE ACCIÓN */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                            <button
                                onClick={cerrarModalModeracion}
                                disabled={procesandoModeracion}
                                className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={ejecutarModeracion}
                                disabled={procesandoModeracion || (modalModeracion.accion === 'ACTIVAR' && Number(modalModeracion.operador.saldoWallet || modalModeracion.operador.saldo || modalModeracion.operador.balance || 0) < 2000)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-white shadow-lg transition active:scale-95 flex items-center gap-2 ${
                                    modalModeracion.accion === 'SUSPENDER'
                                        ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20'
                                        : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {procesandoModeracion && <Loader size={12} className="animate-spin" />}
                                {procesandoModeracion ? 'Procesando...' : 'Confirmar y Auditar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListaOperadores;