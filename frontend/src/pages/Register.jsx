// Versión Arquitectura: V24.1 - Sincronización de Navegación Maestro con Slugs Planos /register-pasajero, /register-moto, /register-intermunicipal, /register-despachador
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\Register.jsx
 * Misión: Enrutador maestro de roles con interceptor de códigos QR, protección de sesión activa,
 * rutas estandarizadas con guion plano (/register-pasajero, /register-moto, /register-intermunicipal, /register-despachador)
 * y estética Dark Glassmorphism Premium (CIMCO-UI V9.3).
 */

import React, { useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { User, Bike, Bus, Terminal, ArrowLeft, Loader, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Register = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const authContext = useAuth() || {};
    const user = authContext.user || null;
    const loading = authContext.loading || false;
    
    // Guardas de Seguridad para mitigar desbordamientos por tipos inválidos
    const targetRole = searchParams ? searchParams.get('role') : null;

    // 🛡️ INTERCEPTOR DOBLE: VERIFICA SESIÓN Y REDIRIGE SEGÚN CÓDIGO QR O ROL (ANTI-BUCLE Y SLUGS PLANOS)
    useEffect(() => {
        if (loading) return;

        // 1️⃣ Si el usuario ya cuenta con sesión activa, redirige a su panel correspondiente
        if (user) {
            const userRole = (user.rol || user.role || '').toLowerCase();
            if (userRole === 'conductor' || userRole === 'moto' || userRole === 'mototaxi') {
                navigate('/conductor/dashboard', { replace: true });
            } else if (userRole === 'despachador') {
                navigate('/despachador/dashboard', { replace: true });
            } else if (userRole === 'admin') {
                navigate('/admin/dashboard', { replace: true });
            } else {
                navigate('/pasajero/dashboard', { replace: true });
            }
            return;
        }

        // 2️⃣ Intercepción de parámetros por QR/Enlace Externo con Slugs Planos Clean
        if (targetRole) {
            const cleanRole = String(targetRole).toLowerCase().trim();
            
            if (cleanRole === 'pasajero' || cleanRole === 'pasajeros') {
                navigate('/register-pasajero', { replace: true });
            } else if (cleanRole === 'moto' || cleanRole === 'mototaxi' || cleanRole === 'motocarga' || cleanRole === 'motopasajero') {
                navigate('/register-moto', { replace: true });
            } else if (cleanRole === 'intermunicipal' || cleanRole === 'bus' || cleanRole === 'cooperativa') {
                navigate('/register-intermunicipal', { replace: true });
            } else if (cleanRole === 'despachador' || cleanRole === 'terminal') {
                navigate('/register-despachador', { replace: true });
            }
        }
    }, [user, loading, targetRole, navigate]);

    // Matriz de Opciones de Registro con Slugs Planos Estandarizados
    const opcionesRegistro = [
        {
            id: 'pasajero',
            titulo: 'Pasajero Urbano',
            subtitulo: 'Movilidad & Envíos Directos',
            desc: 'Solicita viajes en mototaxi, motocarga o servicios urbanos con tarifa justa e itinerario en tiempo real.',
            icono: User,
            color: 'from-amber-500/20 to-amber-600/5',
            borderColor: 'group-hover:border-amber-500/50',
            iconColor: 'text-amber-400',
            badge: 'Acceso Directo',
            badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            ruta: '/register-pasajero'
        },
        {
            id: 'moto',
            titulo: 'Escuadrón Moto',
            subtitulo: 'Mototaxi / Motocarga / Pasajero',
            desc: 'Inscribe tu unidad vehicular, sube tus documentos obligatorios y genera ingresos de forma independiente.',
            icono: Bike,
            color: 'from-teal-500/20 to-teal-600/5',
            borderColor: 'group-hover:border-teal-500/50',
            iconColor: 'text-teal-400',
            badge: 'Requiere Validación',
            badgeBg: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
            ruta: '/register-moto'
        },
        {
            id: 'intermunicipal',
            titulo: 'Operador Intermunicipal',
            subtitulo: 'Rutas Regionales & Cooperativas',
            desc: 'Vinculación para conductores de rutas intermunicipales afiliados a empresas o cooperativas autorizadas.',
            icono: Bus,
            color: 'from-indigo-500/20 to-indigo-600/5',
            borderColor: 'group-hover:border-indigo-500/50',
            iconColor: 'text-indigo-400',
            badge: 'Afiliación Flota',
            badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
            ruta: '/register-intermunicipal'
        },
        {
            id: 'despachador',
            titulo: 'Terminal / Despachador',
            subtitulo: 'Central de Control Operativo',
            desc: 'Gestión de salidas, asignación de giros y control de despacho para terminales de transporte.',
            icono: Terminal,
            color: 'from-amber-600/20 to-orange-600/5',
            borderColor: 'group-hover:border-orange-500/50',
            iconColor: 'text-orange-400',
            badge: 'Gobernanza Level 3',
            badgeBg: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
            ruta: '/register-despachador'
        }
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4 bg-[#121214]/80 backdrop-blur-md border border-white/5 p-8 rounded-3xl shadow-2xl">
                    <Loader className="w-8 h-8 text-amber-500 animate-spin" />
                    <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                        Validando Perfil de Seguridad...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
            {/* Luces de Fondo Glassmorphism */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-4xl bg-[#121214]/80 backdrop-blur-md border border-white/5 rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10">
                
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-amber-400 text-xs font-mono mb-4 shadow-inner">
                        <ShieldCheck size={14} />
                        <span className="uppercase tracking-widest font-semibold">Plataforma Global TAXIA CIMCO</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-wider mb-3">
                        Selecciona tu Perfil de Operación
                    </h1>
                    <p className="text-slate-400 text-xs sm:text-sm font-normal leading-relaxed">
                        Elige la modalidad correspondiente para iniciar el proceso de vinculación y registro en el nodo central.
                    </p>
                </div>

                {/* Grid de Opciones de Registro */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {opcionesRegistro.map((rol) => (
                        <Link
                            key={rol?.id || Math.random()}
                            to={rol?.ruta || '/register'}
                            className={`group relative rounded-2xl p-6 bg-gradient-to-br ${rol?.color || ''} bg-black/40 border border-white/5 ${rol?.borderColor || ''} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-left block text-decoration-none overflow-hidden`}
                        >
                            <div className="flex items-start gap-4 relative z-10">
                                <div className={`p-3.5 rounded-xl bg-black/60 border border-white/10 ${rol?.iconColor || 'text-white'} group-hover:scale-110 transition-transform duration-300`}>
                                    {rol?.icono && <rol.icono size={24} />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                                            {rol?.titulo || 'Perfil'}
                                        </h3>
                                    </div>
                                    <span className={`inline-block text-[9px] font-mono px-2 py-0.5 rounded-md border ${rol?.badgeBg || ''} font-bold uppercase mb-2`}>
                                        {rol?.badge || ''}
                                    </span>
                                    <p className="text-slate-400 text-[11px] font-normal leading-relaxed">
                                        {rol?.desc || ''}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-10 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase">
                        <Zap size={12} className="text-[#3b82f6]" /> Conexión Cifrada SSL 256-bit
                    </div>
                    <Link to="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-white font-mono text-[11px] uppercase tracking-wider transition-colors text-decoration-none">
                        <ArrowLeft size={14} /> Volver al Login Central
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;