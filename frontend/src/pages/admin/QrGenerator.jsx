// Versión Arquitectura: V2.5 - Abstracción de Nodos mediante Variables de Entorno (VITE_ENV)
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, ShieldCheck } from 'lucide-react';

export default function QrGenerator() {
    // Consumo de variable de entorno definida en .env
    const backendNgrok = import.meta.env.VITE_BACKEND_NGROK_URL || "http://localhost:3000";
    
    const urlPasajero = `${backendNgrok}/register/pasajero`;
    const urlConductor = `${backendNgrok}/register/conductor`;

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
            link.download = `QR_TAXIA_CIMCO_${label}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        };
        img.src = "data:image/svg+xml;base64," + btoa(source);
    };

    const getLogoConfig = (roleLabel) => ({
        src: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'><rect width='200' height='60' fill='%2309090b' rx='10'/><text x='50%' y='35%' font-size='20' font-weight='bold' fill='%23ffffff' text-anchor='middle' font-family='sans-serif'>TAXIA-CIMCO</text><text x='50%' y='75%' font-size='16' fill='%2334d399' text-anchor='middle' font-family='sans-serif'>${roleLabel}</text></svg>`,
        height: 60, width: 200, excavate: true
    });

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 p-8 flex flex-col items-center">
            <div className="max-w-4xl w-full backdrop-blur-md bg-[#121214]/80 border border-zinc-800/50 rounded-xl p-8 shadow-2xl">
                <h1 className="text-xl font-bold uppercase tracking-widest mb-8 flex items-center gap-3">
                    <ShieldCheck className="text-emerald-500" /> Generador de Nodos (Config: {import.meta.env.MODE})
                </h1>
                
                <div className="grid grid-cols-2 gap-8">
                    {/* NODO PASAJERO */}
                    <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800 flex flex-col items-center">
                        <QRCodeSVG id="qr-pasajero" value={urlPasajero} size={250} level="H" includeMargin={true} imageSettings={getLogoConfig("PASAJERO")} />
                        <button onClick={() => downloadQR("qr-pasajero", "PASAJERO")} className="mt-6 bg-zinc-800 hover:bg-zinc-700 px-6 py-2 rounded-lg text-xs uppercase font-bold transition-all duration-200">Descargar Pasajero</button>
                    </div>

                    {/* NODO CONDUCTOR */}
                    <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800 flex flex-col items-center">
                        <QRCodeSVG id="qr-conductor" value={urlConductor} size={250} level="H" includeMargin={true} imageSettings={getLogoConfig("CONDUCTOR")} />
                        <button onClick={() => downloadQR("qr-conductor", "CONDUCTOR")} className="mt-6 bg-zinc-800 hover:bg-zinc-700 px-6 py-2 rounded-lg text-xs uppercase font-bold transition-all duration-200">Descargar Conductor</button>
                    </div>
                </div>
            </div>
        </div>
    );
}