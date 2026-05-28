// Versión Arquitectura: V2.6 - Sincronización de Nodos QR con IP Local (192.168.100.34)
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, ShieldCheck } from 'lucide-react';

export default function QrGenerator() {
    // 🛡️ IP Estática de Sincronización en Red Local
    const hostIp = "http://192.168.100.34:5173";
    
    const urlPasajero = `${hostIp}/register?role=pasajero`;
    const urlConductor = `${hostIp}/register?role=conductor`;

    const getLogoConfig = (role) => ({
        src: "/logo-cimco.png",
        height: 40,
        width: 40,
        excavate: true,
    });

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
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white p-8">
            <h1 className="text-2xl font-bold tracking-widest mb-8 flex items-center gap-3 text-emerald-400">
                <ShieldCheck /> Generador de Nodos Híbridos (Red Local Activa)
            </h1>
            
            <div className="grid grid-cols-2 gap-8">
                <div className="backdrop-blur-md bg-[#121214]/80 p-6 rounded-xl border border-zinc-800 flex flex-col items-center">
                    <QRCodeSVG id="qr-pasajero" value={urlPasajero} size={250} level="H" includeMargin={true} />
                    <button onClick={() => downloadQR("qr-pasajero", "PASAJERO")} className="mt-6 bg-emerald-600 hover:bg-emerald-500 px-6 py-2 rounded-lg text-xs uppercase font-bold transition-all">Descargar Pasajero</button>
                </div>

                <div className="backdrop-blur-md bg-[#121214]/80 p-6 rounded-xl border border-zinc-800 flex flex-col items-center">
                    <QRCodeSVG id="qr-conductor" value={urlConductor} size={250} level="H" includeMargin={true} />
                    <button onClick={() => downloadQR("qr-conductor", "CONDUCTOR")} className="mt-6 bg-emerald-600 hover:bg-emerald-500 px-6 py-2 rounded-lg text-xs uppercase font-bold transition-all">Descargar Conductor</button>
                </div>
            </div>
        </div>
    );
}