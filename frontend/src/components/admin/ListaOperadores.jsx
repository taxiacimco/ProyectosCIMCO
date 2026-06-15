// Versión Arquitectura: V14.1 - Sincronización de Matriz Operativa V14.0 y Blindaje Anti-Undefined
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\admin\ListaOperadores.jsx
 * Misión: Renderizar la malla de operadores con tolerancia a fallos en la transición de nomenclaturas (rol -> role).
 * Integridad: Resolución híbrida de variables legacy y adición estricta de Glassmorphism CIMCO-UI V9.3.
 */

import React, { useState, useEffect } from 'react';
// 🛡️ Gobernanza de Rutas: Uso de alias absoluto @/ y consumo del objeto global
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, onSnapshot, doc, updateDoc, query } from 'firebase/firestore';

const ListaOperadores = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [errorFirestore, setErrorFirestore] = useState(null);

    useEffect(() => {
        // 🛡️ Previene quiebres si el path global no está montado a tiempo
        const pathColeccion = FIRESTORE_PATHS?.users || 'users'; 
        
        const q = query(collection(db, pathColeccion));
        
        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                const lista = snapshot.docs.map(doc => {
                    const data = doc.data();
                    
                    // 🛡️ BLINDAJE ANTI-UNDEFINED & FUSIÓN ATÓMICA V14.0
                    // Normalizamos los datos antes de inyectarlos a la vista. 
                    // Si el atributo 'role' no existe, busca el legacy 'rol'. Si no hay 'isActive', asume true.
                    return { 
                        id: doc.id, 
                        ...data,
                        nombre: data?.nombre || data?.name || 'DESCONOCIDO',
                        email: data?.email || data?.correo || 'N/A',
                        role: data?.role || data?.rol || 'N/A',
                        isActive: data?.isActive !== undefined ? data.isActive : true 
                    };
                });
                
                setUsuarios(lista);
                setErrorFirestore(null);
            },
            (error) => {
                console.error("🚨 [CIMCO-FIRESTORE-AUTH-ERR] Error de permisos en pasarela de usuarios:", error.message);
                setErrorFirestore(error.message);
            }
        );

        return () => unsubscribe();
    }, []);

    const toggleEstado = async (id, currentStatus) => {
        try {
            const pathColeccion = FIRESTORE_PATHS?.users || 'users';
            const userRef = doc(db, pathColeccion, id);
            await updateDoc(userRef, {
                isActive: !currentStatus
            });
        } catch (error) {
            console.error("❌ Error al cambiar estado táctico:", error);
        }
    };

    // 🛡️ Filtro de búsqueda blindado contra variables nulas
    const usuariosFiltrados = usuarios.filter(u => {
        const searchStr = busqueda.toLowerCase();
        const nombre = (u?.nombre || '').toLowerCase();
        const email = (u?.email || '').toLowerCase();
        const rol = (u?.role || '').toLowerCase();
        
        return nombre.includes(searchStr) || email.includes(searchStr) || rol.includes(searchStr);
    });

    // ⚠️ ALERTA DE ARQUITECTURA VISUAL: Se gatilla solo si Firestore rechaza la lectura
    if (errorFirestore) {
        return (
            <div className="p-6 border border-red-500/20 bg-[#121214]/80 backdrop-blur-md rounded-xl text-center">
                <h3 className="text-red-500 font-black mb-2 tracking-tight">⚠️ ALERTA DE ARQUITECTURA</h3>
                <p className="text-red-400/80 text-xs font-mono uppercase tracking-widest">
                    Brecha de Seguridad o Permisos Insuficientes en Colección [{FIRESTORE_PATHS?.users}].
                    <br />Detalle: {errorFirestore}
                </p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4 animate-in fade-in duration-300">
            {/* Cabecera y Buscador - Estética CIMCO-UI Glassmorphism */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 border border-white/5 rounded-xl bg-[#121214]/80 backdrop-blur-md">
                <div>
                    <h2 className="text-lg font-black text-white tracking-tight uppercase">Malla de Operadores</h2>
                    <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Directorio Activo CIMCO</p>
                </div>
                <div className="w-full md:w-auto">
                    <input 
                        type="text" 
                        placeholder="BUSCAR OPERADOR..." 
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full md:w-64 px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono uppercase"
                    />
                </div>
            </div>

            {/* Tabla de Datos Ciber-Neo-Brutalista Refinada */}
            <div className="w-full overflow-x-auto rounded-xl border border-white/5 bg-[#121214]/80 backdrop-blur-md">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-black/40 text-[10px] uppercase font-mono tracking-widest text-zinc-500">
                            <th className="p-4 font-normal">Identidad / Operador</th>
                            <th className="p-4 font-normal">Contacto</th>
                            <th className="p-4 font-normal text-center">Rango Operativo</th>
                            <th className="p-4 font-normal text-center">Estado de Red</th>
                            <th className="p-4 font-normal text-right">Acción Táctica</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {usuariosFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-zinc-600 text-xs font-mono uppercase tracking-widest">
                                    No se detectaron operadores en la matriz de búsqueda
                                </td>
                            </tr>
                        ) : (
                            usuariosFiltrados.map((u) => (
                                <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-4">
                                        <div className="font-bold text-zinc-200 tracking-wide uppercase text-xs">{u.nombre}</div>
                                        <div className="text-[10px] text-zinc-600 font-mono tracking-widest">ID: {u.id.substring(0, 8)}...</div>
                                    </td>
                                    <td className="p-4 text-xs text-zinc-400 font-mono">
                                        {u.email}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border border-cyan-900/50 text-cyan-400 bg-cyan-500/5">
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-widest ${
                                            u.isActive 
                                                ? 'border-green-900/50 text-green-400 bg-green-500/5 shadow-[0_0_10px_rgba(34,197,94,0.1)]' 
                                                : 'border-red-900/50 text-red-400 bg-red-500/5 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                                        }`}>
                                            {u.isActive ? 'ACTIVO' : 'BLOQUEADO'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => toggleEstado(u.id, u.isActive)} 
                                            className={`text-[10px] font-bold tracking-wider uppercase transition-all px-3 py-1.5 rounded border ${
                                                u.isActive 
                                                    ? 'border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40' 
                                                    : 'border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/40'
                                            }`}
                                        >
                                            {u.isActive ? 'SUSPENDER' : 'ACTIVAR'}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ListaOperadores;