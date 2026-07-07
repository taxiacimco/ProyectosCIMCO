// Versión Arquitectura: V20.1 - Hub Central Sincronizado CIMCO-UI V9.3
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\Register.jsx
 * Misión: Enrutador maestro de roles operativos. Rediseño Glassmorphism para transición transparente desde Login.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { User, Bike, Bus, Terminal, Shield, ArrowLeft } from 'lucide-react';

const Register = () => {
    // 🗂️ Mapeo de Roles y Rutas
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
            desc: 'Operadores de mediana y larga distancia.',
            path: '/register-intermunicipal',
            icon: <Bus size={24} className="text-indigo-500" />,
            borderColor: 'hover:border-indigo-500/50',
            bgColor: 'hover:bg-indigo-500/10'
        },
        {
            id: 'despachador',
            title: 'Despachador',
            desc: 'Gestión y asignación de unidades.',
            path: '/register-despachador',
            icon: <Terminal size={24} className="text-amber-500" />,
            borderColor: 'hover:border-amber-500/50',
            bgColor: 'hover:bg-amber-500/10'
        }
    ];

    return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 relative overflow-hidden">
            {/* FONDO ESTÉTICO CIMCO-UI HOMOLOGADO */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-black to-black z-0" />

            <div className="w-full max-w-2xl backdrop-blur-md bg-[#121214]/80 border border-white/5 p-8 rounded-3xl shadow-2xl relative z-10">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Selección de Nodo</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1 tracking-widest uppercase">
                        Elige tu rol dentro del ecosistema híbrido
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {roles.map((rol) => (
                        <Link 
                            key={rol.id} 
                            to={rol.path}
                            className={`flex items-start gap-4 p-5 rounded-2xl border border-white/5 bg-black/40 transition-all duration-300 group ${rol.borderColor} ${rol.bgColor}`}
                        >
                            <div className="p-3 bg-white/5 rounded-xl group-hover:scale-110 transition-transform">
                                {rol.icon}
                            </div>
                            <div>
                                <h3 className="text-white font-bold tracking-wide mb-1 uppercase text-sm">{rol.title}</h3>
                                <p className="text-zinc-500 text-[9px] uppercase font-mono tracking-wider leading-relaxed">
                                    {rol.desc}
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