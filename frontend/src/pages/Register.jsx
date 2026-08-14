// Versión Arquitectura: V24.0 - Sincronización de Rutas QR a Slugs Planos y Rediseño Dark Glassmorphism Premium
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\Register.jsx
 * Misión: Enrutador maestro de roles con interceptor de códigos QR, protección de sesión activa,
 *         rutas estandarizadas con guion (/register-...) y estética Dark Glassmorphism Premium (CIMCO-UI V9.3).
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

        // 1️⃣ CASO A: EL USUARIO YA TIENE SESIÓN ABIERTA -> Redirige a raíz para que RoleRedirect lo ubique sin bucles
        if (user) {
            navigate('/', { replace: true });
            return;
        }

        // 2️⃣ CASO B: LECTURA DE CÓDIGO QR CON REDIRECCIÓN A RUTAS NORMALIZADAS CON GUION (/register-...)
        if (targetRole) {
            const normalizedRole = String(targetRole).toLowerCase().trim();
            
            // Matriz de roles homologados
            const isPasajero = normalizedRole === 'pasajero';
            const isMoto = ['mototaxi', 'motoparrillero', 'motocarga', 'moto'].includes(normalizedRole);
            const isIntermunicipal = normalizedRole === 'intermunicipal';
            const isDespachador = normalizedRole === 'despachador';

            if (isPasajero) {
                navigate('/register-pasajero', { replace: true });
            } else if (isMoto) {
                navigate(`/register-moto?role=${normalizedRole}`, { replace: true });
            } else if (isIntermunicipal) {
                navigate('/register-intermunicipal', { replace: true });
            } else if (isDespachador) {
                navigate('/register-despachador', { replace: true });
            } else {
                console.warn(`⚠️ [CIMCO-QR] Parámetro ?role="${targetRole}" no válido. Aplicando fallback a registro de pasajero.`);
                navigate('/register-pasajero', { replace: true });
            }
        }
    }, [user, loading, targetRole, navigate]);

    // 🗂️ Mapeo con Rutas Corregidas (/register-...) y Psicología del Color CIMCO-UI V9.3 Glassmorphism
    const roles = [
        {
            id: 'pasajero',
            title: 'Pasajero',
            badge: 'Viajes Instantáneos',
            desc: 'Solicita transporte seguro, rastrea tu viaje en tiempo real y gestiona tus pagos.',
            path: '/register-pasajero',
            icon: <User size={26} className="text-[#3b82f6]" />,
            borderColor: 'hover:border-[#3b82f6]/50 hover:shadow-[0_0_25px_rgba(59,130,246,0.2)]',
            badgeBg: 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20'
        },
        {
            id: 'moto',
            title: 'Escuadrón Moto',
            badge: 'Mototaxi / Parrillero / Carga',
            desc: 'Operación ágil de transporte motorizado urbano con verificación en línea.',
            path: '/register-moto',
            icon: <Bike size={26} className="text-[#10b981]" />,
            borderColor: 'hover:border-[#10b981]/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]',
            badgeBg: 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20'
        },
        {
            id: 'intermunicipal',
            title: 'Intermunicipal',
            badge: 'Rutas Regionales',
            desc: 'Conductores de cooperativas y rutas de mediano y largo alcance.',
            path: '/register-intermunicipal',
            icon: <Bus size={26} className="text-[#f59e0b]" />,
            borderColor: 'hover:border-[#f59e0b]/50 hover:shadow-[0_0_25px_rgba(245,158,11,0.2)]',
            badgeBg: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20'
        },
        {
            id: 'despachador',
            title: 'Despachador de Nodo',
            badge: 'Gestión de Terminal',
            desc: 'Control de despachos, asignación de turnos y taquilla operativa.',
            path: '/register-despachador',
            icon: <Terminal size={26} className="text-[#f59e0b]" />,
            borderColor: 'hover:border-[#f59e0b]/50 hover:shadow-[0_0_25px_rgba(245,158,11,0.2)]',
            badgeBg: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20'
        }
    ];

    // Pantalla de carga Glassmorphism mientras useAuth() valida las credenciales
    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0f1d] flex flex-col items-center justify-center p-4">
                <Loader size={36} className="animate-spin text-[#3b82f6] mb-3" />
                <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">Sincronizando con la red de transporte CIMCO...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center p-4 selection:bg-[#3b82f6]/30 relative overflow-hidden font-sans">
            {/* Ambient Background Lights */}
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#3b82f6]/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#10b981]/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-4xl backdrop-blur-2xl bg-[#0a0f1d]/90 border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-[0_0_60px_rgba(0,0,0,0.8)] relative z-10">
                
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 bg-slate-900/90 px-4 py-1.5 rounded-full border border-slate-700/60 text-[10px] text-[#3b82f6] font-mono tracking-widest uppercase mb-4 shadow-inner">
                        <ShieldCheck size={14} className="text-[#3b82f6]" /> Sistema Oficial TAXIA CIMCO
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                        Crear Cuenta Operativa
                    </h1>
                    <p className="text-xs text-slate-400 font-mono tracking-wide mt-2 max-w-lg mx-auto">
                        Selecciona tu rol en la plataforma para iniciar la vinculación con el sistema satelital de movilidad.
                    </p>
                </div>

                {/* Grid de Selección de Roles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {roles && roles.map((rol) => (
                        <Link 
                            key={rol?.id || Math.random()}
                            to={rol?.path || '/register'}
                            className={`flex flex-col justify-between p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 transition-all duration-300 group text-decoration-none relative overflow-hidden ${rol?.borderColor || ''}`}
                        >
                            <div className="flex items-start gap-4 mb-3">
                                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 group-hover:scale-110 transition-transform shrink-0 shadow-lg">
                                    {rol?.icon}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-white font-bold tracking-wide uppercase text-sm group-hover:text-white transition-colors">
                                            {rol?.title || 'Indefinido'}
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