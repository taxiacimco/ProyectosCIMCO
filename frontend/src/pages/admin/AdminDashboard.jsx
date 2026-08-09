// Versión Arquitectura: V13.6 - Corrección Import react-router-dom y Sincronización URL Query Params
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\admin\AdminDashboard.jsx
 * Misión: Orquestar submódulos tácticos de administración con sincronización de URL query params, lazy loading y control de acceso restringido.
 * UI Standard: CIMCO-UI V9.3 Pure Glassmorphism.
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
    ShieldAlert, Wallet, Map, UserCheck, QrCode, LayoutDashboard, LogOut, Activity, Users, KeyRound, Loader
} from 'lucide-react';

// 🚀 GOBERNANZA DE RUTAS: Hook de autenticación directo mediante alias absoluto
import { useAuth } from '@/hooks/useAuth'; 

// ⚡ OPTIMIZACIÓN CODE-SPLITTING: Carga perezosa (React.lazy) para optimizar el bundle inicial de la consola
const AdminPanel = lazy(() => import('@/pages/admin/AdminPanel'));
const MapaOperativo = lazy(() => import('@/components/admin/MapaOperativo'));
const QrGenerator = lazy(() => import('@/pages/admin/QrGenerator'));
const ListaOperadores = lazy(() => import('@/components/admin/ListaOperadores'));
const GestionBilleteras = lazy(() => import('@/components/admin/GestionBilleteras'));
const DirectorioGlobal = lazy(() => import('@/components/admin/DirectorioGlobal'));
const GestionAdmins = lazy(() => import('@/components/admin/GestionAdmins'));

