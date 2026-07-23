// Versión Arquitectura: V23.3 - Interceptor de QR con Fallback por Defecto y Saneamiento de Roles
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\Register.jsx
 * Misión: Enrutador maestro de roles con interceptor para QR institucionales, verificación de estado de sesión
 *         y fallback preventivo ante parámetros ?role= inválidos.
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism (Identidad Híbrida).
 */

import React, { useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { User, Bike, Bus, Terminal, Shield, ArrowLeft, Loader } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth'; // 🔐 Contexto global de autenticación

const Register = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, loading } = useAuth(); // 🛡️ Evaluación del estado de sesión activo
    
    // Guardas de Seguridad para mitigar desbordamientos por tipos inválidos
    const targetRole = searchParams ? searchParams.get('role') : null;

    // 🛡️ INTERCEPTOR DOBLE: VERIFICA SESIÓN Y REDIRIGE SEGÚN CÓDIGO QR O ROL (CON FALLBACK)
    useEffect(() => {
        if (loading) return; // Esperar a que la autenticación de Firebase resuelva el estado

        // 1️⃣ CASO A: EL USUARIO YA TIENE SESIÓN ABIERTA
        if (user) {
            navigate('/login', { replace: true });
            return;
        }

        // 2️⃣ CASO B: EL USUARIO NO TIENE SESIÓN Y ESCANEÓ UN QR (Redirección por Rol con Fallback)
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
                // ⚠️ CASO BORDE / FALLBACK DE SEGURIDAD:
                // Si el parámetro ?role= no coincide con ningún rol reconocido, se redirige por defecto a pasajero.
                console.warn(`⚠️ [CIMCO-QR] Parámetro ?role="${targetRole}" no válido. Aplicando fallback a registro de pasajero.`);
                navigate('/register-pasajero', { replace: true });
            }
        }
    }, [user, loading, targetRole, navigate]);

    // 🗂️ Mapeo de Roles y Rutas Homologados CIMCO-UI V9.3
    const roles = [
        {
            id: 'pasajero',
            title: 'Pasajero',
            desc: 'Solicita viajes y envíos rápidamente.',
            path: '/register-pasajero',
            icon: <User size={24} className="text-yellow-500" />,
            borderColor: 'hover:border-yellow-500/50',
            bgColor: 'hover:bg-yellow-500/10'
        },
        {
            id: 'moto',
            title: 'Escuadrón Moto',
            desc: 'Mototaxi, Motoparrillero o Motocarga.',
            path: '/register-moto',
            icon: <Bike size={24} className="text-teal-500" />,
            borderColor: 'hover:border-teal-500/50',
            bgColor: 'hover:bg-teal-500/10'
        },
        {
            id: 'intermunicipal',
            title: 'Intermunicipal',
            desc: 'Operadores de Cooperativas y Rutas Medianas.',
            path: '/register-intermunicipal',
            icon: <Bus size={24} className="text-indigo-500" />,
            borderColor: 'hover:border-indigo-500/50',
            bgColor: 'hover:bg-indigo-500/10'
        },
        {
            id: 'despachador',
            title: 'Despachador de Nodo',
            desc: 'Gestión y control de despachos en terminales.',
            path: '/register-despachador',
            icon: <Terminal size={24} className="text-amber-500" />,
            borderColor: 'hover:border-amber-500/50',
            bgColor: 'hover:bg-amber-500/10'
        }
    ];

    // Pantalla de carga mientras useAuth() valida las credenciales
    if (loading) {
        return (
            <div className="min-h-screen bg-[#08080a] flex flex-col items-center justify-center p-4">
                <Loader size={32} className="animate-spin text-yellow-500 mb-3" />
                <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Validando credenciales en la red CIMCO...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#08080a] flex items-center justify-center p-4 selection:bg-cyan-500/30 relative overflow-hidden">
            {/* FONDO ESTÉTICO CIMCO-UI HOMOLOGADO */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.03)_0%,transparent_70%)] pointer-events-none" />
            
            <div className="w-full max-w-4xl backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center bg-zinc-900 px-4 py-1.5 rounded-full border border-white/5 text-[10px] text-zinc-400 font-mono tracking-widest uppercase mb-3">
                        Núcleo Central CIMCO
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-wider">Crear Cuenta Corporativa</h2>
                    <p className="text-xs text-zinc-500 uppercase font-mono tracking-wider mt-1">Selecciona tu perfil de operaciones satelitales</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {roles && roles.map((rol) => (
                        <Link 
                            key={rol?.id || Math.random()}
                            to={rol?.path || '/register'}
                            className={`flex items-start gap-4 p-5 rounded-2xl bg-black/40 border border-white/5 transition-all duration-300 text-decoration-none group ${rol?.borderColor || ''} ${rol?.bgColor || ''}`}
                        >
                            <div className="p-3 bg-zinc-900 rounded-xl border border-white/[0.03] group-hover:scale-105 transition-transform shrink-0">
                                {rol?.icon}
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-white font-bold tracking-wide mb-1 uppercase text-sm">{rol?.title || 'Indefinido'}</h3>
                                <p className="text-zinc-500 text-[9px] uppercase font-mono tracking-wider leading-relaxed">
                                    {rol?.desc || ''}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Acceso Administrativo Restringido */}
                <div className="mt-6 flex justify-center">
                    <Link 
                        to="/register-admin"
                        className="flex items-center gap-2 text-zinc-600 hover:text-cyan-400 text-[10px] font-mono uppercase tracking-[0.2em] transition-colors bg-black/20 px-4 py-3 rounded-xl border border-transparent hover:border-cyan-900/50"
                    >
                        <Shield size={12} /> Acceso Alta Gerencia
                    </Link>
                </div>

                <div className="mt-8 pt-6 border-t border-white/[0.05] text-center">
                    <Link to="/login" className="inline-flex items-center justify-center gap-2 text-zinc-500 hover:text-white font-mono text-[10px] uppercase tracking-widest transition-colors">
                        <ArrowLeft size={12} /> Abortar y volver al Login Central
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;