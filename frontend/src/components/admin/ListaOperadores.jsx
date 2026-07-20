// Versión Arquitectura: V14.5 - Blindaje de Ciclo de Vida y Sanitización Completa de Malla
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\admin\ListaOperadores.jsx
 * Misión: Renderizar la malla de operadores aplicando normalización estder y control estricto de desmonte.
 * Ajuste V14.5: Inyección de `isMounted` en callback de Firestore para erradicar fugas en cambios de vista rápidos.
 */

import React, { useState, useEffect, useRef } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, onSnapshot, doc, updateDoc, query } from 'firebase/firestore';
import { Shield, ShieldAlert, UserCheck, UserX, Search, Loader, Database } from 'lucide-react';

const ListaOperadores = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);
    const [errorFirestore, setErrorFirestore] = useState(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        setLoading(true);
        const pathColeccion = FIRESTORE_PATHS?.users || 'usuarios'; 
        const q = query(collection(db, pathColeccion));
        
        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                if (!isMounted.current) return;
                const lista = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const roleEstandar = (data?.role || data?.rol || 'operador').toLowerCase().trim();

                    let activoBool = true;
                    if (data?.isActive !== undefined) {
                        activoBool = data.isActive;
                    } else if (data?.estado !== undefined) {
                        activoBool = data.estado === 'active';
                    }

                    return {
                        id: doc.id,
                        ...data,
                        role: roleEstandar,
                        isActive: activoBool
                    };
                });
                
                setUsuarios(lista);
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
            unsubscribe();
        };
    }, []);

    const toggleEstado = async (id, currentActive) => {
        if (!id) return;
        try {
            const nuevoEstadoBool = !currentActive;
            const nuevoEstadoString = nuevoEstadoBool ? 'active' : 'inactive';

            const pathColeccion = FIRESTORE_PATHS?.users || 'usuarios';
            const docRef = doc(db, pathColeccion, id);

            await updateDoc(docRef, {
                isActive: nuevoEstadoBool,
                estado: nuevoEstadoString 
            });
        } catch (err) {
            console.error(`❌ [CIMCO-MUTATION-ERROR] No se pudo alterar el estado de la entidad ${id}:`, err);
        }
    };

    const usuariosFiltrados = usuarios.filter(u => {
        const queryNormalize = busqueda.toLowerCase().trim();
        const nombre = (u?.nombre || '').toLowerCase();
        const email = (u?.email || '').toLowerCase();
        const role = (u?.role || '').toLowerCase();
        const id = (u?.id || '').toLowerCase();

        return nombre.includes(queryNormalize) || 
               email.includes(queryNormalize) || 
               role.includes(queryNormalize) ||
               id.includes(queryNormalize);
    });

    return (
        <div className="w-full flex flex-col gap-4 font-mono antialiased text-zinc-100 relative">
            <div className="w-full backdrop-blur-md bg-[#121214]/80 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input 
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="FILTRAR POR ID, NOMBRE, CORREO O ROL..."
                        className="w-full bg-zinc-950/80 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/30 transition-colors uppercase tracking-wider"
                    />
                </div>
                <div className="text-[10px] bg-zinc-950/60 border border-white/5 px-3 py-1.5 rounded-lg text-zinc-400 font-bold uppercase tracking-widest shrink-0">
                    Malla: <span className="text-yellow-500">{usuariosFiltrados.length}</span> Nodos Visibles
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
                                        <th className="p-4 pl-6">Nodo / Identidad</th>
                                        <th className="p-4">Contacto de Red</th>
                                        <th className="p-4">Rol Asignado</th>
                                        <th className="p-4">Estado Radar</th>
                                        <th className="p-4 text-right pr-6">Acciones de Control</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-xs text-zinc-300">
                                    {usuariosFiltrados.map((u) => {
                                        const keyEstable = u.id || `op-node-${Math.random()}`;
                                        
                                        return (
                                            <tr key={keyEstable} className="hover:bg-white/[0.01] transition-colors duration-150">
                                                <td className="p-4 pl-6">
                                                    <div className="font-bold text-zinc-200 uppercase truncate max-w-[180px]">
                                                        {u?.nombre || 'SIN REGISTRO'}
                                                    </div>
                                                    <div className="text-[9px] text-zinc-600 font-mono tracking-wide mt-0.5">ID: {u.id}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-zinc-400 font-medium font-mono text-[11px]">{u?.email || 'N/A'}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider flex items-center gap-1 w-fit ${
                                                        u.role === 'admin' || u.role === 'gerente'
                                                            ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                                                            : u.role === 'conductor' || u.role === 'mototaxi'
                                                            ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                                                            : 'bg-zinc-800/40 border-white/5 text-zinc-400'
                                                    }`}>
                                                        <Shield size={10} />
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1.5 text-[9px] font-black tracking-widest px-2.5 py-1 rounded-md border ${
                                                        u.isActive 
                                                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' 
                                                            : 'border-red-500/30 text-red-400 bg-red-500/5'
                                                    }`}>
                                                        {u.isActive ? <UserCheck size={11} /> : <UserX size={11} />}
                                                        {u.isActive ? 'ACTIVO' : 'BLOQUEADO'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right pr-6">
                                                    <button 
                                                        onClick={() => toggleEstado(u.id, u.isActive)} 
                                                        className={`text-[9px] font-black tracking-widest uppercase transition-all duration-200 px-3 py-1.5 rounded-xl border active:scale-[0.97] ${
                                                            u.isActive 
                                                                ? 'border-red-500/20 text-red-400 hover:bg-red-500/10' 
                                                                : 'border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10'
                                                        }`}
                                                    >
                                                        {u.isActive ? 'SUSPENDER' : 'ACTIVAR'}
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