// 🛡️ MATRIZ DE NAVEGACIÓN CORPORATIVA (Módulos Tácticos)
const TABS_CONFIG = [
    { id: 'dashboard', label: 'Consola', icon: LayoutDashboard, restricted: false },
    { id: 'radar', label: 'Mapa Radar', icon: Map, restricted: false },
    { id: 'directorio', label: 'Directorio', icon: Users, restricted: false },
    { id: 'operadores', label: 'Operadores', icon: UserCheck, restricted: false },
    { id: 'admins', label: 'Credenciales Oficina', icon: KeyRound, restricted: true },
    { id: 'qr', label: 'Matriz QR', icon: QrCode, restricted: true },
    { id: 'billeteras', label: 'Billeteras', icon: Wallet, restricted: true },
];

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    // 🔐 GOBERNANZA DE SEGURIDAD: Niveles corporativos exigidos
    const tieneAccesoFinanciero = user?.access_level >= 8 || user?.role === 'admin' || user?.role === 'ceo';

    // 🚀 SINCRONIZACIÓN NATIVA CON REACT-ROUTER-DOM QUERY PARAMS (?tab=nombre)
    const tabUrl = searchParams.get('tab');
    const tabValida = TABS_CONFIG.some(t => t.id === tabUrl);
    const configTab = TABS_CONFIG.find(t => t.id === tabUrl);
    
    // Evaluar la pestaña inicial verificando restricciones de seguridad
    const tabInicial = (tabValida && (!configTab?.restricted || tieneAccesoFinanciero)) 
        ? tabUrl 
        : 'dashboard';

    const [pestanaActiva, setPestanaActiva] = useState(tabInicial);

    // Cambiar pestaña activa y sincronizar querystring
    const cambiarPestana = (tabId) => {
        setPestanaActiva(tabId);
        setSearchParams({ tab: tabId }, { replace: true });
    };

    // 🛡️ SALVAGUARDA REFLEXIVA: Resetear a dashboard si la pestaña activa es restringida y el usuario no posee privilegios
    useEffect(() => {
        const tabActual = TABS_CONFIG.find(t => t.id === pestanaActiva);
        if (tabActual?.restricted && !tieneAccesoFinanciero) {
            console.warn(`⚠️ [CIMCO-SEGURIDAD] Intento de desborde de privilegios detectado para la pestaña: [${pestanaActiva}]. Reencaminando...`);
            cambiarPestana('dashboard');
        }
    }, [tieneAccesoFinanciero, pestanaActiva]);

    // Sincronizar estado interno si la URL cambia dinámicamente
    useEffect(() => {
        if (tabUrl && tabUrl !== pestanaActiva) {
            if (tabValida && (!configTab?.restricted || tieneAccesoFinanciero)) {
                setPestanaActiva(tabUrl);
            }
        }
    }, [tabUrl, tieneAccesoFinanciero]);

    // Filtrado de seguridad previo al mapeo de UI
    const pestañasPermitidas = TABS_CONFIG.filter(tab => !tab.restricted || tieneAccesoFinanciero);

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-mono selection:bg-cyan-500 selection:text-black">
            
            {/* 🌐 HEADER DE NAVEGACIÓN SUPERIOR (GLASSMORPHISM) */}
            <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#121214]/80 border-b border-white/5 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                
                {/* Branding Logístico */}
                <div className="flex items-center gap-3">
                    <div className="bg-cyan-500/10 border border-cyan-500/20 p-2 rounded-xl text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                        <Activity size={18} className="animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                            CIMCO <span className="text-cyan-500">NEXUS</span>
                        </h1>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight">Consola Gerencial Administrativa</p>
                    </div>
                </div>

                {/* Bus de Navegación: Pestañas Superiores Sanitizadas */}
                <nav className="flex items-center bg-zinc-950/60 p-1 rounded-xl border border-white/5 max-w-full overflow-x-auto no-scrollbar">
                    {pestañasPermitidas.map((tab) => {
                        const IconComponent = tab.icon;
                        const esActiva = pestanaActiva === tab.id;
                        
                        return (
                            <button
                                key={tab.id}
                                onClick={() => cambiarPestana(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 whitespace-nowrap cursor-pointer ${
                                    esActiva 
                                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-md scale-[1.02]' 
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                <IconComponent size={14} className={esActiva ? 'text-cyan-400' : 'text-zinc-500'} />
                                <span className="hidden md:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Perfil del Operador y Desconexión */}
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-[11px] font-black text-zinc-300 uppercase truncate max-w-[150px]">
                            {user?.nombre || user?.displayName || 'Admin Central'}
                        </p>
                        <p className="text-[9px] text-cyan-400 font-bold tracking-widest uppercase font-mono">
                            LEVEL {user?.access_level || 10}
                        </p>
                    </div>
                    
                    <button
                        onClick={logout}
                        title="Cerrar sesión operativa"
                        className="flex items-center justify-center p-2.5 rounded-xl text-red-500/80 hover:text-red-400 transition-colors bg-red-500/5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 active:scale-95 cursor-pointer"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </header>

            {/* 🌐 ÁREA DINÁMICA DE RENDERIZADO DE MÓDULOS CON LAZY LOADING Y SUSPENSE */}
            <main className="flex-1 p-6 overflow-y-auto relative container mx-auto">
                <Suspense fallback={<CargandoModulo />}>
                    {pestanaActiva === 'dashboard' && (
                        <div className="animate-in fade-in duration-300">
                            <AdminPanel />
                        </div>
                    )}
                    
                    {pestanaActiva === 'radar' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 h-full min-h-[75vh] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                            <MapaOperativo />
                        </div>
                    )}

                    {pestanaActiva === 'directorio' && (
                        <div className="animate-in fade-in duration-300">
                            <DirectorioGlobal />
                        </div>
                    )}
                    
                    {pestanaActiva === 'operadores' && (
                        <div className="animate-in fade-in duration-300">
                            <ListaOperadores />
                        </div>
                    )}

                    {pestanaActiva === 'admins' && (
                        tieneAccesoFinanciero ? (
                            <div className="animate-in fade-in duration-300">
                                <GestionAdmins />
                            </div>
                        ) : (
                            <BloqueoSeguridad modulo="Gestión de Credenciales de Oficina" />
                        )
                    )}

                    {pestanaActiva === 'qr' && (
                        tieneAccesoFinanciero ? (
                            <div className="animate-in fade-in duration-300">
                                <QrGenerator />
                            </div>
                        ) : (
                            <BloqueoSeguridad modulo="Generador de Códigos QR" />
                        )
                    )}
                    
                    {pestanaActiva === 'billeteras' && (
                        tieneAccesoFinanciero ? (
                            <div className="animate-in fade-in duration-300">
                                <GestionBilleteras />
                            </div>
                        ) : (
                            <BloqueoSeguridad modulo="Gestión de Billeteras Corporativas" />
                        )
                    )}
                </Suspense>
            </main>
        </div>
    );
};

// Componente Fallback para Suspense
const CargandoModulo = () => (
    <div className="h-64 flex flex-col items-center justify-center gap-3">
        <Loader className="animate-spin text-cyan-500" size={28} />
        <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest animate-pulse">
            Cargando Módulo de Control...
        </span>
    </div>
);

// Componente Bloqueo de Seguridad por Privilegios
const BloqueoSeguridad = ({ modulo }) => (
    <div className="flex flex-col items-center justify-center py-20 text-red-500 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.05)]">
            <ShieldAlert size={32} className="text-red-500" />
        </div>
        <h2 className="text-sm font-black text-white mb-2 tracking-wider uppercase">AUTORIZACIÓN REQUERIDA</h2>
        <p className="font-mono text-[10px] uppercase text-red-400 tracking-widest text-center max-w-md leading-relaxed">
            Nivel de privilegios insuficientes para auditar el módulo: <br />
            <span className="text-white font-bold bg-red-500/10 px-2 py-0.5 rounded mt-1 inline-block">{modulo}</span>
        </p>
    </div>
);

export default AdminDashboard;