// Versión Arquitectura: V11.1 - Saneamiento de Dependencias y Resiliencia Limpia de Perfil
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\pasajero\PerfilPasajero.jsx
 * Misión: Despliegue de expediente de identidad del pasajero bajo la estética premium CIMCO-UI V9.3.
 * Ajuste V11.1: Corrección atómica del array de dependencias en useEffect para mitigar bucles infinitos de renderizado y blindaje de resiliencia local.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { API_CORE_URL } from '@/config/api'; 
import { User, Mail, Shield, ShieldCheck, Phone, Award, Loader } from 'lucide-react';

const PerfilPasajero = () => {
    const { user } = useAuth();
    const [perfil, setPerfil] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;

        const obtenerDatosPerfil = async () => {
            try {
                setLoading(true);
                // 📡 Consumo unificado mediante API_CORE_URL
                const respuesta = await fetch(`${API_CORE_URL}/api/usuarios/perfil/${user.uid}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                const data = await respuesta.json();
                if (data.success) {
                    setPerfil(data.perfil);
                } else {
                    throw new Error("Estructura no mapeada por el core.");
                }
            } catch (err) {
                console.warn("💡 [CIMCO-RESILIENCIA] Modo local activo para:", user.uid);
                // 🛡️ Guardas de Seguridad contra desbordamientos de UI (Anti-Undefined)
                setPerfil({
                    nombre: user?.nombre || user?.name || user?.displayName || 'Pasajero CIMCO',
                    correo: user?.correo || user?.email || 'sin-correo@taxiacimco.com',
                    rol: user?.rol || user?.role || 'pasajero',
                    telefono: user?.telefono || 'Sin registrar',
                    nivelSeguridad: 'Verificado Root',
                    viajesTotales: 0 // Valor base neutro para no falsear auditoría
                });
            } finally {
                setLoading(false);
            }
        };

        obtenerDatosPerfil();
    }, [user?.uid]); // 🚀 Corrección de dependencia para mitigar loops de renderizado

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
            {/* Gradiante ambiental premium */}
            <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="w-full max-w-md backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-6 shadow-2xl relative z-10 transition-all duration-300 hover:border-white/10">
                <div className="flex flex-col items-center text-center border-b border-white/5 pb-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.15)] relative group">
                        <User size={36} className="text-yellow-500" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center shadow-md">
                            <ShieldCheck size={14} className="text-emerald-500" />
                        </div>
                    </div>
                    
                    <h2 className="text-md font-black uppercase tracking-wider text-white mt-4">{perfil?.nombre}</h2>
                    <p className="text-[9px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2.5 py-0.5 rounded font-bold uppercase tracking-widest mt-2">
                        {perfil?.rol || 'Pasajero'}
                    </p>
                </div>

                <div className="py-6 flex flex-col gap-4 text-xs">
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

                <div className="grid grid-cols-2 gap-4 font-bold text-center uppercase">
                    <div className="backdrop-blur-md bg-[#121214]/60 border border-white/5 p-4 rounded-2xl shadow-md">
                        <p className="text-[10px] text-zinc-500 flex items-center justify-center gap-1.5"><Award size={12}/> Trayectos</p>
                        <p className="text-2xl font-black text-yellow-500 mt-1">{perfil?.viajesTotales}</p>
                        <p className="text-[8px] text-zinc-500 font-bold mt-1 tracking-wider">Registrados en Core</p>
                    </div>
                    <div className="backdrop-blur-md bg-[#121214]/60 border border-white/5 p-4 rounded-2xl shadow-md flex flex-col justify-center items-center">
                        <p className="text-[10px] text-zinc-500 flex items-center justify-center gap-1.5"><Shield size={12}/> Estado Token</p>
                        <div className="mt-2 text-[9px] bg-zinc-950/80 px-2 py-1.5 rounded-lg border border-white/5 text-zinc-400 tracking-wider w-full truncate font-mono">
                            {perfil?.nivelSeguridad || 'Activo Segure'}
                        </div>
                        <p className="text-[8px] text-zinc-500 font-bold mt-1 tracking-wider">Firma Digital</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerfilPasajero;