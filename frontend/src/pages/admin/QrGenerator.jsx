// Versión Arquitectura: V3.0 - Nodos QR Híbridos con Branding de Confianza Embebido
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, ShieldCheck, QrCode } from 'lucide-react';
import { HOST_IP } from '../../config/api';

export default function QrGenerator() {
    // 1. Matriz Operativa Integral (6 Roles)
    const rolesDisponibles = [
        { id: 'mototaxi', etiqueta: 'Mototaxi', color: '#eab308' },
        { id: 'moto-parrillero', etiqueta: 'Moto Parrillero', color: '#38bdf8' },
        { id: 'motocarga', etiqueta: 'Motocarga', color: '#a855f7' },
        { id: 'pasajero', etiqueta: 'Pasajero', color: '#10b981' },
        { id: 'despachador', etiqueta: 'Despachador', color: '#f97316' },
        { id: 'intermunicipal', etiqueta: 'Intermunicipal', color: '#ef4444' }
    ];

    // 2. Generador Atómico de Insignias SVG (Confianza Visual)
    const generarLogoSVG = (etiqueta, color) => {
        const svgString = `
            <svg xmlns="http://www.w3.org/2000/svg" width="130" height="45" viewBox="0 0 130 45">
                <rect width="130" height="45" fill="#ffffff" rx="6" stroke="${color}" stroke-width="3"/>
                <text x="50%" y="40%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="900" fill="#000000">TAXIA-CIMCO</text>
                <text x="50%" y="75%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="bold" fill="${color}">${etiqueta.toUpperCase()}</text>
            </svg>
        `.trim();
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    };

    // 3. Motor de Exportación a PNG
    const downloadQR = (id, label) => {
        const svg = document.getElementById(id);
        const source = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        
        img.onload = () => {
            canvas.width = 400; 
            canvas.height = 400;
            ctx.fillStyle = "#ffffff"; 
            ctx.fillRect(0, 0, 400, 400);
            ctx.drawImage(img, 0, 0, 400, 400);
            const link = document.createElement("a");
            link.download = `QR_TAXIA_CIMCO_${label.toUpperCase()}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        };
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 p-8 font-sans antialiased">
            <header className="mb-8 flex items-center gap-3 backdrop-blur-md bg-[#121214]/80 border border-zinc-800/40 p-5 rounded-2xl shadow-lg">
                <ShieldCheck className="text-emerald-400" size={28} />
                <div>
                    <h1 className="text-sm font-bold tracking-widest uppercase text-zinc-200">Generador de Nodos Híbridos • Branding Seguro</h1>
                    <p className="text-[10px] font-mono text-zinc-500 mt-1 uppercase">Red Activa: {HOST_IP}</p>
                </div>
            </header>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {rolesDisponibles.map((rol) => {
                    const urlAcceso = `${HOST_IP}/login?role=${rol.id}`;
                    const idElemento = `qr-${rol.id}`;

                    return (
                        <div key={rol.id} className="backdrop-blur-md bg-[#121214]/80 p-8 rounded-2xl border border-zinc-800/50 flex flex-col items-center shadow-xl transition-all hover:border-zinc-700/50 group">
                            
                            <div className="flex items-center gap-2 mb-6 w-full justify-center border-b border-zinc-800/40 pb-4">
                                <QrCode size={18} style={{ color: rol.color }} />
                                <h2 className="text-[11px] font-mono font-bold tracking-widest uppercase text-zinc-300">
                                    {rol.etiqueta}
                                </h2>
                            </div>

                            <div className="bg-white p-4 rounded-xl shadow-inner relative group-hover:scale-105 transition-transform duration-300">
                                <QRCodeSVG 
                                    id={idElemento} 
                                    value={urlAcceso} 
                                    size={220} 
                                    level="H" 
                                    includeMargin={false}
                                    imageSettings={{
                                        src: generarLogoSVG(rol.etiqueta, rol.color),
                                        x: undefined,
                                        y: undefined,
                                        height: 45,
                                        width: 130,
                                        excavate: true, // Esto limpia los pixeles detrás del logo para asegurar lectura perfecta
                                    }}
                                />
                            </div>
                            
                            <button 
                                onClick={() => downloadQR(idElemento, rol.id)} 
                                className="mt-8 w-full font-mono py-3 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all flex items-center justify-center gap-2 border hover:bg-opacity-80"
                                style={{
                                    backgroundColor: `${rol.color}15`, 
                                    color: rol.color,
                                    borderColor: `${rol.color}40` 
                                }}
                            >
                                <Download size={14} /> Descargar Identificador
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}