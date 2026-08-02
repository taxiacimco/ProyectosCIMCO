// Versión Arquitectura: V15.1 - Integración Híbrida MongoDB REST (Puerto 3000) + Fallback Firestore + Deduplicación Anti-Duplicados
/**
 * Ubicación: frontend\src\components\admin\ListaOperadores.jsx
 * Misión: Renderizar la malla de operadores recuperando registros desde el backend (MongoDB)
 *         a través del puerto 3000 con fallback a Firestore para garantizar la presencia de operadores registrados.
 * UI Standard: CIMCO-UI V9.3 Pure Glassmorphism.
 */

import React, { useState, useEffect, useRef } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, onSnapshot, doc, updateDoc, query } from 'firebase/firestore';
import { Shield, ShieldAlert, UserCheck, UserX, Search, Loader, Database, CheckCircle, Hourglass } from 'lucide-react';
// 🛡️ IMPORTANTE: Importación del helper de deduplicación
import { deduplicarEntidades } from '../../utils/deduplicar';

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

    const cargarOperadores = async () => {
        if (conductoresProp) {
            setLoading(false);
            return;
        }

        isMounted.current = true;
        setLoading(true);

        try {
            // Petición directa al Backend Express en el Puerto 3000
            const response = await fetch('http://localhost:3000/api/conductores');
            if (response.ok) {
                const data = await response.json();
                const listaMongo = Array.isArray(data) ? data : (data.conductores || data.data || []);
                
                if (isMounted.current) {
                    const normalizados = listaMongo.map(u => normalizarEntidadUsuario(u._id || u.id, u));
                    
                    // 🛡️ APLICAMOS FILTRO ANTI-DUPLICADOS ANTES DE GUARDAR EN EL ESTADO
                    const listaLimpia = deduplicarEntidades(normalizados);

                    setUsuariosLocal(listaLimpia);
                    setLoading(false);
                    setErrorFirestore(null);
                    return; // ¡Carga exitosa desde MongoDB!
                }
            }
        } catch (err) {
            console.warn("⚠️ [CIMCO-REST]: Fallo al consultar backend en puerto 3000, recurriendo a Firestore...", err);
        }

        // Fallback a Firestore si la API no responde
        const pathColeccion = FIRESTORE_PATHS?.users || 'usuarios'; 
        const q = query(collection(db, pathColeccion));
        
        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                if (!isMounted.current) return;
                const lista = snapshot.docs.map(docSnap => 
                    normalizarEntidadUsuario(docSnap.id, docSnap.data())
                );
                
                // 🛡️ APLICAMOS FILTRO ANTI-DUPLICADOS TAMBIÉN EN EL FALLBACK DE FIRESTORE
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

        return () => {
            isMounted.current = false;
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    };

    useEffect(() => {
        cargarOperadores();
    }, [conductoresProp]);

    // 🛡️ En caso de que conductoresProp venga desde un componente padre, aplicamos deduplicación
    const listaBruta = conductoresProp || usuariosLocal;
    const listaMapeada = deduplicarEntidades(listaBruta);

    const handleAprobar = async (id, nuevoEstado = 'APROBADO') => {
        if (onAprobarConductor) {
            onAprobarConductor(id, nuevoEstado);
            return;
        }

        try {
            // Intentar aprobar vía API REST (Puerto 3000)
            const res = await fetch(`http://localhost:3000/api/conductores/${id}/aprobar`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado, isActive: true })
            });

            if (res.ok) {
                cargarOperadores();
                return;
            }
        } catch (e) {
            console.warn("⚠️ Fallo actualización REST, intentando en Firestore...", e);
        }

        try {
            const pathColeccion = FIRESTORE_PATHS?.users || 'usuarios';
            const docRef = doc(db, pathColeccion, id);
            await updateDoc(docRef, {
                estado: nuevoEstado,
                isActive: true
            });
        } catch (err) {
            console.error(`❌ [CIMCO-MUTATION-ERROR] No se pudo aprobar el operador ${id}:`, err);
        }
    };

    const toggleEstado = async (id, currentActive) => {
        const nuevoEstadoBool = !currentActive;
        const nuevoEstadoString = nuevoEstadoBool ? 'APROBADO' : 'INACTIVO';

        try {
            // Intentar alterar estado vía API REST (Puerto 3000)
            const res = await fetch(`http://localhost:3000/api/conductores/${id}/estado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: nuevoEstadoBool, estado: nuevoEstadoString })
            });

            if (res.ok) {
                cargarOperadores();
                return;
            }
        } catch (e) {
            console.warn("⚠️ Fallo cambio estado REST, intentando Firestore...", e);
        }

        try {
            const pathColeccion = FIRESTORE_PATHS?.users || 'usuarios';
            const docRef = doc(db, pathColeccion, id);

            await updateDoc(docRef, {
                isActive: nuevoEstadoBool,
                estado: nuevoEstadoString 
            });
        } catch (err) {
            console.error(`❌ [CIMCO-MUTATION-ERROR] No se pudo alterar el estado ${id}:`, err);
        }
    };

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
                <div className="w-full backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto w-full">
                        {usuariosFiltrados.length === 0 ? (
                            <div className="p-12 flex flex-col items-center justify-center text-center gap-2">
                                <Database className="text-zinc-700 animate-pulse" size={28} />
                                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">No se localizan coincidencias</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.01] text-[9px] uppercase tracking-widest text-zinc-500 font-black">
                                        <th className="p-4 pl-6">Operador</th>
                                        <th className="p-4">Teléfono</th>
                                        <th className="p-4">Subrol</th>
                                        <th className="p-4">Estado</th>
                                        <th className="p-4">Saldo Wallet</th>
                                        <th className="p-4 text-right pr-6">Acciones / Moderación</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-xs text-zinc-300">
                                    {usuariosFiltrados.map((c) => {
                                        const idValido = c.id || c._id;
                                        const keyEstable = idValido || `op-node-${Math.random()}`;
                                        const subrolVisual = c.subrol || c.rol || c.role || 'Mototaxi';
                                        const estaAprobado = c.estado === 'APROBADO' || c.estado === 'active';
                                        const saldoNum = Number(c.saldoWallet || c.saldo || c.balance || 0);

                                        return (
                                            <tr key={keyEstable} className="hover:bg-white/[0.01] transition-colors duration-150">
                                                <td className="p-4 pl-6">
                                                    <div className="font-bold text-zinc-200 uppercase truncate max-w-[180px]">
                                                        {obtenerNombreMostrar(c)}
                                                    </div>
                                                    <div className="text-[9px] text-zinc-600 font-mono tracking-wide mt-0.5">ID: {idValido}</div>
                                                </td>
                                                <td className="p-4 font-mono text-zinc-400">
                                                    {c.telefono || c.telefonoMovil || 'S/N'}
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-white/5 bg-zinc-800/40 text-zinc-400 uppercase tracking-wider inline-flex items-center gap-1">
                                                        <Shield size={10} />
                                                        {subrolVisual}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {estaAprobado ? (
                                                        <span className="inline-flex items-center gap-1 rounded bg-green-900/40 px-2.5 py-1 text-[10px] text-green-400 font-bold border border-green-500/40">
                                                            <CheckCircle size={11} /> ✓ APROBADO
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded bg-yellow-900/40 px-2.5 py-1 text-[10px] text-yellow-400 font-bold border border-yellow-500/40 animate-pulse">
                                                            <Hourglass size={11} /> ⏳ PENDIENTE
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 font-mono font-bold text-emerald-400">
                                                    ${saldoNum.toLocaleString('es-CO')} COP
                                                </td>
                                                <td className="p-4 text-right pr-6 flex items-center justify-end gap-2">
                                                    {!estaAprobado && (
                                                        <button
                                                            onClick={() => handleAprobar(idValido, 'APROBADO')}
                                                            className="rounded bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-[10px] text-white font-bold transition uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95"
                                                        >
                                                            Aprobar Licencia
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => toggleEstado(idValido, c.isActive ?? estaAprobado)} 
                                                        className={`text-[9px] font-black tracking-widest uppercase transition-all duration-200 px-2.5 py-1.5 rounded-lg border active:scale-95 ${
                                                            estaAprobado 
                                                                ? 'border-red-500/20 text-red-400 hover:bg-red-500/10' 
                                                                : 'border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10'
                                                        }`}
                                                    >
                                                        {estaAprobado ? 'SUSPENDER' : 'ACTIVAR'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListaOperadores;