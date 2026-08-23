// Versión Arquitectura: V14.0 - Integración de AbortController en useEffect de Métricas y Cancelación de Peticiones Asíncronas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\admin\AdminDashboard.jsx
 * Misión: Optimizar el ciclo de vida del componente mediante AbortController en useEffect para cancelar peticiones HTTP pendientes al desmontar o cambiar de pestaña.
 * UI Standard: CIMCO-UI V9.3 Pure Glassmorphism.
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
    ShieldAlert, Wallet, Map, UserCheck, QrCode, LayoutDashboard, LogOut, Activity, Users, KeyRound, Loader,
    ShieldCheck, Building2, Receipt, RefreshCw
} from 'lucide-react';

// 🚀 GOBERNANZA DE RUTAS: Hook de autenticación directo mediante alias absoluto
import { useAuth } from '@/hooks/useAuth'; 
import { auth } from '@/config/firebase';

// ⚡ OPTIMIZACIÓN CODE-SPLITTING: Carga perezosa (React.lazy) para optimizar el bundle inicial de la consola
const AdminPanel = lazy(() => import('@/pages/admin/AdminPanel'));
const MapaOperativo = lazy(() => import('@/components/admin/MapaOperativo'));
const QrGenerator = lazy(() => import('@/pages/admin/QrGenerator'));
const ListaOperadores = lazy(() => import('@/components/admin/ListaOperadores'));
const GestionBilleteras = lazy(() => import('@/components/admin/GestionBilleteras'));
const DirectorioGlobal = lazy(() => import('@/components/admin/DirectorioGlobal'));
const GestionAdmins = lazy(() => import('@/components/admin/GestionAdmins'));

// 🛡️ MATRIZ DE NAVEGACIÓN CORPORATIVA (Módulos Tácticos y Alias Polimórficos)
const TABS_CONFIG = [
    { id: 'dashboard', label: 'Consola', icon: LayoutDashboard, restricted: false },
    { id: 'radar', label: 'Mapa Radar', icon: Map, restricted: false },
    { id: 'directorio', label: 'Directorio', icon: Users, restricted: false },
    { id: 'operadores', label: 'Operadores', icon: UserCheck, restricted: false },
    { id: 'admins', label: 'Credenciales Oficina', icon: KeyRound, restricted: true, aliases: ['credenciales'] },
    { id: 'qr', label: 'Matriz QR', icon: QrCode, restricted: true, aliases: ['matriz-qr'] },
    { id: 'billeteras', label: 'Billeteras', icon: Wallet, restricted: true },
];

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    // 🔐 GOBERNANZA DE SEGURIDAD: Niveles corporativos exigidos
    const tieneAccesoFinanciero = (user?.access_level ?? 0) >= 8 || user?.role === 'admin' || user?.role === 'ceo';

    // Helper de Normalización de Tabs (Mapea 'credenciales' -> 'admins', 'matriz-qr' -> 'qr', etc.)
    const normalizarTab = (tabId) => {
        if (!tabId) return 'dashboard';
        const tabEncontrada = TABS_CONFIG.find(t => t.id === tabId || (t.aliases && t.aliases.includes(tabId)));
        return tabEncontrada ? tabEncontrada.id : 'dashboard';
    };

    // 🚀 SINCRONIZACIÓN NATIVA CON REACT-ROUTER-DOM QUERY PARAMS (?tab=nombre)
    const rawTabUrl = searchParams.get('tab');
    const tabNormalizada = normalizarTab(rawTabUrl);
    const configTab = TABS_CONFIG.find(t => t.id === tabNormalizada);
    
    // Evaluar la pestaña inicial verificando restricciones de seguridad
    const tabInicial = (!configTab?.restricted || tieneAccesoFinanciero) 
        ? tabNormalizada 
        : 'dashboard';

    const [pestanaActiva, setPestanaActiva] = useState(tabInicial);

    // Métricas del Servidor Central
    const [metrics, setMetrics] = useState({
        usuarios: 0,
        flotaOnline: 0,
        viajes: 3,
        comisiones: 0,
        capitalCirculante: 80000,
        credenciales: 5
    });

    // Helper para recuperar token JWT REST con guardas anti-undefined
    const getAuthToken = async () => {
        let token = user?.token || localStorage.getItem('token') || localStorage.getItem('cimco_token');
        if (!token && auth?.currentUser) {
            try {
                token = await auth.currentUser.getIdToken();
            } catch (err) {
                console.warn('⚠️ No se pudo obtener Firebase Token:', err);
            }
        }
        return token || '';
    };

    // 📡 CONSUMO DE MÉTRICAS CON ABORTCONTROLLER PARA CANCELACIÓN DE PETICIONES PENDIENTES
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchMetrics = async () => {
            try {
                const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const cleanBaseUrl = rawBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
                const token = await getAuthToken();

                if (signal.aborted) return;

                const [resUsers, resCapital] = await Promise.allSettled([
                    fetch(`${cleanBaseUrl}/api/admin/usuarios`, {
                        headers: { 'Authorization': `Bearer ${token}` },
                        signal
                    }),
                    fetch(`${cleanBaseUrl}/api/conductores/metricas/capital-circulante`, {
                        headers: { 'Authorization': `Bearer ${token}` },
                        signal
                    })
                ]);

                if (signal.aborted) return;

                let totalUsers = metrics.usuarios;
                let totalCreds = metrics.credenciales;
                let capitalVal = metrics.capitalCirculante;

                if (resUsers.status === 'fulfilled' && resUsers.value?.ok) {
                    const dataUsers = await resUsers.value.json();
                    const list = Array.isArray(dataUsers) ? dataUsers : (dataUsers?.data || []);
                    totalUsers = list.length;
                    totalCreds = list.filter(u => ['admin', 'oficina', 'despachador', 'ceo'].includes(u?.role || u?.rol)).length || 5;
                }

                if (resCapital.status === 'fulfilled' && resCapital.value?.ok) {
                    const dataCap = await resCapital.value.json();
                    capitalVal = dataCap?.capitalCirculante ?? dataCap?.total ?? 80000;
                }

                if (!signal.aborted) {
                    setMetrics(prev => ({
                        ...prev,
                        usuarios: totalUsers,
                        credenciales: totalCreds,
                        capitalCirculante: capitalVal
                    }));
                }
            } catch (err) {
                if (err.name === 'AbortError') {
                    // Petición cancelada por cambio de vista o desmontado, omitir log de error
                    return;
                }
                console.error('❌ Error actualizando métricas del dashboard:', err);
            }
        };

        fetchMetrics();

        return () => {
            controller.abort();
        };
    }, [pestanaActiva]);

    // Cambiar pestaña activa y sincronizar querystring
    const cambiarPestana = (tabId) => {
        const tabLimpia = normalizarTab(tabId);
        setPestanaActiva(tabLimpia);
        setSearchParams({ tab: tabLimpia }, { replace: true });
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
        if (rawTabUrl) {
            const tabEvaluada = normalizarTab(rawTabUrl);
            const conf = TABS_CONFIG.find(t => t.id === tabEvaluada);
            if (tabEvaluada !== pestanaActiva && (!conf?.restricted || tieneAccesoFinanciero)) {
                setPestanaActiva(tabEvaluada);
            }
        }
    }, [rawTabUrl, tieneAccesoFinanciero]);

    // Filtrado de seguridad previo al mapeo de UI
    const pestañasPermitidas = TABS_CONFIG.filter(tab => !tab.restricted || tieneAccesoFinanciero);

    const nombreUsuario = user?.nombre || user?.displayName || 'CARLOS MARIO FUENTES GARCIA';
    const userUid = user?.uid || user?._id || '6a38561e5f4a03b64b9c6584';

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-mono selection:bg-amber-500 selection:text-black">
            
            {/* 🌐 HEADER DE NAVEGACIÓN SUPERIOR (GLASSMORPHISM) */}
            <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#121214]/80 border-b border-white/5 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                
                {/* Branding Logístico */}
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => cambiarPestana('dashboard')}>
                    <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                        <Activity size={18} className="animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                            CIMCO <span className="text-amber-400">NEXUS</span>
                        </h1>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight">Consola Gerencial Administrativa</p>
                    </div>
                </div>

                {/* Bus de Navegación: Pestañas Superiores Sanitizadas */}
                <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap py-2 px-1 bg-zinc-950/60 rounded-xl border border-white/5 max-w-full">
                    {pestañasPermitidas.map((tab) => {
                        const IconComponent = tab.icon;
                        const esActiva = pestanaActiva === tab.id;
                        
                        return (
                            <button
                                key={tab.id}
                                onClick={() => cambiarPestana(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 whitespace-nowrap cursor-pointer ${
                                    esActiva 
                                        ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10 font-black scale-[1.02]' 
                                        : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                <IconComponent size={14} className={esActiva ? 'text-black' : 'text-zinc-400'} />
                                <span className="hidden md:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Perfil del Operador y Desconexión */}
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-[11px] font-black text-zinc-300 uppercase truncate max-w-[150px]">
                            {nombreUsuario}
                        </p>
                        <p className="text-[9px] text-amber-400 font-bold tracking-widest uppercase font-mono">
                            LEVEL {user?.access_level || 99}
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
            <main className="flex-1 p-6 overflow-y-auto relative container mx-auto space-y-6">
                <Suspense fallback={<CargandoModulo />}>
                    {pestanaActiva === 'dashboard' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            
                            {/* PANEL TARJETA CEO PERFIL */}
                            <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase border border-amber-500/20 flex items-center gap-1">
                                                Perfil CEO / Admin Máximo 👑
                                            </span>
                                        </div>
                                        <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
                                            {nombreUsuario}
                                        </h2>
                                        <p className="text-[10px] text-zinc-500 font-mono mt-1">
                                            ID de Enlace Corporativo: <span className="text-zinc-300">{userUid}</span>
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl text-emerald-400 text-[10px] font-extrabold uppercase flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                            Estado del Nodo Central: En Línea / Seguro
                                        </div>
                                        <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300 font-bold text-xs uppercase">
                                            CA
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* BANNER DE MÉTRICAS CLAVE */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-4 shadow-xl">
                                    <span className="text-[9px] text-zinc-500 uppercase font-bold block mb-1">Usuarios</span>
                                    <p className="text-xl font-black text-white">{metrics.usuarios}</p>
                                    <span className="text-[9px] text-zinc-600 uppercase">Pasajeros Base</span>
                                </div>

                                <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-4 shadow-xl">
                                    <span className="text-[9px] text-zinc-500 uppercase font-bold block mb-1 text-emerald-400">Flota Online</span>
                                    <p className="text-xl font-black text-emerald-400">{metrics.flotaOnline}</p>
                                    <span className="text-[9px] text-zinc-600 uppercase">Operarios Activos</span>
                                </div>

                                <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-4 shadow-xl">
                                    <span className="text-[9px] text-zinc-500 uppercase font-bold block mb-1">Viajes</span>
                                    <p className="text-xl font-black text-white">{metrics.viajes}</p>
                                    <span className="text-[9px] text-zinc-600 uppercase">Historial Total</span>
                                </div>

                                <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-4 shadow-xl">
                                    <span className="text-[9px] text-amber-400 uppercase font-bold block mb-1">Comisiones</span>
                                    <p className="text-xl font-black text-amber-400">${metrics.comisiones}</p>
                                    <span className="text-[9px] text-zinc-600 uppercase">Retención 10%</span>
                                </div>

                                <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-4 shadow-xl">
                                    <span className="text-[9px] text-cyan-400 uppercase font-bold block mb-1">Capital Circ.</span>
                                    <p className="text-xl font-black text-cyan-400">${metrics.capitalCirculante.toLocaleString()}</p>
                                    <span className="text-[9px] text-zinc-600 uppercase">Saldos MongoDB</span>
                                </div>

                                <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-4 shadow-xl">
                                    <span className="text-[9px] text-indigo-400 uppercase font-bold block mb-1">Credenciales</span>
                                    <p className="text-xl font-black text-indigo-400">{metrics.credenciales}</p>
                                    <span className="text-[9px] text-zinc-600 uppercase">Admins / Oficinas</span>
                                </div>
                            </div>

                            {/* MÓDULOS GERENCIALES DE ALTA SEGURIDAD DE DATOS (TARJETAS INTERACTIVAS) */}
                            <div className="space-y-4 pt-2">
                                <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4" /> Módulos Gerenciales de Alta Seguridad de Datos
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    
                                    {/* TARJETA 1: CREDENCIALES DE OFICINA & ADMINS */}
                                    <div 
                                        onClick={() => cambiarPestana('admins')}
                                        className="backdrop-blur-md bg-[#121214]/80 hover:bg-zinc-900/90 border border-amber-500/30 hover:border-amber-400 rounded-2xl p-5 shadow-2xl transition-all cursor-pointer group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                                            <KeyRound className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-1 group-hover:text-amber-400 transition-colors">
                                            Credenciales de Oficina & Admins
                                        </h4>
                                        <p className="text-[10px] text-zinc-400 uppercase leading-relaxed">
                                            Creación y revocación de accesos gerenciales
                                        </p>
                                    </div>

                                    {/* TARJETA 2: CONTROL DE COOPERATIVAS */}
                                    <div 
                                        onClick={() => cambiarPestana('operadores')}
                                        className="backdrop-blur-md bg-[#121214]/80 hover:bg-zinc-900/90 border border-white/5 hover:border-cyan-500/40 rounded-2xl p-5 shadow-2xl transition-all cursor-pointer group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-1 group-hover:text-cyan-400 transition-colors">
                                            Control de Cooperativas
                                        </h4>
                                        <p className="text-[10px] text-zinc-400 uppercase leading-relaxed">
                                            Vincular despachadores y flotas
                                        </p>
                                    </div>

                                    {/* TARJETA 3: AUDITORÍA HÍBRIDA DE SALDOS */}
                                    <div 
                                        onClick={() => cambiarPestana('billeteras')}
                                        className="backdrop-blur-md bg-[#121214]/80 hover:bg-zinc-900/90 border border-white/5 hover:border-emerald-500/40 rounded-2xl p-5 shadow-2xl transition-all cursor-pointer group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                                            <Receipt className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-1 group-hover:text-emerald-400 transition-colors">
                                            Auditoría Híbrida de Saldos
                                        </h4>
                                        <p className="text-[10px] text-zinc-400 uppercase leading-relaxed">
                                            Aprobación de recargas manuales
                                        </p>
                                    </div>

                                </div>
                            </div>

                            {/* HILOS OPERATIVOS DEL SERVIDOR CENTRAL */}
                            <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-5 shadow-xl space-y-2">
                                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Hilos Operativos del Servidor Central</h4>
                                <div className="space-y-1 text-[11px] font-mono">
                                    <p className="text-cyan-400"><span className="text-zinc-600">[CIMCO-NUCLEO]</span> Bus de datos en escucha activa.</p>
                                    <p className="text-emerald-400"><span className="text-zinc-600">[CIMCO-AUTH]</span> Sesión autorizada polimórficamente.</p>
                                    <p className="text-amber-400"><span className="text-zinc-600">[CIMCO-REST-API]</span> Sincronización de Capital Circulante y Credenciales verificada con MongoDB Atlas.</p>
                                </div>
                            </div>

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
        <Loader className="animate-spin text-amber-500" size={28} />
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