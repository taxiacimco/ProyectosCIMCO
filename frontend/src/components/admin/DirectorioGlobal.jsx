// Versión Arquitectura: V2.1.0 - Consola de Control de Directorio Global CIMCO NEXUS con Deduplicación
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\admin\DirectorioGlobal.jsx
 * Misión: Monitoreo, filtrado y auditoría unificada de todo el personal (Pasajeros, Despachadores, Operadores, Admin).
 * UI Standard: CIMCO-UI V9.3 Pure Glassmorphism.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader, RefreshCw, Users, Shield, UserCheck, Radio } from 'lucide-react';
// 🛡️ IMPORTANTE: Importación del helper de deduplicación
import { deduplicarEntidades } from '../../utils/deduplicar';

// Saneamiento de URL base para entornos locales y despliegues en Vercel
const RAW_API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = RAW_API_URL.replace(/\/api\/?$/, '');

// 🛡️ Helper global de deduplicación para el Frontend
const deduplicarUsuarios = (lista) => {
    if (!Array.isArray(lista)) return [];
    // Si la función importada existe la usamos; de lo contrario, evaluamos la lógica local en Map
    if (typeof deduplicarEntidades === 'function') {
        return deduplicarEntidades(lista);
    }
    const mapaUnico = new Map();
    lista.forEach((item) => {
        if (!item) return;
        const key = item._id || item.id || item.email || item.telefono || item.telefonoMovil;
        if (key && !mapaUnico.has(key)) {
            mapaUnico.set(key, item);
        }
    });
    return Array.from(mapaUnico.values());
};

