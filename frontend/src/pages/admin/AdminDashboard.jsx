// Versión Arquitectura: V10.0 - Consola Maestra: Telemetría La Jagua y Gobernanza de Radar
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\admin\AdminDashboard.jsx
 * Misión: Orquestar submódulos de administración, interceptar token de Nivel 99 y pintar matriz estadística de flota.
 * Integridad: Fusión Atómica. Diseño Glassmorphism Ciber-Neo-Brutalista.
 */

import React, { useState } from 'react';
import { 
    ShieldAlert, Wallet, Map, UserCheck, Zap, QrCode, 
    Activity, Signal, BarChart3, Users, Crosshair 
} from 'lucide-react';

// 🚀 GOBERNANZA DE RUTAS: Importación centralizada y alias absolutos
import { useAuth } from '@/hooks/useAuth';
import ListaOperadores from '@/components/admin/ListaOperadores';
import AdminPanel from '@/pages/admin/AdminPanel';
import MapaOperativo from '@/components/admin/MapaOperativo';
import QrGenerator from '@/pages/admin/QrGenerator';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [pestanaActiva, setPestanaActiva] = useState('dashboard');

    // 🔐 GOBERNANZA: Nivel de acceso interceptado desde el JWT (Nivel 99 para CEO)
    const accessLevel = user?.access_level || 0;
    const tieneAccesoFinanciero = accessLevel >= 90;
    const tieneAccesoMapa = accessLevel >= 50;

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 flex font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
            
            {/* GRID DE FONDO TÁCTICO */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

            {/* SIDEBAR TÁCTICO - Ciber-Neo-Brutalista */}
            <aside className="w-64 bg-[#121214]/90 backdrop-blur-xl border-r border-white/5 flex flex-col relative z-10">
                <div className="p-6 border-b border-white/5 relative overflow-hidden">
                    {/* Resplandor de Neón */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />
                    
                    <h2 className="text-xl font-black tracking-tighter text-white relative z-10">TAXIA <span className="text-cyan-400">CIMCO</span></h2>
                    <p className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase mt-1 relative z-10">Consola Central • La Jagua</p>
                    
                    <div className="mt-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                            <Zap size={14} className="text-cyan-400" />
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase">Operador Autorizado</p>
                            <p className="text-xs font-bold text-white truncate max-w-[140px]">{user?.nombre || 'Nodo Root'}</p>
                        </div>
                    </div>
                </div>

                <nav className="p-4 space-y-1.5 flex-1">
                    {[
                        { id: 'dashboard', icono: Activity, texto: 'Telemetría Global' },
                        { id: 'operadores', icono: UserCheck, texto: 'Malla de Operadores' },
                        { id: 'recargas', icono: Wallet, texto: 'Tesorería Nivel 99', reqNivel: 90 },
                        { id: 'mapa', icono: Map, texto: 'Radar Geoespacial', reqNivel: 50 },
                        { id: 'qr', icono: QrCode, texto: 'Matriz QR', reqNivel: 90 }
                    ].map((item) => {
                        if (item.reqNivel && accessLevel < item.reqNivel) return null;
                        
                        const activo = pestanaActiva === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setPestanaActiva(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono uppercase tracking-widest transition-all duration-200 border ${
                                    activo 
                                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_15px_-3px_rgba(6,182,212,0.1)]' 
                                    : 'bg-transparent text-zinc-500 border-transparent hover:bg-white/[0.02] hover:text-zinc-300'
                                }`}
                            >
                                <item.icono size={16} className={activo ? 'animate-pulse' : ''} />
                                {item.texto}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <div className="bg-[#18181b] rounded-xl border border-white/5 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute" />
                            <span className="w-2 h-2 rounded-full bg-emerald-500 relative" />
                            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Servidor Core</span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400">ONLINE</span>
                    </div>
                </div>
            </aside>

            {/* ÁREA DE RENDERIZADO PRINCIPAL */}
            <main className="flex-1 overflow-y-auto p-8 relative z-10">
                
                {/* 1. MÓDULO: TELEMETRÍA GLOBAL (Dashboard) */}
                {pestanaActiva === 'dashboard' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-black tracking-tight text-white">Estado de la Flota</h1>
                                <p className="text-xs text-zinc-500 font-mono tracking-widest mt-1 uppercase flex items-center gap-2">
                                    <Crosshair size={12} className="text-cyan-500" /> Sector: La Jagua de Ibirico
                                </p>
                            </div>
                        </div>

                        {/* Tarjetas Estadísticas Glassmorphism */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-[#121214]/80 backdrop-blur-md border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20"><Signal size={48} className="text-cyan-500" /></div>
                                <h3 className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">Unidades en Radar</h3>
                                <div className="mt-4 flex items-end gap-3">
                                    <span className="text-4xl font-black text-white">42</span>
                                    <span className="text-xs text-emerald-400 font-mono mb-1 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20">Activos</span>
                                </div>
                            </div>

                            <div className="bg-[#121214]/80 backdrop-blur-md border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20"><BarChart3 size={48} className="text-emerald-500" /></div>
                                <h3 className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">Volumen Transaccional</h3>
                                <div className="mt-4 flex items-end gap-3">
                                    <span className="text-4xl font-black text-white">128</span>
                                    <span className="text-xs text-zinc-500 font-mono mb-1">Viajes Hoy</span>
                                </div>
                            </div>

                            <div className="bg-[#121214]/80 backdrop-blur-md border border-emerald-500/20 p-6 rounded-2xl relative overflow-hidden shadow-[0_0_30px_-10px_rgba(16,185,129,0.1)]">
                                <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={48} className="text-emerald-500" /></div>
                                <h3 className="text-[10px] text-emerald-400/70 font-mono uppercase tracking-widest">Recaudo Estimado</h3>
                                <div className="mt-4 flex items-end gap-3">
                                    <span className="text-4xl font-black text-emerald-400">$850K</span>
                                    <span className="text-xs text-emerald-500 font-mono mb-1">COP</span>
                                </div>
                            </div>
                        </div>

                        {/* Contenedor futuro para gráficos de calor o viajes en vivo */}
                        <div className="bg-[#121214]/80 backdrop-blur-md border border-white/5 p-8 rounded-2xl h-64 flex flex-col items-center justify-center text-center">
                            <Activity size={32} className="text-zinc-700 mb-4" />
                            <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Área designada para el Gráfico de Flujo Operativo<br/>(Pendiente de conexión con MongoDB Aggregation Pipeline)</p>
                        </div>
                    </div>
                )}

                {/* 2. MÓDULO: MALLA DE OPERADORES */}
                {pestanaActiva === 'operadores' && (
                    <div className="animate-in fade-in duration-300">
                        <ListaOperadores />
                    </div>
                )}

                {/* 3. MÓDULO: MATRIZ QR */}
                {pestanaActiva === 'qr' && (
                    tieneAccesoFinanciero ? (
                        <div className="animate-in fade-in duration-300">
                            <QrGenerator />
                        </div>
                    ) : (
                        <BloqueoSeguridad modulo="Generador de Códigos QR" />
                    )
                )}

                {/* 4. MÓDULO: TESORERÍA (AdminPanel) */}
                {pestanaActiva === 'recargas' && (
                    tieneAccesoFinanciero ? (
                        <div className="animate-in fade-in duration-300">
                            <AdminPanel />
                        </div>
                    ) : (
                        <BloqueoSeguridad modulo="Tesorería Central" />
                    )
                )}

                {/* 5. MÓDULO: RADAR GEOESPACIAL (MapaOperativo) */}
                {pestanaActiva === 'mapa' && (
                    tieneAccesoMapa ? (
                        <div className="h-full animate-in fade-in duration-300">
                            <MapaOperativo />
                        </div>
                    ) : (
                        <BloqueoSeguridad modulo="Radar Táctico" />
                    )
                )}
            </main>
        </div>
    );
};

// Componente atómico interno para el manejo de bloqueos de seguridad visuales
const BloqueoSeguridad = ({ modulo }) => (
    <div className="flex flex-col items-center justify-center h-full text-red-500 animate-in zoom-in-95 duration-300">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
            <ShieldAlert size={40} className="text-red-500 animate-pulse" />
        </div>
        <h2 className="text-xl font-black text-white mb-2 tracking-tight">ACCESO DENEGADO</h2>
        <p className="font-mono text-xs uppercase text-red-400 tracking-widest text-center max-w-md">
            Tu nivel de autorización no es suficiente para acceder al módulo de <span className="font-bold text-white">{modulo}</span>. Se requieren credenciales de Nodo Root.
        </p>
    </div>
);

export default AdminDashboard;