// Versión Arquitectura: V12.6 - Integración de Callback de Refresco Unificado onUpdateSuccess
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\pasajero\PerfilPasajero.jsx
 * Misión: Expediente de identidad del pasajero con integración al editor unificado AjustesPerfil, refresco dinámico post-mutación y consumo seguro mediante Axios.
 * UI Standard: CIMCO-UI V9.3 Pure Dark Glassmorphism (backdrop-blur-md, bg-[#121214]/80, border-white/5).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import api from '@/config/api';
import AjustesPerfil from '@/components/shared/AjustesPerfil';
import { User, Mail, Shield, ShieldCheck, Phone, Award, Loader, AlertCircle, Settings, ArrowLeft } from 'lucide-react';

const PerfilPasajero = () => {
    const navigate = useNavigate();
    const authContext = useAuth() || {};
    const user = authContext.user || null;

    const [perfil, setPerfil] = useState(null);
    const [loading, setLoading] = useState(true);
    const [esModoLocal, setEsModoLocal] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);

    const obtenerDatosPerfil = useCallback(async () => {
        const uid = user?.uid || user?.id || user?._id;
        if (!uid) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setEsModoLocal(false);

            // 📡 Consumo unificado mediante instancia Axios con token JWT inyectado automáticamente en interceptores
            const respuesta = await api.get(`/usuarios/perfil/${uid}`);

            if (respuesta.data?.success && respuesta.data?.perfil) {
                const payload = respuesta.data.perfil;
                // Normalización de esquema de datos (Anti-Undefined)
                setPerfil({
                    nombre: payload?.nombre || payload?.name || payload?.displayName || 'Pasajero CIMCO',
                    correo: payload?.correo || payload?.email || 'sin-correo@taxiacimco.com',
                    rol: payload?.rol || payload?.role || 'pasajero',
                    telefono: payload?.telefono || payload?.phone || payload?.telefonoMovil || 'Sin registrar',
                    nivelSeguridad: payload?.nivelSeguridad || payload?.securityLevel || 'Verificado Root',
                    viajesTotales: Number(payload?.viajesTotales || payload?.totalRides || 0),
                    fotoUrl: payload?.fotoUrl || payload?.foto || payload?.foto_perfil || ''
                });
            } else {
                throw new Error("Estructura de respuesta no válida o no mapeada por el core.");
            }
        } catch (err) {
            console.warn("💡 [CIMCO-RESILIENCIA] Fallo al consultar API, activando modo local para:", uid, err);
            setEsModoLocal(true);
            // 🛡️ Guardas de Seguridad contra desbordamientos de UI (Fallback Resiliente)
            setPerfil({
                nombre: user?.nombre || user?.name || user?.displayName || 'Pasajero CIMCO',
                correo: user?.correo || user?.email || 'sin-correo@taxiacimco.com',
                rol: user?.rol || user?.role || 'pasajero',
                telefono: user?.telefono || user?.phone || user?.telefonoMovil || 'Sin registrar',
                nivelSeguridad: 'Verificado Local',
                viajesTotales: 0,
                fotoUrl: user?.fotoUrl || user?.foto || user?.foto_perfil || ''
            });
        } fontFinal: {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        obtenerDatosPerfil();
    }, [obtenerDatosPerfil]);

    const handleUpdateSuccess = async (datosActualizados) => {
        setModoEdicion(false);
        if (datosActualizados) {
            setPerfil((prev) => ({
                ...prev,
                nombre: datosActualizados.nombre || datosActualizados.name || prev?.nombre,
                telefono: datosActualizados.telefonoMovil || datosActualizados.telefono || prev?.telefono,
                fotoUrl: datosActualizados.foto_perfil || datosActualizados.fotoUrl || prev?.fotoUrl
            }));
        }
        await obtenerDatosPerfil();
    };

    if (modoEdicion) {
        return (
            <AjustesPerfil 
                onBack={() => setModoEdicion(false)} 
                onUpdateSuccess={handleUpdateSuccess} 
            />
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center font-mono text-white">
                <div className="flex flex-col items-center gap-3 backdrop-blur-md bg-[#121214]/80 p-6 rounded-2xl border border-white/5 shadow-xl">
                    <Loader className="animate-spin text-yellow-500" size={32} />
                    <span className="tracking-widest uppercase text-[10px] text-zinc-400">Abriendo Expediente...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 p-6 font-mono antialiased flex items-center justify-center relative overflow-hidden">
            {/* Gradiente ambiental premium CIMCO-UI V9.3 */}
            <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="w-full max-w-md backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-6 shadow-2xl relative z-10 transition-all duration-300 hover:border-white/10 space-y-6">
                
                {/* Navegación y Control de Ajustes */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <button
                        type="button"
                        onClick={() => navigate('/pasajero')}
                        className="p-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-xl transition-colors border border-white/5 text-zinc-400 hover:text-white"
                        title="Volver"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Expediente Pasajero</span>
                    <button
                        type="button"
                        onClick={() => setModoEdicion(true)}
                        className="p-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 rounded-xl transition-all duration-200 flex items-center gap-1.5 active:scale-95"
                        title="Configuración de Perfil"
                    >
                        <Settings size={16} />
                    </button>
                </div>

                {/* Banner de Modo Resiliencia si falla la sincronización remota */}
                {esModoLocal && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 flex items-center gap-2 text-amber-400 text-[9px] font-bold uppercase tracking-wider">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>Modo Resiliencia: Expediente local sin sincronización remota</span>
                    </div>
                )}

                {/* Perfil e Identidad */}
                <div className="flex flex-col items-center text-center border-b border-white/5 pb-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.15)] relative group overflow-hidden">
                        {perfil?.fotoUrl ? (
                            <img src={perfil.fotoUrl} alt={perfil.nombre} className="w-full h-full object-cover" />
                        ) : (
                            <User size={36} className="text-yellow-500" />
                        )}
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center shadow-md">
                            <ShieldCheck size={14} className="text-emerald-500" />
                        </div>
                    </div>
                    
                    <h2 className="text-md font-black uppercase tracking-wider text-white mt-4">{perfil?.nombre}</h2>
                    <p className="text-[9px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2.5 py-0.5 rounded font-bold uppercase tracking-widest mt-2">
                        {perfil?.rol || 'pasajero'}
                    </p>
                </div>

                {/* Detalles de Contacto */}
                <div className="flex flex-col gap-3 text-xs">
                    <div className="flex items-center gap-3 bg-zinc-950/40 border border-white/5 p-3 rounded-xl">
                        <Mail size={16} className="text-zinc-500 shrink-0" />
                        <div className="w-full truncate">
                            <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Vector Postal</p>
                            <p className="text-zinc-300 font-semibold mt-0.5 truncate">{perfil?.correo}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-zinc-950/40 border border-white/5 p-3 rounded-xl">
                        <Phone size={16} className="text-zinc-500 shrink-0" />
                        <div>
                            <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Línea Terminal</p>
                            <p className="text-zinc-200 text-xs font-semibold mt-0.5">{perfil?.telefono}</p>
                        </div>
                    </div>
                </div>

                {/* Métricas de Plataforma y Seguridad */}
                <div className="grid grid-cols-2 gap-4 font-bold text-center uppercase">
                    <div className="backdrop-blur-md bg-[#121214]/60 border border-white/5 p-4 rounded-2xl shadow-md">
                        <p className="text-[10px] text-zinc-500 flex items-center justify-center gap-1.5"><Award size={12}/> Trayectos</p>
                        <p className="text-2xl font-black text-yellow-500 mt-1">{perfil?.viajesTotales}</p>
                        <p className="text-[8px] text-zinc-500 font-bold mt-1 tracking-wider">Registrados en Core</p>
                    </div>
                    <div className="backdrop-blur-md bg-[#121214]/60 border border-white/5 p-4 rounded-2xl shadow-md flex flex-col justify-center items-center">
                        <p className="text-[10px] text-zinc-500 flex items-center justify-center gap-1.5"><Shield size={12}/> Estado Token</p>
                        <div className="mt-2 text-[9px] bg-zinc-950/80 px-2 py-1.5 rounded-lg border border-white/5 text-zinc-400 tracking-wider w-full truncate font-mono">
                            {perfil?.nivelSeguridad || 'Activo Secure'}
                        </div>
                        <p className="text-[8px] text-zinc-500 font-bold mt-1 tracking-wider">Firma Digital</p>
                    </div>
                </div>

                {/* Acción Principal para Edición */}
                <button
                    type="button"
                    onClick={() => setModoEdicion(true)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-zinc-950 font-black text-xs font-mono uppercase tracking-widest rounded-xl shadow-lg shadow-yellow-500/10 transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                    <Settings size={14} />
                    <span>Editar Configuración de Perfil</span>
                </button>

            </div>
        </div>
    );
};

export default PerfilPasajero;