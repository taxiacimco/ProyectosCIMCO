// Versión Arquitectura: V3.4 - Motor de Renderizado Canvas y Exportación Masiva de Nodos QR
/**
 * Ubicación: @/pages/admin/QrGenerator.jsx
 * Misión: Generación de identificadores de red con inyección atómica de branding y exportación en lote.
 * Resolución: Implementación de rasterización SVG-to-Canvas para descargas PNG confiables y bypass de bloqueos de navegador en descargas masivas.
 */

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, QrCode, Layers, Loader } from 'lucide-react';

// 🚀 GOBERNANZA DE RUTAS: Alias absoluto consumido
import { HOST_IP } from '@/config/api'; 

export default function QrGenerator() {
    const [procesandoMasivo, setProcesandoMasivo] = useState(false);

    // 1. Matriz Operativa Integral
    const rolesDisponibles = [
        { id: 'mototaxi', etiqueta: 'Mototaxi', color: '#eab308' },
        { id: 'moto-parrillero', etiqueta: 'Moto Parrillero', color: '#38bdf8' },
        { id: 'motocarga', etiqueta: 'Motocarga', color: '#a855f7' },
        { id: 'pasajero', etiqueta: 'Pasajero', color: '#10b981' },
        { id: 'despachador', etiqueta: 'Despachador', color: '#f97316' },
        { id: 'intermunicipal', etiqueta: 'Intermunicipal', color: '#ef4444' }
    ];

    // 2. Motor Atómico de Rasterización (SVG a PNG)
    const exportarNodoPNG = (rolId, etiqueta, colorHex) => {
        return new Promise((resolve) => {
            const svgElement = document.getElementById(`qr-svg-${rolId}`);
            if (!svgElement) {
                console.error(`⚠️ [CIMCO-QR] Nodo SVG no encontrado para rasterización: ${rolId}`);
                resolve();
                return;
            }

            const svgData = new XMLSerializer().serializeToString(svgElement);
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const img = new Image();

            img.onload = () => {
                // Dimensiones con margen para branding inferior
                canvas.width = img.width + 40;
                canvas.height = img.height + 80;

                // Fondo Premium CIMCO
                ctx.fillStyle = "#09090b"; 
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Marco sutil
                ctx.strokeStyle = colorHex;
                ctx.lineWidth = 2;
                ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

                // Dibujar QR centrado
                ctx.drawImage(img, 20, 20);

                // Inyección de Branding Inferior
                ctx.font = "bold 18px monospace";
                ctx.fillStyle = colorHex;
                ctx.textAlign = "center";
                ctx.fillText(`[ NODO: ${etiqueta.toUpperCase()} ]`, canvas.width / 2, canvas.height - 25);

                // Disparo de descarga
                const pngFile = canvas.toDataURL("image/png");
                const downloadLink = document.createElement("a");
                downloadLink.download = `TAXIA_CIMCO_QR_${rolId.toUpperCase()}.png`;
                downloadLink.href = pngFile;
                downloadLink.click();
                
                resolve();
            };

            // 🛡️ Blindaje de codificación para evitar bloqueos del navegador
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
        });
    };

    // 3. Orquestador de Descarga Masiva (Evita bloqueos por spam del navegador)
    const ejecutarDescargaMasiva = async () => {
        setProcesandoMasivo(true);
        try {
            for (const rol of rolesDisponibles) {
                await exportarNodoPNG(rol.id, rol.etiqueta, rol.color);
                // Delay táctico de 600ms entre descargas para simular acción humana y evitar bloqueos de seguridad del Chrome/Edge
                await new Promise(r => setTimeout(r, 600)); 
            }
        } catch (error) {
            console.error("❌ [CIMCO-QR-FATAL] Fallo en orquestación de descarga masiva:", error);
        } finally {
            setProcesandoMasivo(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-8 font-sans antialiased min-h-screen">
            
            {/* ENCABEZADO Y CONTROLES MAESTROS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 pb-6 border-b border-zinc-800/40 gap-6">
                <div>
                    <h1 className="text-xl font-black tracking-tight text-white uppercase font-mono flex items-center gap-3">
                        <QrCode className="text-yellow-500" size={24} />
                        Gestor de Nodos QR
                    </h1>
                    <p className="text-[10px] text-zinc-400 font-mono tracking-widest mt-2 uppercase">
                        Generación y Rasterización de Identificadores de Red (IP: {HOST_IP})
                    </p>
                </div>

                <button 
                    onClick={ejecutarDescargaMasiva}
                    disabled={procesandoMasivo}
                    className="bg-[#121214]/80 backdrop-blur-md border border-yellow-500/30 hover:border-yellow-500 hover:bg-yellow-500/10 text-yellow-500 py-3 px-6 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(234,179,8,0.1)] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                    {procesandoMasivo ? (
                        <><Loader className="animate-spin" size={14} /> Rasterizando Lote...</>
                    ) : (
                        <><Layers size={14} /> Descarga Masiva (6 Nodos)</>
                    )}
                </button>
            </div>

            {/* MATRIZ DE RENDERIZADO */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rolesDisponibles.map((rol) => (
                    <div key={rol.id} className="bg-[#121214]/80 backdrop-blur-md border border-white/5 p-8 rounded-2xl flex flex-col items-center shadow-[0_4px_30px_rgba(0,0,0,0.4)] group hover:border-zinc-700 transition-colors">
                        
                        {/* Contenedor del QR con ID para la extracción */}
                        <div className="bg-white p-4 rounded-xl shadow-inner mb-6">
                            <QRCodeSVG 
                                id={`qr-svg-${rol.id}`}
                                value={`http://${HOST_IP}:5173/${rol.id}`} 
                                size={160} 
                                fgColor="#000000" 
                                bgColor="#ffffff" 
                                level="H"
                            />
                        </div>

                        <div className="text-center mb-6 w-full">
                            <h3 className="font-mono text-sm font-bold tracking-widest uppercase mb-1" style={{ color: rol.color }}>
                                {rol.etiqueta}
                            </h3>
                            <p className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase truncate px-2">
                                /ruta/{rol.id}
                            </p>
                        </div>

                        <button 
                            onClick={() => exportarNodoPNG(rol.id, rol.etiqueta, rol.color)}
                            disabled={procesandoMasivo}
                            className="w-full py-3.5 rounded-xl text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-2 border transition-all hover:bg-opacity-80 active:scale-95 disabled:opacity-30"
                            style={{ 
                                backgroundColor: `${rol.color}15`, 
                                color: rol.color, 
                                borderColor: `${rol.color}40` 
                            }}
                        >
                            <Download size={14} /> Rasterizar PNG
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}