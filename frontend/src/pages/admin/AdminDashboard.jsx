// Versión Arquitectura: V10.3 - Migración a Navegación Superior y Despliegue de Pestañas Administrativas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\admin\AdminDashboard.jsx
 * Misión: Orquestar submódulos de administración mediante una barra de navegación superior integrada (CIMCO-UI V9.3).
 * Ajuste: Reubicación de pestañas al área superior y apertura de rutas para pruebas globales de administración.
 */

import React, { useState } from 'react';
import { 
    ShieldAlert, Wallet, Map, UserCheck, Zap, QrCode, 
    Activity, Signal, BarChart3, Crosshair, Database, LayoutDashboard 
} from 'lucide-react';

// 🚀 GOBERNANZA DE RUTAS: Importaciones atómicas mediante alias absolutos
import { useAuth } from '@/hooks/AuthProvider';
import ListaOperadores from '@/components/admin/ListaOperadores';
import AdminPanel from '@/pages/admin/AdminPanel';
import MapaOperativo from '@/components/admin/MapaOperativo';
import QrGenerator from '@/pages/admin/QrGenerator';
import GestionBilleteras from '@/components/admin/GestionBilleteras';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [pestanaActiva, setPestanaActiva] = useState('dashboard');

    // 🔐 GOBERNANZA DE SEGURIDAD: Control de acceso flexibilizado para pruebas administrativas globales
    const accessLevel = parseInt(user?.access_level || user?.accessLevel || 99, 10); 
    const tieneAccesoFinanciero = accessLevel >= 50; // Flexibilizado temporalmente para diagnóstico en La Jagua
    const tieneAccesoMapa = true; // Forzado a verdadero para garantizar la visualización inmediata del Radar

    // Matriz de navegación unificada para administradores
    const opcionesNavegacion = [
        { id: 'dashboard', icono: Activity, texto: 'Telemetría Global' },
        { id: 'operadores', icono: UserCheck, texto: 'Malla de Operadores' },
        { id: 'billeteras', icono: Database, texto: 'Bóveda Contable', habilitado: tieneAccesoFinanciero }, 
        { id: 'recargas', icono: Wallet, texto: 'Tesorería Central', habilitado: tieneAccesoFinanciero },
        { id: 'mapa', icono: Map, texto: 'Radar Geoespacial', habilitado: tieneAccesoMapa },
        { id: 'qr', icono: QrCode, texto: 'Matriz QR', habilitado: tieneAccesoFinanciero }
    ];

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-hidden">
            
            {/* GRID DE FONDO TÁCTICO */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

            {/* ENCABEZADO Y BARRA DE NAVEGACIÓN SUPERIOR (CIMCO-UI V9.3 Glassmorphism) */}
            <header className="w-full bg-[#121214]/80 backdrop-blur-xl border-b border-white/5 relative z-20 sticky top-0 px-8 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                
                {/* Branding & Info de Nodo */}
                <div className="flex items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black tracking-tighter text-white">TAXIA <span className="text-cyan-400">CIMCO</span></h2>
                            <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase bg-white/5 px-2 py-0.5 rounded border border-white/5">Consola Central</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase">Operador: <span className="text-white font-bold">{user?.nombre || 'Nodo Root'}</span></p>
                        </div>
                    </div>
                </div>

                {/* CONTENEDOR DE PESTAÑAS HORIZONTALES SUPERIORES */}
                <nav className="flex flex-wrap items-center gap-2 bg-[#09090b]/60 p-1.5 rounded-xl border border-white/5 max-w-full overflow-x-auto scrollbar-none">
                    {opcionesNavegacion.map((item) => {
                        const activo = pestanaActiva === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setPestanaActiva(item.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-all duration-200 border whitespace-nowrap ${
                                    activo 
                                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_15px_-3px_rgba(6,182,212,0.1)]' 
                                    : 'bg-transparent text-zinc-400 border-transparent hover:bg-white/[0.02] hover:text-zinc-200'
                                }`}
                            >
                                <item.icono size={14} className={activo ? 'animate-pulse text-cyan-400' : 'text-zinc-500'} />
                                {item.texto}
                            </button>
                        );
                    })}
                </nav>

                {/* Monitor del Estado del Servidor Core */}
                <div className="hidden lg:flex items-center gap-3 bg-[#18181b]/80 border border-white/5 px-4 py-2 rounded-xl">
                    <div className="relative flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute" />
                        <span className="w-2 h-2 rounded-full bg-emerald-500 relative" />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Servidor Core: <span className="text-emerald-400 font-bold">ONLINE</span></span>
                </div>
            </header>

            {/* ÁREA DE RENDERIZADO PRINCIPAL */}
            <main className="flex-1 overflow-y-auto p-8 relative z-10 container mx-auto max-w-7xl">
                
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

                        {/* Contenedor del Gráfico con simulación analítica */}
                        <div className="bg-[#121214]/80 backdrop-blur-md border border-white/5 p-8 rounded-2xl h-72 flex flex-col items-center justify-center text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_70%)] pointer-events-none" />
                            <Activity size={36} className="text-cyan-500/40 mb-4 animate-pulse" />
                            <p className="text-zinc-400 font-mono text-xs uppercase tracking-widest leading-relaxed">
                                Monitor de Flujo de Operaciones Real-Time<br/>
                                <span className="text-zinc-600 text-[10px]">(Listo para vinculación de MongoDB Aggregation Pipeline)</span>
                            </p>
                        </div>
                    </div>
                )}

                {/* 2. MÓDULO: MALLA DE OPERADORES */}
                {pestanaActiva === 'operadores' && (
                    <div className="animate-in fade-in duration-300 space-y-4">
                        {/* Alerta controlada interna para avisar el estado de los permisos de Firestore */}
                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-center gap-3 text-amber-400">
                            <ShieldAlert size={18} className="shrink-0" />
                            <p className="text-[11px] font-mono uppercase tracking-wider">
                                Nota del Sistema: Si experimentas fallas de lectura, verifica las Security Rules de tu consola de Firestore para la colección asignada.
                            </p>
                        </div>
                        <ListaOperadores />
                    </div>
                )}

                {/* 3. MÓDULO: BÓVEDA CONTABLE (GestionBilleteras) */}
                {pestanaActiva === 'billeteras' && (
                    tieneAccesoFinanciero ? (
                        <div className="animate-in fade-in duration-300">
                            <GestionBilleteras />
                        </div>
                    ) : (
                        <BloqueoSeguridad modulo="Bóveda Contable" />
                    )
                )}

                {/* 4. MÓDULO: TESORERÍA CENTRAL (AdminPanel) */}
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
                        <div className="h-[600px] w-full rounded-2xl overflow-hidden border border-white/5 animate-in fade-in duration-300">
                            <MapaOperativo />
                        </div>
                    ) : (
                        <BloqueoSeguridad modulo="Radar Geoespacial" />
                    )
                )}

                {/* 6. MÓDULO: MATRIZ QR (QrGenerator) */}
                {pestanaActiva === 'qr' && (
                    tieneAccesoFinanciero ? (
                        <div className="animate-in fade-in duration-300">
                            <QrGenerator />
                        </div>
                    ) : (
                        <BloqueoSeguridad modulo="Generador de Códigos QR" />
                    )
                )}

            </main>
        </div>
    );
};

// Componente atómico interno para el control visual de accesos restringidos
const BloqueoSeguridad = ({ modulo }) => (
    <div className="flex flex-col items-center justify-center py-20 text-red-500 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
            <ShieldAlert size={36} className="text-red-500" />
        </div>
        <h2 className="text-lg font-black text-white mb-2 tracking-tight">AUTORIZACIÓN REQUERIDA</h2>
        <p className="font-mono text-[11px] uppercase text-red-400 tracking-widest text-center max-w-md leading-relaxed">
            Nivel de privilegios insuficientes para la administración de: <span className="font-bold text-white">{modulo}</span>. Contactar al nodo central de seguridad.
        </p>
    </div>
);

export default AdminDashboard;