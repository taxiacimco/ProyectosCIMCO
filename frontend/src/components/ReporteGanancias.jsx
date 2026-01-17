import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaMoneyBillWave, FaTrophy, FaUserAlt, FaChartBar } from 'react-icons/fa';

const ReporteGanancias = () => {
    const [reporte, setReporte] = useState({
        totalVendido: 0,
        gananciasCimco: 0,
        totalViajes: 0,
        detalleConductores: [] // Nueva lista para el desglose
    });

    const fetchGanancias = async () => {
        try {
            // Conectamos al endpoint de Java
            const res = await axios.get('http://localhost:8081/api/viajes/reporte-ganancias');
            if (res.data) {
                setReporte(res.data);
            }
        } catch (error) {
            console.error("Error al obtener reporte financiero:", error);
        }
    };

    useEffect(() => {
        fetchGanancias();
        const intervalo = setInterval(fetchGanancias, 10000); // Cada 10 seg para no saturar el backend
        return () => clearInterval(intervalo);
    }, []);

    return (
        <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <FaChartBar className="text-cyan-400" /> RENDIMIENTO DE FLOTA (HOY)
                </h2>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full border border-cyan-500/20 font-bold uppercase tracking-widest">
                    Live Data
                </span>
            </div>

            {/* TABLA DE DETALLE POR CONDUCTOR */}
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-800">
                            <th className="pb-3 pl-2">Conductor</th>
                            <th className="pb-3 text-center">Viajes</th>
                            <th className="pb-3 text-right">Producido Bruto</th>
                            <th className="pb-3 text-right text-cyan-400 font-black">CIMCO (10%)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {reporte.detalleConductores && reporte.detalleConductores.length > 0 ? (
                            reporte.detalleConductores.map((c, index) => (
                                <tr key={index} className="group hover:bg-slate-800/30 transition-colors">
                                    <td className="py-4 pl-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 border border-slate-700">
                                                <FaUserAlt size={12} />
                                            </div>
                                            <span className="text-sm font-medium text-slate-200">{c.nombre}</span>
                                            {index === 0 && <FaTrophy className="text-yellow-500 text-xs" title="Top Producer" />}
                                        </div>
                                    </td>
                                    <td className="py-4 text-center text-sm font-bold text-slate-400">
                                        {c.cantidadViajes}
                                    </td>
                                    <td className="py-4 text-right text-sm font-bold text-slate-300">
                                        ${c.totalProducido.toLocaleString()}
                                    </td>
                                    <td className="py-4 text-right text-sm font-black text-cyan-400">
                                        ${(c.totalProducido * 0.10).toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="py-10 text-center text-slate-600 text-xs italic">
                                    No hay movimientos registrados hoy todavía.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* RESUMEN INFERIOR RÁPIDO */}
            <div className="mt-6 p-4 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Resumen Global:</p>
                <div className="flex gap-6">
                    <span className="text-xs font-bold text-emerald-400">Total: ${reporte.totalVendido?.toLocaleString()}</span>
                    <span className="text-xs font-bold text-cyan-400">CIMCO: ${reporte.gananciasCimco?.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

export default ReporteGanancias;