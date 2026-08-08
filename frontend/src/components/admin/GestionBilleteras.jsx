// Versión Arquitectura: V14.3 - Prevención Duplicidad Transaccional y Control Riguroso de Listeners
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\admin\GestionBilleteras.jsx
 * Misión: Monitoreo global de saldos y ejecución de ajustes de capital (Abono / Débito Manual) para todos los actores:
 *         Pasajeros, Mototaxistas, Motoparrilleros, Montacargas, Despachadores y Conductores.
 * Ajuste V14.3: 
 *   1. Eliminación de doble procesamiento de saldo encapsulando el respaldo de Firestore sólo si la API REST falla.
 *   2. Gestión de listeners mediante referencia mutable (unsubscribesRef) para evitar fugas de memoria en llamadas asíncronas.
 * UI Standard: CIMCO-UI V9.3 Pure Glassmorphism.
 */

import React, { useState, useEffect, useRef } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, addDoc, query, increment, serverTimestamp } from 'firebase/firestore';
import { 
    Wallet, Search, RefreshCw, ArrowUpRight, DollarSign, 
    AlertCircle, CheckCircle2, ShieldAlert, ServerOff, Loader
} from 'lucide-react';
// 🛡️ IMPORTANTE: Importación del helper de deduplicación
import { deduplicarEntidades } from '@/utils/deduplicar';

// ✅ Normalización de API_BASE_URL para evitar sufijos '/api' duplicados
const RAW_API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = RAW_API_URL.replace(/\/api\/?$/, '');

// 🛡️ Helper global de desduplicación para el Frontend
const deduplicarUsuarios = (lista) => {
    if (!Array.isArray(lista)) return [];
    if (typeof deduplicarEntidades === 'function') {
        return deduplicarEntidades(lista);
    }
    const mapaUnico = new Map();
    lista.forEach((item) => {
        if (!item) return;
        const key = item._id || item.id || item.email || item.telefono;
        if (key && !mapaUnico.has(key)) {
            mapaUnico.set(key, item);
        }
    });
    return Array.from(mapaUnico.values());
};

