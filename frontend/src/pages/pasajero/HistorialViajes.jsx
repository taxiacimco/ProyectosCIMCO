// Versión Arquitectura: V9.6 - Migración a Glassmorphism CIMCO-UI e Integración de API_CORE
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\pasajero\HistorialViajes.jsx
 * Misión: Renderizar el registro histórico de trayectos finalizados consumiendo el Core de MongoDB.
 * Estética: Migrado a CIMCO-UI V9.3 (Glassmorphism, backdrop-blur-md, sin bordes brutalistas).
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { API_CORE_URL } from '../../config/api'; // 📡 Importación central
import { Calendar, MapPin, DollarSign, Clock, Loader, AlertTriangle } from 'lucide-react';

const HistorialViajes = () => {
    const { user } = useAuth();
    const [viajes, setViajes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // 🛡️ GUARDA DE SEGURIDAD OBLIGATORIA (Anti-Undefined)
        if (!user || !user.uid) {
            console.warn("⚠️ [Historial] Esperando inicialización del estado de autenticación...");
            return;
        }

        const cargarHistorial = async () => {
            try {
                setLoading(true);
                // 📡 Uso dinámico del API_CORE_URL
                const respuesta = await fetch(`${API_CORE_URL}/api/viajes/pasajero/${user.uid}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                const data = await respuesta.json();
                if (!respuesta.ok) throw new Error(data.message || 'Falla de lectura.');
                setViajes(data.success ? data.viajes : []);
            } catch (err) {
                console.error("❌ Error de Arquitectura en Historial:", err.message);
                setError(err.message);
                // Fallback de desarrollo con datos mock estructurados
                setViajes([
                    { id: 'mock_1', origen: 'Plaza Principal La Jagua', destino: 'Barrio El Cruce', oferta: 5000, distancia: 2.5, fecha: '2026-05-18', conductorNombre: 'Juan Pérez' },
                    { id: 'mock_2', origen: 'Sector Industrial', destino: 'Centro Médico CIMCO', oferta: 7000, distancia: 4.1, fecha: '2026-05-15', conductorNombre: 'Marlon Castro' }
                ]);
            } finally {
                setLoading(false);
            }
        };

        cargarHistorial();
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center font-sans text-zinc-100">
                <div className="flex flex-col items-center gap-3 backdrop-blur-md bg-[#121214]/80 p-6 rounded-2xl border border-zinc-800/50 shadow-xl">
                    <Loader className="animate-spin text-yellow-500" size={32} />
                    <span className="font-mono tracking-widest uppercase text-[10px] text-zinc-400">SINCRONIZANDO CORE MONGODB...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 p-6 font-sans antialiased">
            <div className="max-w-4xl mx-auto">
                <header className="backdrop-blur-md bg-[#121214]/80 border border-zinc-800/40 p-5 rounded-2xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tight text-zinc-200 flex items-center gap-2">
                            <Clock className="text-yellow-500" size={24} /> Historial Transaccional
                        </h1>
                        <p className="text-[10px] font-mono text-zinc-500 tracking-widest mt-1 uppercase">
                            Registros Auditoría Pasajero
                        </p>
                    </div>
                    <div className="bg-zinc-950/50 border border-zinc-800/80 px-4 py-2 rounded-xl text-xs font-mono font-bold text-yellow-500 uppercase">
                        Total Trayectos: {viajes.length}
                    </div>
                </header>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-950/20 border border-red-900/40 text-red-400 text-[11px] font-mono uppercase tracking-wide flex items-start gap-2.5">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <span className="leading-relaxed">Modo Sandbox: Mostrando logs locales ({error})</span>
                    </div>
                )}

                <div className="space-y-4">
                    {viajes.length === 0 ? (
                        <div className="backdrop-blur-md bg-[#121214]/60 border border-dashed border-zinc-800/50 p-12 text-center rounded-2xl">
                            <p className="text-zinc-500 font-mono uppercase text-xs tracking-widest">No hay transacciones registradas.</p>
                        </div>
                    ) : (
                        viajes.map((viaje) => (
                            <div key={viaje.id} className="backdrop-blur-md bg-[#121214]/80 border border-zinc-800/50 p-5 rounded-2xl shadow-xl transition-all hover:border-zinc-700/60 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="w-full md:w-auto flex-1 space-y-2">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-1.5 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                                            <Calendar className="text-yellow-500" size={14} />
                                        </div>
                                        <span className="font-mono font-bold uppercase text-[10px] text-zinc-400 tracking-wider">
                                            {viaje.fecha || 'Fecha No Registrada'}
                                        </span>
                                        <span className="text-[10px] bg-zinc-900 text-zinc-400 font-mono px-2 py-0.5 rounded-md border border-zinc-800 ml-2">
                                            ID: {viaje.id.substring(0, 10)}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 text-[11px] font-mono uppercase">
                                        <div className="flex items-start gap-2">
                                            <MapPin size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                            <span className="text-zinc-300 truncate"><span className="text-zinc-600">Origen:</span> {viaje.origen}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <MapPin size={14} className="text-red-400 shrink-0 mt-0.5" />
                                            <span className="text-zinc-300 truncate"><span className="text-zinc-600">Destino:</span> {viaje.destino}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="w-full md:w-auto bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-xl flex flex-col items-end gap-1">
                                    <div className="flex w-full justify-between items-center md:hidden mb-2">
                                       <span className="text-[10px] font-mono text-zinc-500">LIQUIDACIÓN:</span>
                                    </div>
                                    <p className="text-lg font-mono font-bold text-yellow-500">${(viaje.oferta || 0).toLocaleString()} COP</p>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-[9px] font-mono text-zinc-500">{viaje.distancia} Km</span>
                                        <span className="mt-1 text-[9px] px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono uppercase tracking-wider">
                                            COMPLETADO
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default HistorialViajes;