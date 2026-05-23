// Versión Arquitectura: V9.3 - Sincronización de Historial Transaccional y Blindaje Anti-Undefined
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\pasajero\HistorialViajes.jsx
 * Misión: Renderizar el registro histórico de trayectos finalizados consumiendo el Core de MongoDB.
 * Estética: Ciber-Neo-Brutalismo / CIMCO-UI (Bordes gruesos, alto contraste, sombras duras).
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Calendar, MapPin, DollarSign, Clock, Loader, AlertTriangle } from 'lucide-react';

const HistorialViajes = () => {
    const { user } = useAuth();
    const [viajes, setViajes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // 🛡️ GUARDA DE SEGURIDAD OBLIGATORIA (Anti-Undefined)
        // Bloquea cualquier petición hasta que el estado global de autenticación esté inicializado con éxito.
        if (!user || !user.uid) {
            console.warn("⚠️ [Historial] Esperando inicialización del estado de autenticación...");
            return;
        }

        const cargarHistorial = async () => {
            try {
                setLoading(true);
                // 📡 Consumo directo del Backend Core Node.js / MongoDB Atlas
                const respuesta = await fetch(`http://localhost:3000/api/viajes/pasajero/${user.uid}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                const data = await respuesta.json();

                if (!respuesta.ok) {
                    throw new Error(data.message || 'Error al recuperar el historial transaccional.');
                }

                setViajes(data.success ? data.viajes : []);
            } catch (err) {
                console.error("❌ Error de Arquitectura en Historial:", err.message);
                setError(err.message);
                // Fallback de desarrollo con datos mock estructurados bajo el esquema sagrado
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
            <div className="min-h-screen bg-[#050505] flex items-center justify-center font-sans text-white">
                <div className="flex flex-col items-center gap-3 border-4 border-white p-6 bg-zinc-900 shadow-[8px_8px_0px_0px_#eab308]">
                    <Loader className="animate-spin text-yellow-500" size={32} />
                    <span className="font-black tracking-tighter uppercase text-xs">Sincronizando con MongoDB Atlas...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 font-sans overflow-x-hidden">
            <div className="max-w-4xl mx-auto">
                
                {/* Encabezado Neo-Brutalista */}
                <header className="border-b-4 border-white pb-4 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase">
                            MIS <span className="text-yellow-500">VIAJES</span>
                        </h1>
                        <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest mt-1">
                            Registro de Servicios • Terminal de Auditoría Pasajero
                        </p>
                    </div>
                    <div className="bg-yellow-500 text-black px-4 py-1.5 text-xs font-black uppercase border-2 border-black shadow-[4px_4px_0px_0px_#fff]">
                        Total Trayectos: {viajes.length}
                    </div>
                </header>

                {error && (
                    <div className="bg-red-500/10 border-4 border-red-600 p-4 mb-6 text-red-400 font-bold text-sm flex items-center gap-3 shadow-[4px_4px_0px_0px_#000]">
                        <AlertTriangle size={20} />
                        <span>Modo Sandbox: Mostrando logs de contingencia local activa ({error})</span>
                    </div>
                )}

                {/* Lista de Viajes */}
                <div className="space-y-6">
                    {viajes.length === 0 ? (
                        <div className="border-4 border-zinc-800 p-8 text-center bg-zinc-950 shadow-[6px_6px_0px_0px_#333]">
                            <p className="text-zinc-500 font-black uppercase text-sm tracking-wide">No se registran transacciones previas en La Jagua.</p>
                        </div>
                    ) : (
                        viajes.map((viaje) => (
                            <div 
                                key={viaje.id} 
                                className="bg-zinc-900 border-4 border-white p-5 shadow-[8px_8px_0px_0px_#fff] hover:shadow-[8px_8px_0px_0px_#eab308] hover:border-yellow-500 transition-all group"
                            >
                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b-2 border-zinc-800 pb-3 mb-4">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="text-yellow-500" size={18} />
                                        <span className="font-black uppercase text-xs text-zinc-300">
                                            {viaje.fecha || 'Fecha No Registrada'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] bg-zinc-800 text-zinc-400 font-black px-2 py-0.5 border border-zinc-700">
                                            ID: {viaje.id.substring(0, 10)}
                                        </span>
                                        <span className="bg-green-500 text-black font-black px-3 py-0.5 text-xs uppercase border border-black">
                                            COMPLETADO
                                        </span>
                                    </div>
                                </div>

                                {/* Ruta */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-bold text-sm mb-4">
                                    <div className="flex items-start gap-2 bg-zinc-950 p-3 border border-zinc-800">
                                        <MapPin className="text-green-500 shrink-0 mt-0.5" size={16} />
                                        <div>
                                            <p className="text-[9px] uppercase text-zinc-500 font-black">Punto de Recogida</p>
                                            <p className="text-zinc-200 tracking-tight">{viaje.origen}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 bg-zinc-950 p-3 border border-zinc-800">
                                        <MapPin className="text-red-500 shrink-0 mt-0.5" size={16} />
                                        <div>
                                            <p className="text-[9px] uppercase text-zinc-500 font-black">Destino Final</p>
                                            <p className="text-zinc-200 tracking-tight">{viaje.destino}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Métricas Financieras */}
                                <div className="grid grid-cols-3 gap-2 md:gap-4 font-black text-center uppercase">
                                    <div className="border-2 border-zinc-800 p-2 bg-zinc-950">
                                        <p className="text-[8px] text-zinc-500 flex items-center justify-center gap-1"><Clock size={10}/> Distancia</p>
                                        <p className="text-lg text-white mt-0.5">{viaje.distancia} <span className="text-xs text-zinc-500">Km</span></p>
                                    </div>
                                    <div className="border-2 border-zinc-800 p-2 bg-zinc-950">
                                        <p className="text-[8px] text-zinc-500 flex items-center justify-center gap-1"><DollarSign size={10}/> Costo</p>
                                        <p className="text-lg text-yellow-500 mt-0.5">${viaje.oferta.toLocaleString()}</p>
                                    </div>
                                    <div className="border-2 border-zinc-800 p-2 bg-zinc-950 flex flex-col justify-center items-center">
                                        <p className="text-[8px] text-zinc-500">Conductor</p>
                                        <p className="text-xs text-zinc-300 truncate w-full mt-1 font-extrabold italic tracking-tight">
                                            {viaje.conductorNombre || 'UNIDAD CIMCO'}
                                        </p>
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