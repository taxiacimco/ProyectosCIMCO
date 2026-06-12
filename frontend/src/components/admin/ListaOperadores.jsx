// Versión Arquitectura: V1.2 - Gestión Táctica de Operadores (Blindaje de Estado)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\admin\ListaOperadores.jsx
 * Misión: Gestión táctica de operadores con filtrado dinámico y control de estado en tiempo real.
 * Integridad: Blindaje estricto en la mutación de estados mediante Firestore.
 */

import React, { useState, useEffect } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, onSnapshot, doc, updateDoc, query } from 'firebase/firestore';

const ListaOperadores = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        const q = query(collection(db, FIRESTORE_PATHS.users));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsuarios(lista);
        });
        return () => unsubscribe();
    }, []);

    const toggleEstado = async (id, estadoActual) => {
        try {
            // 🛡️ Actualización atómica con validación de referencia
            const userRef = doc(db, FIRESTORE_PATHS.users, id);
            await updateDoc(userRef, { isActive: !estadoActual });
        } catch (error) {
            console.error("❌ [CIMCO-ADMIN-ERROR] Fallo al mutar estado de operador:", error);
        }
    };

    return (
        <div className="glass-panel p-6">
            <input 
                placeholder="Filtrar operadores..."
                className="w-full bg-zinc-900/50 p-2 border border-white/5 rounded-lg text-xs mb-4 text-white"
                onChange={(e) => setBusqueda(e.target.value)}
            />
            <table className="w-full text-left text-xs font-mono">
                <thead>
                    <tr className="text-zinc-500 uppercase border-b border-white/5">
                        <th className="pb-2">Operador</th>
                        <th className="pb-2">Rol</th>
                        <th className="pb-2">Estado</th>
                        <th className="pb-2">Acción</th>
                    </tr>
                </thead>
                <tbody>
                    {usuarios.filter(u => u.nombre?.toLowerCase().includes(busqueda.toLowerCase())).map(u => (
                        <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                            <td className="py-4 text-zinc-200">{u.nombre || 'N/A'}</td>
                            <td className="text-zinc-400">{u.role || 'N/A'}</td>
                            <td>
                                <span className={`px-2 py-1 rounded border ${u.isActive ? 'border-green-900/50 text-green-400' : 'border-red-900/50 text-red-400'}`}>
                                    {u.isActive ? 'ACTIVO' : 'BLOQUEADO'}
                                </span>
                            </td>
                            <td>
                                <button onClick={() => toggleEstado(u.id, u.isActive)} className="text-cyan-400 hover:text-white">
                                    {u.isActive ? 'SUSPENDER' : 'ACTIVAR'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ListaOperadores;