export const DirectorioGlobal = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [filtroRol, setFiltroRol] = useState('TODOS');
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isMounted = useRef(true);

    const obtenerDirectorio = async () => {
        isMounted.current = true;
        setLoading(true);
        setError(null);

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
                // Extracción defensiva multiformato de lista de usuarios
                const listaData = data.usuarios || data.data || (Array.isArray(data) ? data : []);

                // 🔒 APLICAMOS FILTRO ANTI-DUPLICADOS
                const listaLimpia = deduplicarUsuarios(listaData);

                if (isMounted.current) {
                    setUsuarios(listaLimpia);
                    setLoading(false);
                }
            } else {
                if (isMounted.current) {
                    setError('Respuesta no válida del servidor central.');
                    setLoading(false);
                }
            }
        } catch (err) {
            console.error('❌ Error al obtener el directorio global:', err);
            if (isMounted.current) {
                setError('Fallo de conexión con la API del servidor central.');
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        obtenerDirectorio();
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Helper para normalizar y mostrar el nombre de entidad
    const getNombre = (u) => u.nombre || u.fullName || u.nombreCompleto || u.nombreUsuario || u.displayName || 'SIN REGISTRO';

    // Helper para badge visual de Rol / Subrol bajo especificación CIMCO-UI V9.3
    const renderRolBadge = (u) => {
        const rol = (u.rolNormalizado || u.rol || u.role || 'usuario').toLowerCase();
        const subrol = (u.subrol || rol).toUpperCase();

        if (rol === 'admin' || subrol === 'CEO') {
            return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] font-bold">{subrol}</span>;
        }
        if (rol === 'despachador' || subrol === 'DESPACHO') {
            return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[9px] font-bold">DESPACHADOR TERMINAL</span>;
        }
        if (rol === 'pasajero') {
            return <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded text-[9px] font-bold">PASAJERO CLIENTE</span>;
        }
        if (rol === 'conductor' || rol === 'operador') {
            return <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded text-[9px] font-bold">OPERADOR ({subrol})</span>;
        }
        return <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[9px] font-bold">{subrol}</span>;
    };

    // Filtrado en tiempo real con motor de búsqueda multicriterio
    const usuariosFiltrados = usuarios.filter((u) => {
        const rol = (u.rolNormalizado || u.rol || u.role || '').toLowerCase();
        const subrol = (u.subrol || '').toLowerCase();
        
        let coincideRol = true;
        if (filtroRol === 'pasajero') coincideRol = rol === 'pasajero';
        else if (filtroRol === 'despachador') coincideRol = rol === 'despachador' || subrol === 'despacho';
        else if (filtroRol === 'conductor') coincideRol = rol === 'conductor' || rol === 'operador';
        else if (filtroRol === 'admin') coincideRol = ['admin', 'ceo', 'secretaria', 'auxiliar'].includes(rol) || ['ceo', 'auxiliar'].includes(subrol);

        const query = busqueda.toLowerCase().trim();
        const nombre = getNombre(u).toLowerCase();
        const email = (u.email || '').toLowerCase();
        const tel = (u.telefono || u.telefonoMovil || '').toLowerCase();
        const id = (u._id || u.id || '').toLowerCase();

        const coincideBusqueda = nombre.includes(query) || email.includes(query) || tel.includes(query) || id.includes(query);

        return coincideRol && coincideBusqueda;
    });

    // Mantenimiento de métricas dinámicas
    const totalPasajeros = usuarios.filter(u => (u.rolNormalizado || u.rol || '').toLowerCase() === 'pasajero').length;
    const totalDespachadores = usuarios.filter(u => (u.rolNormalizado || u.rol || '').toLowerCase() === 'despachador' || (u.subrol || '').toLowerCase() === 'despacho').length;
    const totalConductores = usuarios.filter(u => ['conductor', 'operador'].includes((u.rolNormalizado || u.rol || '').toLowerCase())).length;
    const totalAdmin = usuarios.filter(u => ['admin', 'ceo', 'secretaria', 'auxiliar'].includes((u.rolNormalizado || u.rol || '').toLowerCase())).length;

    return (
        <div className="w-full flex flex-col gap-5 font-mono antialiased text-zinc-100">
            {/* TARJETAS DE MÉTRICAS GERENCIALES */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <button 
                    onClick={() => setFiltroRol('TODOS')} 
                    className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                        filtroRol === 'TODOS' ? 'bg-yellow-500/10 border-yellow-500/40' : 'bg-[#121214]/80 border-white/5 hover:border-white/20'
                    }`}
                >
                    <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">DIRECTORIO COMPLETO</span>
                    <span className="text-xl font-black text-white mt-1">{usuarios.length}</span>
                </button>

                <button 
                    onClick={() => setFiltroRol('pasajero')} 
                    className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                        filtroRol === 'pasajero' ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-[#121214]/80 border-white/5 hover:border-white/20'
                    }`}
                >
                    <span className="text-[9px] font-black tracking-widest text-cyan-500 uppercase">PASAJEROS</span>
                    <span className="text-xl font-black text-cyan-400 mt-1">{totalPasajeros}</span>
                </button>

                <button 
                    onClick={() => setFiltroRol('despachador')} 
                    className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                        filtroRol === 'despachador' ? 'bg-amber-500/10 border-amber-500/40' : 'bg-[#121214]/80 border-white/5 hover:border-white/20'
                    }`}
                >
                    <span className="text-[9px] font-black tracking-widest text-amber-500 uppercase">DESPACHADORES</span>
                    <span className="text-xl font-black text-amber-400 mt-1">{totalDespachadores}</span>
                </button>

                <button 
                    onClick={() => setFiltroRol('conductor')} 
                    className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                        filtroRol === 'conductor' ? 'bg-yellow-500/10 border-yellow-500/40' : 'bg-[#121214]/80 border-white/5 hover:border-white/20'
                    }`}
                >
                    <span className="text-[9px] font-black tracking-widest text-yellow-500 uppercase">CONDUCTORES</span>
                    <span className="text-xl font-black text-yellow-400 mt-1">{totalConductores}</span>
                </button>

                <button 
                    onClick={() => setFiltroRol('admin')} 
                    className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between col-span-2 md:col-span-1 ${
                        filtroRol === 'admin' ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-[#121214]/80 border-white/5 hover:border-white/20'
                    }`}
                >
                    <span className="text-[9px] font-black tracking-widest text-emerald-500 uppercase">PERSONAL ADMIN</span>
                    <span className="text-xl font-black text-emerald-400 mt-1">{totalAdmin}</span>
                </button>
            </div>

            {/* BARRA DE FILTRADO Y REFRESCAMIENTO */}
            <div className="w-full backdrop-blur-md bg-[#121214]/80 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input 
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="BUSCAR POR NOMBRE, TELÉFONO, EMAIL O ID..."
                        className="w-full bg-zinc-950/80 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/30 transition-colors uppercase tracking-wider"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <button 
                        onClick={obtenerDirectorio} 
                        disabled={loading}
                        className="p-2.5 bg-zinc-950/80 hover:bg-zinc-900 border border-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                        title="Recargar directorio"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin text-yellow-500' : ''} />
                    </button>

                    <div className="text-[10px] bg-zinc-950/60 border border-white/5 px-3 py-2 rounded-xl text-zinc-400 font-bold uppercase tracking-widest">
                        Mostrando: <span className="text-yellow-500">{usuariosFiltrados.length}</span> / {usuarios.length}
                    </div>
                </div>
            </div>

            {/* TABLA PRINCIPAL DE REGISTROS */}
            <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-4 shadow-xl overflow-hidden">
                {loading ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-2">
                        <Loader className="animate-spin text-yellow-500" size={24} />
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Consolidando Base de Datos Global...</span>
                    </div>
                ) : error ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-2 text-rose-400 text-xs uppercase font-bold">
                        <span>{error}</span>
                    </div>
                ) : usuariosFiltrados.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs uppercase font-bold">
                        <span>No se encontraron registros bajo el criterio seleccionado.</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 text-[9px] font-black uppercase text-zinc-500 tracking-widest">
                                    <th className="pb-3 pl-2">Usuario / Nombre</th>
                                    <th className="pb-3">Contacto</th>
                                    <th className="pb-3">Rol Registrado</th>
                                    <th className="pb-3">Entidad / Empresa</th>
                                    <th className="pb-3 pr-2 text-right">Origen DB</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs">
                                {usuariosFiltrados.map((u, idx) => {
                                    const nombre = getNombre(u);
                                    const email = u.email || 'SIN EMAIL';
                                    const tel = u.telefono || u.telefonoMovil || 'N/A';
                                    const empresa = u.cooperativa_nombre || u.empresa || u.cooperativa || u.entidad || 'SISTEMA CENTRAL';

                                    return (
                                        <tr key={u._id || u.id || idx} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="py-3 pl-2">
                                                <div className="font-bold text-white uppercase">{nombre}</div>
                                                <div className="text-[9px] text-zinc-500 font-mono">ID: {u._id || u.id}</div>
                                            </td>
                                            <td className="py-3 font-mono text-[11px]">
                                                <div className="text-zinc-300">{tel}</div>
                                                <div className="text-[9px] text-zinc-500">{email}</div>
                                            </td>
                                            <td className="py-3">
                                                {renderRolBadge(u)}
                                            </td>
                                            <td className="py-3 text-[10px] font-mono text-zinc-400 uppercase">
                                                {empresa}
                                            </td>
                                            <td className="py-3 pr-2 text-right">
                                                <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-zinc-950 text-zinc-500 border border-white/5 uppercase">
                                                    {u.origenColeccion || u.origen || 'DB'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DirectorioGlobal;