export const GestionBilleteras = () => {
    const [cuentas, setCuentas] = useState([]);
    const [walletsMap, setWalletsMap] = useState({});
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
    const [montoRecarga, setMontoRecarga] = useState('');
    const [tipoOperacion, setTipoOperacion] = useState('RECARGA'); // 'RECARGA' | 'DEBITO'
    const [procesandoRecarga, setProcesandoRecarga] = useState(false);
    const [mensajeNotificacion, setMensajeNotificacion] = useState(null);

    const isMounted = useRef(true);
    // 🛡️ Contenedor de funciones unsubscribe para prevensión de fugas de memoria
    const unsubscribesRef = useRef([]);

    const limpiarSuscripciones = () => {
        unsubscribesRef.current.forEach(unsub => {
            if (typeof unsub === 'function') unsub();
        });
        unsubscribesRef.current = [];
    };

    const mostrarNotificacion = (texto, tipo = 'exito') => {
        if (!isMounted.current) return;
        setMensajeNotificacion({ texto, tipo });
        setTimeout(() => {
            if (isMounted.current) setMensajeNotificacion(null);
        }, 4000);
    };

    // Helper para formatear nombres de nodos de la flota
    const obtenerNombreMostrar = (nodo) => {
        if (!nodo) return 'NODO DESCONOCIDO';
        const nombreDirecto = nodo.nombreUsuario || 
                              nodo.nombreCompleto || 
                              nodo.nombre || 
                              nodo.fullName || 
                              nodo.displayName || 
                              nodo.userName;

        if (nombreDirecto && nombreDirecto !== 'SIN REGISTRO') {
            return nombreDirecto;
        }

        if (nodo.email) {
            return nodo.email.split('@')[0].replace(/[._-]/g, ' ').toUpperCase();
        }

        return `ACTOR ${(nodo.rol || nodo.role || nodo.subrol || 'USUARIO').toUpperCase()}`;
    };

    // 🚀 OBTENER BÓVEDAS GLOBALMENTE (API REST + FALLBACK FIRESTORE REACTIVO SIN MEMORY LEAKS)
    const obtenerBovedasGlobales = async () => {
        isMounted.current = true;
        setCargando(true);
        limpiarSuscripciones();

        try {
            const token = localStorage.getItem('cimco_token');
            const res = await fetch(`${API_BASE_URL}/api/usuarios/directorio-global`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                const data = await res.json();
                const listaUsuariosBruta = data.usuarios || data.data || (Array.isArray(data) ? data : []);

                // 🛡️ APLICAMOS FILTRO ANTI-DUPLICADOS A LA RESPUESTA
                const listaUsuarios = deduplicarUsuarios(listaUsuariosBruta);

                if (isMounted.current) {
                    const listaProcesada = listaUsuarios.map(u => ({
                        id: u._id || u.id,
                        uid: u._id || u.id,
                        nombre: obtenerNombreMostrar(u),
                        telefono: u.telefono || 'N/A',
                        email: u.email || 'SIN_CORREO',
                        rol: u.rol || u.role || 'USUARIO',
                        subrol: u.subrol,
                        entidad: u.entidad,
                        origen: u.origen || 'USUARIOS',
                        saldo: Number(u.saldoWallet !== undefined ? u.saldoWallet : (u.billetera?.saldo !== undefined ? u.billetera.saldo : (u.saldo || u.balance || 0))),
                        rawUserData: u
                    }));

                    setCuentas(listaProcesada);
                    setCargando(false);
                    return; // Integración REST completada exitosamente
                }
            }
        } catch (err) {
            console.warn('⚠️ [CIMCO-BILLETERAS] Fallo al consultar directorio-global REST, ejecutando sincronización reactiva Firestore...', err);
        }

        if (!isMounted.current) return;

        // Fallback Firestore si API REST no responde
        const pathUsuarios = FIRESTORE_PATHS?.users || 'usuarios';
        const qUsers = query(collection(db, pathUsuarios));

        const unsubscribeUsers = onSnapshot(qUsers,
            (snapshot) => {
                if (!isMounted.current) return;
                const listaUsersBruta = snapshot.docs.map(docSnap => {
                    const u = docSnap.data();
                    const idDoc = docSnap.id;
                    return {
                        id: idDoc,
                        uid: idDoc,
                        nombre: obtenerNombreMostrar({ id: idDoc, ...u }),
                        telefono: u.telefono || 'N/A',
                        email: u.email || 'SIN_CORREO',
                        rol: u.rol || u.role || 'USUARIO',
                        subrol: u.subrol,
                        entidad: u.entidad,
                        origen: u.origen || 'USUARIOS',
                        saldo: Number(u.saldoWallet !== undefined ? u.saldoWallet : (u.billetera?.saldo !== undefined ? u.billetera.saldo : (u.saldo || u.balance || 0))),
                        rawUserData: u
                    };
                });

                // 🛡️ APLICAMOS FILTRO ANTI-DUPLICADOS TAMBIÉN EN FIRESTORE
                const listaUsers = deduplicarUsuarios(listaUsersBruta);

                setCuentas(listaUsers);
                setCargando(false);
            },
            (err) => {
                console.error('❌ [CIMCO-USERS-STREAM-ERROR]:', err);
                if (isMounted.current) {
                    mostrarNotificacion('Error al sincronizar directorio central de la flota', 'error');
                    setCargando(false);
                }
            }
        );

        const pathBilleteras = FIRESTORE_PATHS?.wallets || 'billeteras';
        const qWallets = query(collection(db, pathBilleteras));

        const unsubscribeWallets = onSnapshot(qWallets,
            (snapshot) => {
                if (!isMounted.current) return;
                const map = {};
                snapshot.docs.forEach(docSnap => {
                    map[docSnap.id] = {
                        id: docSnap.id,
                        ...docSnap.data()
                    };
                });
                setWalletsMap(map);
            },
            (err) => {
                console.error('❌ [CIMCO-WALLETS-STREAM-ERROR]:', err);
            }
        );

        unsubscribesRef.current.push(unsubscribeUsers, unsubscribeWallets);
    };

    useEffect(() => {
        obtenerBovedasGlobales();
        return () => {
            isMounted.current = false;
            limpiarSuscripciones();
        };
    }, []);

    // Sincronización de saldos dinámicos combinados entre backend y mapas Firestore
    const cuentasMapeadas = cuentas.map(c => {
        const wData = walletsMap[c.id] || {};
        const saldoFinal = wData.balance !== undefined ? wData.balance : (wData.saldo !== undefined ? wData.saldo : c.saldo);
        return {
            ...c,
            saldo: Number(saldoFinal),
            saldoWallet: Number(saldoFinal),
            existeEnWallets: Boolean(walletsMap[c.id])
        };
    });

    // 🔒 GARANTIZAR DEDUPLICACIÓN EN LAS CUENTAS UNIFICADAS
    const cuentasUnificadas = deduplicarUsuarios(cuentasMapeadas);

    // Mantener la selección sincronizada en vivo ante variaciones de saldo
    useEffect(() => {
        if (cuentaSeleccionada) {
            const actualizada = cuentasUnificadas.find(c => c.id === cuentaSeleccionada.id);
            if (actualizada && isMounted.current) {
                if (actualizada.saldo !== cuentaSeleccionada.saldo || actualizada.id !== cuentaSeleccionada.id) {
                    setCuentaSeleccionada(actualizada);
                }
            }
        }
    }, [walletsMap, cuentas]);

    // 🔍 FILTRADO EN TIEMPO REAL MULTICRITERIO
    const cuentasFiltradas = cuentasUnificadas.filter(c => {
        const queryStr = busqueda.toLowerCase().trim();
        const nombre = (c.nombre || '').toLowerCase();
        const telefono = (c.telefono || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const rol = (c.rol || '').toLowerCase();
        const subrol = (c.subrol || '').toLowerCase();
        const id = (c.id || '').toLowerCase();

        return (
            nombre.includes(queryStr) ||
            telefono.includes(queryStr) ||
            email.includes(queryStr) ||
            rol.includes(queryStr) ||
            subrol.includes(queryStr) ||
            id.includes(queryStr)
        );
    });

    const handleMontoChange = (e) => {
        const valRaw = e.target.value.replace(/\D/g, ''); 
        setMontoRecarga(valRaw);
    };

    // 💳 PROCESAR AJUSTE MULTIRROL DE SALDO (ABONO / DÉBITO MANUAL - PREVENCIÓN DUPLICADOS)
    const ejecutarRecarga = async (e) => {
        e.preventDefault();
        if (!cuentaSeleccionada || !montoRecarga) return;

        const montoNumerico = parseInt(montoRecarga, 10);
        if (isNaN(montoNumerico) || montoNumerico <= 0) {
            mostrarNotificacion('Ingrese un monto válido superior a $0 COP', 'error');
            return;
        }

        const saldoDisponible = Number(cuentaSeleccionada.saldoWallet ?? cuentaSeleccionada.saldo ?? 0);

        if (tipoOperacion === 'DEBITO' && montoNumerico > saldoDisponible) {
            mostrarNotificacion(`No puedes debitar más del saldo disponible ($${saldoDisponible.toLocaleString('es-CO')} COP)`, 'error');
            return;
        }

        setProcesandoRecarga(true);
        let transaccionExitosa = false;

        // 🎯 RUTA UNIVERSAL DE SALDOS REST
        const endpointDestino = `${API_BASE_URL}/api/usuarios/${cuentaSeleccionada.id}/saldo`;

        // Intentar ejecución vía Endpoint Backend Express Central
        try {
            const token = localStorage.getItem('cimco_token');
            const res = await fetch(endpointDestino, {
                method: 'PUT',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    monto: montoNumerico,
                    montoRecarga: montoNumerico,
                    tipoOperacion,
                    motivo: tipoOperacion === 'DEBITO' ? 'Devolución de Saldo' : 'Abono de Saldo'
                })
            });

            if (res.ok) {
                const respuesta = await res.json();
                if (respuesta.success || res.status === 200) {
                    transaccionExitosa = true;
                }
            }
        } catch (err) {
            console.warn('⚠️ API REST inaccesible o endpoint no disponible, aplicando fallback directo en Firestore...', err);
        }

        // 🛡️ Respaldo directo en Firestore ÚNICAMENTE si el Backend REST falló
        if (!transaccionExitosa) {
            try {
                const pathBilleteras = FIRESTORE_PATHS?.wallets || 'billeteras';
                const pathAuditoria = FIRESTORE_PATHS?.transactions || 'transacciones';

                const walletRef = doc(db, pathBilleteras, cuentaSeleccionada.id);
                const auditRef = collection(db, pathAuditoria);

                const deltaMonto = tipoOperacion === 'DEBITO' ? -montoNumerico : montoNumerico;

                if (cuentaSeleccionada.existeEnWallets) {
                    await updateDoc(walletRef, {
                        balance: increment(deltaMonto),
                        saldo: increment(deltaMonto),
                        saldoWallet: increment(deltaMonto),
                        ultimaActualizacion: serverTimestamp()
                    });
                } else {
                    const nuevoSaldoBase = Math.max(0, saldoDisponible + deltaMonto);
                    await setDoc(walletRef, {
                        usuarioId: cuentaSeleccionada.id,
                        nombreUsuario: cuentaSeleccionada.nombre,
                        rolUsuario: (cuentaSeleccionada.subrol || cuentaSeleccionada.rol || 'USUARIO').toUpperCase(),
                        balance: nuevoSaldoBase,
                        saldo: nuevoSaldoBase,
                        saldoWallet: nuevoSaldoBase,
                        creadoEl: serverTimestamp(),
                        ultimaActualizacion: serverTimestamp()
                    });
                }

                await addDoc(auditRef, {
                    usuarioId: cuentaSeleccionada.id,
                    nombreUsuario: cuentaSeleccionada.nombre,
                    tipo: tipoOperacion === 'DEBITO' ? 'DEBITO_MANUAL' : 'RECARGA_MANUAL',
                    monto: deltaMonto,
                    timestamp: serverTimestamp(),
                    referencia: `AJUSTE_MANUAL_ADMIN_${Date.now().toString().slice(-6)}`,
                    ejecutor: 'ADMINISTRADOR_SISTEMA'
                });

                transaccionExitosa = true;
            } catch (err) {
                console.error('❌ [CIMCO-RECARGA] Fallo transaccional:', err);
                mostrarNotificacion('Error al procesar el ajuste de saldo en la red de bóvedas', 'error');
                setProcesandoRecarga(false);
                return;
            }
        }

        if (isMounted.current && transaccionExitosa) {
            const msgConfirmacion = tipoOperacion === 'DEBITO'
                ? `Devolución exitosa de $${montoNumerico.toLocaleString('es-CO')} COP a ${cuentaSeleccionada.nombre}`
                : `Abono exitoso de $${montoNumerico.toLocaleString('es-CO')} COP a ${cuentaSeleccionada.nombre}`;
            
            mostrarNotificacion(msgConfirmacion, 'exito');
            setMontoRecarga('');
            setCuentaSeleccionada(null);
            setProcesandoRecarga(false);
            obtenerBovedasGlobales(); // Refrescar saldos inmediatamente
        }
    };

    // Helper para pintar etiquetas de rol ordenadas en CIMCO-UI V9.3
    const renderBadgeRol = (rol, subrol) => {
        const val = (subrol || rol || '').toUpperCase();
        if (val.includes('DESPACHADOR')) return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">DESPACHADOR TERMINAL</span>;
        if (val.includes('MOTOTAXI')) return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">MOTOTAXI</span>;
        if (val.includes('PARRILLERO')) return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-orange-500/10 text-orange-400 border border-orange-500/20">MOTOPARRILLERO</span>;
        if (val.includes('CARGA')) return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20">MONTACARGA</span>;
        if (val.includes('INTERMUNICIPAL')) return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">INTERMUNICIPAL</span>;
        if (val.includes('PASAJERO')) return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">PASAJERO CLIENTE</span>;
        return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-purple-500/10 text-purple-400 border border-purple-500/20">{val}</span>;
    };

    return (
        <div className="space-y-6 font-mono text-zinc-100 antialiased">
            
            {/* NOTIFICACIÓN FLOTANTE */}
            {mensajeNotificacion && (
                <div className={`fixed top-20 right-6 z-50 p-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-3 text-xs font-bold animate-in slide-in-from-top-4 ${
                    mensajeNotificacion.tipo === 'exito' 
                        ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300' 
                        : 'bg-red-950/80 border-red-500/30 text-red-300'
                }`}>
                    {mensajeNotificacion.tipo === 'exito' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span>{mensajeNotificacion.texto}</span>
                </div>
            )}

            {/* HEADER DE BARRA DE BÚSQUEDA Y CONTROL DE BÓVEDAS */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#121214]/80 p-4 rounded-2xl border border-white/5 backdrop-blur-md shadow-lg">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input 
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar pasajero, mototaxi, despachador, ID..."
                        className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-colors uppercase tracking-wider"
                    />
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <div className="bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-xl text-right">
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Bóvedas Registradas</p>
                        <p className="text-sm font-black text-cyan-400">{cuentasUnificadas.length} ACTORES</p>
                    </div>

                    <button 
                        onClick={obtenerBovedasGlobales}
                        disabled={cargando}
                        className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl text-zinc-300 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                        title="Refrescar saldos"
                    >
                        <RefreshCw size={16} className={cargando ? "animate-spin text-cyan-400" : ""} />
                    </button>
                </div>
            </div>

            {/* GRILLA PRINCIPAL Y CONSOLA DE RECARGA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* GRILLA DE BÓVEDAS (2 COLUMNAS EN LG) */}
                <div className="lg:col-span-2 backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-4 shadow-xl space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 px-1">
                        <Wallet size={14} className="text-cyan-400" /> GRILLA LOGÍSTICA DE SALDOS MULTIRROL
                    </h3>

                    {cargando ? (
                        <div className="p-12 text-center border border-white/5 bg-zinc-900/30 rounded-2xl text-zinc-500 text-xs flex flex-col items-center justify-center gap-2">
                            <Loader size={24} className="animate-spin text-cyan-400" />
                            Sincronizando estado financiero global...
                        </div>
                    ) : cuentasFiltradas.length === 0 ? (
                        <div className="p-12 text-center border border-dashed border-white/5 bg-zinc-900/30 rounded-2xl text-zinc-500 text-xs flex flex-col items-center justify-center gap-2">
                            <ServerOff size={28} className="text-zinc-700" />
                            No se encontraron usuarios o conductores coincidentes.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
                            {cuentasFiltradas.map((cuenta) => {
                                const esSeleccionado = cuentaSeleccionada?.id === cuenta.id;
                                return (
                                    <div 
                                        key={cuenta.id}
                                        onClick={() => setCuentaSeleccionada(cuenta)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                                            esSeleccionado 
                                                ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.1)] scale-[1.01]' 
                                                : 'bg-zinc-950/40 border-white/5 hover:border-white/20 hover:bg-zinc-900/80'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="truncate">
                                                <h4 className="text-xs font-black text-white uppercase truncate">{cuenta.nombre}</h4>
                                                <p className="text-[10px] text-zinc-500 truncate">TEL: {cuenta.telefono}</p>
                                            </div>
                                            {renderBadgeRol(cuenta.rol, cuenta.subrol)}
                                        </div>

                                        <div className="flex items-end justify-between pt-2 border-t border-white/5">
                                            <div>
                                                <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Saldo Disponible</p>
                                                <p className="text-sm font-black text-emerald-400">
                                                    ${(cuenta.saldo || 0).toLocaleString('es-CO')} <span className="text-[9px] text-zinc-500">COP</span>
                                                </p>
                                            </div>

                                            <button className={`p-2 rounded-lg text-xs font-bold transition-colors ${
                                                esSeleccionado 
                                                    ? 'bg-cyan-500 text-black' 
                                                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                                            }`}>
                                                <ArrowUpRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* CONSOLA DE TRANSMISIÓN / RECARGA (1 COLUMNA EN LG) */}
                <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-4 shadow-xl space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 px-1">
                        <DollarSign size={14} className="text-emerald-400" /> CONSOLA DE AJUSTE DE SALDO
                    </h3>

                    <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-5 sticky top-24">
                        {!cuentaSeleccionada ? (
                            <div className="py-16 text-center space-y-3 text-zinc-500">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto text-zinc-400">
                                    <ShieldAlert size={20} className="animate-pulse" />
                                </div>
                                <p className="text-xs font-bold uppercase tracking-wider">
                                    Selecciona un usuario o conductor de la grilla para abrir compuerta transaccional.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={ejecutarRecarga} className="space-y-4 animate-in fade-in duration-200">
                                <div className="bg-zinc-950 p-3.5 rounded-xl border border-cyan-500/30 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Destinatario</span>
                                        {renderBadgeRol(cuentaSeleccionada.rol, cuentaSeleccionada.subrol)}
                                    </div>
                                    <p className="text-xs font-black text-white uppercase">{cuentaSeleccionada.nombre}</p>
                                    <p className="text-[10px] text-zinc-400 truncate">ID: {cuentaSeleccionada.id}</p>
                                    <div className="pt-2 flex justify-between items-center text-[10px] border-t border-white/5 text-zinc-400">
                                        <span>Saldo Actual:</span>
                                        <span className="font-bold text-emerald-400">${(cuentaSeleccionada.saldo || 0).toLocaleString('es-CO')} COP</span>
                                    </div>
                                </div>

                                {/* Toggle Selector de Operación */}
                                <div className="flex gap-2 mb-4 bg-zinc-950 p-1 rounded-lg border border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setTipoOperacion('RECARGA')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                                            tipoOperacion === 'RECARGA'
                                                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                                                : 'text-zinc-400 hover:text-white'
                                        }`}
                                    >
                                        + Recargar / Abonar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTipoOperacion('DEBITO')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                                            tipoOperacion === 'DEBITO'
                                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                                : 'text-zinc-400 hover:text-white'
                                        }`}
                                    >
                                        - Débito / Devolución
                                    </button>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                        {tipoOperacion === 'DEBITO' ? 'Monto a Debitar (COP)' : 'Monto a Recargar (COP)'}
                                    </label>
                                    <div className="relative">
                                        <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 font-bold ${tipoOperacion === 'DEBITO' ? 'text-red-400' : 'text-emerald-400'}`}>$</span>
                                        <input 
                                            type="text"
                                            value={montoRecarga}
                                            onChange={handleMontoChange}
                                            placeholder="Ej: 20000"
                                            disabled={procesandoRecarga}
                                            required
                                            className={`w-full bg-zinc-950 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:outline-none transition-colors ${
                                                tipoOperacion === 'DEBITO' ? 'focus:border-red-500/50' : 'focus:border-emerald-500/50'
                                            }`}
                                        />
                                    </div>
                                </div>

                                {/* BOTONES RÁPIDOS DE RECARGA */}
                                <div className="grid grid-cols-3 gap-2">
                                    {[10000, 20000, 50000].map((valor) => (
                                        <button
                                            type="button"
                                            key={valor}
                                            onClick={() => setMontoRecarga(valor.toString())}
                                            disabled={procesandoRecarga}
                                            className="py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[10px] font-bold text-zinc-300 hover:text-white transition-colors"
                                        >
                                            {tipoOperacion === 'DEBITO' ? '-' : '+'}${(valor / 1000)}k
                                        </button>
                                    ))}
                                </div>

                                <div className="pt-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCuentaSeleccionada(null)}
                                        disabled={procesandoRecarga}
                                        className="w-1/3 py-2.5 rounded-xl border border-white/10 bg-zinc-900 text-zinc-400 hover:text-white text-xs font-bold uppercase transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={procesandoRecarga || !montoRecarga}
                                        className={`w-2/3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${
                                            tipoOperacion === 'DEBITO'
                                                ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                                                : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                        }`}
                                    >
                                        {procesandoRecarga ? (
                                            <>
                                                <Loader size={14} className={`animate-spin ${tipoOperacion === 'DEBITO' ? 'text-white' : 'text-black'}`} />
                                                <span>Procesando...</span>
                                            </>
                                        ) : (
                                            tipoOperacion === 'DEBITO' ? 'PROCESAR DEVOLUCIÓN' : 'ABONAR SALDO'
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default GestionBilleteras;