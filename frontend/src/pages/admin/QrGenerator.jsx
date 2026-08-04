// Versión Arquitectura: V23.7 - Estandarización de Diccionario de Rutas Amigables QR para Integración con AppRouter
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\admin\QrGenerator.jsx
 * Misión: Generación de códigos QR de reclutamiento con conmutador dinámico entre Entorno de Túnel/Local y Producción (Vercel).
 *         Estandarización de la constante RUTAS_AMIGABLES_ROL alineada 1:1 con el enrutador central AppRouter.jsx.
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism (Identidad Amarilla).
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { QrCode, Download, RefreshCw, ShieldCheck, Loader, AlertTriangle, Printer, Layers, Eye, Trash2, Calendar, UserPlus, Globe, Laptop } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const QrGenerator = () => {
    const { user } = useAuth();
    const [rolSeleccionado, setRolSeleccionado] = useState('mototaxi');
    const [entorno, setEntorno] = useState('produccion'); // 'produccion' | 'local'
    const [qrGenerado, setQrGenerado] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [historialQrs, setHistorialQrs] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(true);
    const qrRef = useRef(null);

    // 🌐 DEFINICIÓN DE ENTORNOS
    const URL_PRODUCCION = "https://frontend-opal-eight-58.vercel.app";
    
    // Resolución dinámica priorizando variables de entorno y origen actual del navegador
    const getUrlLocal = () => {
        // Prioridad 1: Variable VITE_FRONTEND_URL asignada en .env o .env.development
        if (import.meta.env.VITE_FRONTEND_URL) {
            return import.meta.env.VITE_FRONTEND_URL.replace(/\/$/, '');
        }
        // Prioridad 2: Variable VITE_APP_BASE_URL
        if (import.meta.env.VITE_APP_BASE_URL) {
            return import.meta.env.VITE_APP_BASE_URL.replace(/\/$/, '');
        }
        // Prioridad 3: Origen dinámico desde donde el usuario escanea/accede
        if (typeof window !== 'undefined') {
            return window.location.origin;
        }
        return "http://localhost:5173";
    };

    // Determina la Base URL según el entorno seleccionado
    const baseUrlActiva = entorno === 'produccion' ? URL_PRODUCCION : getUrlLocal();

    // Diccionario de Roles del Ecosistema TAXIA CIMCO
    const ROLES_CONTEXTO = {
        mototaxi: 'MOTOTAXI / OPERADOR',
        motoparrillero: 'MOTOPARRILLERO',
        motocarga: 'MOTOCARGA / ACARREOS',
        despachador: 'DESPACHADOR DE NODO',
        intermunicipal: 'TRANSPORTE INTERMUNICIPAL',
        pasajero: 'PASAJERO / USUARIO'
    };

    // 🎯 Mapeo directo y estandarizado a las rutas declaradas en AppRouter.jsx
    const RUTAS_AMIGABLES_ROL = {
        mototaxi: '/mototaxi',
        motoparrillero: '/motoparrillero',
        motocarga: '/motocarga',
        despachador: '/despachador',
        intermunicipal: '/intermunicipal',
        pasajero: '/pasajero'
    };

    // Construye la URL completa apuntando al entorno y rol correcto
    const getRutaDestinoRol = (role = rolSeleccionado, base = baseUrlActiva) => {
        const rolLimpio = (role || '').trim().toLowerCase();
        const subRuta = RUTAS_AMIGABLES_ROL[rolLimpio] || `/login?role=${rolLimpio}`;
        const cleanBase = base.replace(/\/$/, '');
        return `${cleanBase}${subRuta}`;
    };

    const targetUrlString = getRutaDestinoRol();

    // Sincronización en tiempo real con Firestore
    useEffect(() => {
        const pathColeccion = FIRESTORE_PATHS?.qrs || 'qrs';
        const q = query(collection(db, pathColeccion), orderBy('fechaCreacion', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const registros = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setHistorialQrs(registros);
            setLoadingHistorial(false);
        }, (err) => {
            console.error("❌ Error en snapshot de bitácora QR:", err);
            setLoadingHistorial(false);
        });

        return () => unsubscribe();
    }, []);

    const handleGenerarQrRol = async (e) => {
        e.preventDefault();
        if (!rolSeleccionado) {
            setError("Debe seleccionar un rol corporativo válido.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const pathColeccion = FIRESTORE_PATHS?.qrs || 'qrs';
            await addDoc(collection(db, pathColeccion), {
                entidadId: rolSeleccionado.toUpperCase(),
                tipo: 'REGISTRO_ROL',
                entorno: entorno.toUpperCase(),
                creadoPor: user?.email || 'CEO_ADMIN',
                fechaCreacion: serverTimestamp(),
                payloadUrl: targetUrlString
            });

            setQrGenerado(true);
            setLoading(false);
        } catch (err) {
            console.error("❌ Error al salvar credencial institucional:", err);
            setError("Error de red: No se pudo registrar la configuración del QR en Firestore.");
            setLoading(false);
        }
    };

    const handleEliminarRegistro = async (idDoc) => {
        if (!idDoc) return;
        if (!window.confirm("¿Deseas dar de baja este QR institucional del historial de auditoría?")) return;
        try {
            const pathColeccion = FIRESTORE_PATHS?.qrs || 'qrs';
            await deleteDoc(doc(db, pathColeccion, idDoc));
        } catch (err) {
            console.error("❌ No se pudo remover el registro:", err);
        }
    };

    const handleCargarDesdeHistorial = (registro) => {
        if (registro && registro.entidadId && ROLES_CONTEXTO[registro.entidadId.toLowerCase()]) {
            setRolSeleccionado(registro.entidadId.toLowerCase());
            if (registro.payloadUrl?.includes('vercel.app')) {
                setEntorno('produccion');
            } else {
                setEntorno('local');
            }
            setQrGenerado(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleDescargarQr = () => {
        try {
            const svgElement = qrRef.current?.querySelector('svg');
            if (!svgElement) return;

            const svgString = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const urlContext = window.URL || window.webkitURL || window;
            const blobURL = urlContext.createObjectURL(svgBlob);
            
            const image = new Image();
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 1024;
                canvas.height = 1024;
                const context = canvas.getContext('2d');
                if (context) {
                    context.fillStyle = '#ffffff';
                    context.fillRect(0, 0, canvas.width, canvas.height);
                    context.drawImage(image, 64, 64, 896, 896);
                    const pngURL = canvas.toDataURL('image/png');
                    const downloadLink = document.createElement('a');
                    downloadLink.href = pngURL;
                    downloadLink.download = `CIMCO_QR_${entorno.toUpperCase()}_${(rolSeleccionado || '').toUpperCase()}.png`;
                    downloadLink.click();
                }
                urlContext.revokeObjectURL(blobURL);
            };
            image.src = blobURL;
        } catch (err) {
            console.error("❌ Error exportando asset binario QR:", err);
        }
    };

    const buildCentralLogoDataUrl = () => {
        const tag = (rolSeleccionado || 'CIMCO').substring(0, 4).toUpperCase();
        const modeTag = entorno === 'produccion' ? 'PROD' : 'DEV';
        const svgString = `
            <svg xmlns="http://www.w3.org/2000/svg" width="180" height="75" viewBox="0 0 180 75">
                <rect width="100%" height="100%" fill="#121214" rx="12"/>
                <rect width="100%" height="100%" fill="none" stroke="#eab308" stroke-width="3" rx="12"/>
                <text x="50%" y="30" font-family="monospace" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">TAXIA CIMCO</text>
                <text x="50%" y="56" font-family="monospace" font-size="14" font-weight="900" fill="#eab308" text-anchor="middle" letter-spacing="1">[${tag} - ${modeTag}]</text>
            </svg>
        `;
        return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
    };

    return (
        <div className="space-y-6 w-full max-w-7xl mx-auto animate-in fade-in duration-300">
            <div className="flex flex-col lg:flex-row gap-6">
                
                {/* FORMULARIO DE CONTROL DE ROLES Y ENTORNO */}
                <div className="flex-1 backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                                <UserPlus size={20} className="text-yellow-500" />
                            </div>
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-200">Enrutamiento por Roles y Entornos</h2>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Estrategia Híbrida: Pruebas Locales y Producción Nube</p>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-4 bg-red-500/5 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 text-red-400 text-[11px] font-bold">
                                <AlertTriangle size={14} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleGenerarQrRol} className="flex flex-col gap-5">
                            
                            {/* SELECTOR DE ENTORNO (LOCAL VS PRODUCCIÓN) */}
                            <div>
                                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-black flex items-center gap-1.5 mb-2">
                                    <Globe size={10} /> Selecciona el Entorno Destino
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setEntorno('produccion'); setQrGenerado(false); }}
                                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${
                                            entorno === 'produccion'
                                                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.15)]'
                                                : 'bg-zinc-950/60 border-white/5 text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        <Globe size={12} /> Producción (Vercel)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { setEntorno('local'); setQrGenerado(false); }}
                                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${
                                            entorno === 'local'
                                                ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                                                : 'bg-zinc-950/60 border-white/5 text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        <Laptop size={12} /> Pruebas Locales (Túnel/LAN)
                                    </button>
                                </div>
                            </div>

                            {/* SELECTOR DE ROL */}
                            <div>
                                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-black flex items-center gap-1.5 mb-2">
                                    <Layers size={10} /> Selecciona el perfil destino del QR
                                </label>
                                <select 
                                    value={rolSeleccionado}
                                    onChange={(e) => { setRolSeleccionado(e.target.value); setQrGenerado(false); }}
                                    className="w-full bg-zinc-950/80 border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-zinc-300 focus:outline-none focus:border-yellow-500/30 transition-colors"
                                >
                                    {Object.entries(ROLES_CONTEXTO).map(([key, value]) => (
                                        <option key={key} value={key}>{value}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-zinc-950/40 border border-white/5 p-3 rounded-xl">
                                <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                                    Generando QR para el rol <span className="text-yellow-500 font-bold uppercase">{rolSeleccionado}</span> en el entorno de <span className={entorno === 'produccion' ? 'text-yellow-400 font-bold uppercase' : 'text-blue-400 font-bold uppercase'}>{entorno}</span>.
                                </p>
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-500 font-bold uppercase text-[10px] tracking-widest py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">
                                {loading ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                Compilar Matriz [{entorno.toUpperCase()}]
                            </button>
                        </form>
                    </div>
                </div>

                {/* VISOR VECTORIAL EN CALIENTE */}
                <div className="flex-1 backdrop-blur-md bg-[#121214]/60 rounded-3xl p-6 border border-white/5 shadow-lg flex flex-col items-center justify-center gap-6 min-h-[350px]">
                    {qrGenerado ? (
                        <div className="flex flex-col items-center gap-4 w-full animate-in fade-in zoom-in-95 duration-200">
                            <div ref={qrRef} className="p-4 bg-white rounded-2xl shadow-xl border border-white/10">
                                <QRCodeSVG 
                                    value={targetUrlString}
                                    size={220}
                                    level="H" 
                                    imageSettings={{
                                        src: buildCentralLogoDataUrl(),
                                        height: 44,
                                        width: 100,
                                        excavate: true,
                                    }}
                                />
                            </div>
                            <div className="text-center px-4 w-full">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${entorno === 'produccion' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                        ENTORNO: {entorno}
                                    </span>
                                </div>
                                <h4 className="text-xs font-black text-white uppercase tracking-widest">PERFIL DESTINO: {(rolSeleccionado || '').toUpperCase()}</h4>
                                <p className="text-[8px] text-zinc-500 font-mono break-all mt-1 bg-black/40 p-2 rounded-lg border border-white/5">{targetUrlString}</p>
                            </div>
                            <button onClick={handleDescargarQr} className="flex items-center gap-2 bg-zinc-950 border border-white/5 px-5 py-2 rounded-xl text-[10px] font-bold text-zinc-300 uppercase tracking-widest transition-all hover:text-white">
                                <Download size={12} className="text-yellow-500" /> Guardar Calcomanía QR (PNG)
                            </button>
                        </div>
                    ) : (
                        <div className="text-center p-6 flex flex-col items-center gap-2 text-zinc-500">
                            <Printer className="animate-pulse" size={32} />
                            <h3 className="text-xs font-bold uppercase tracking-widest">Matriz de Rol en Espera</h3>
                        </div>
                    )}
                </div>
            </div>

            {/* HISTORIAL Y AUDITORÍA DE MATRICES EMITIDAS */}
            <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-6 shadow-2xl">
                <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                        <Layers size={14} className="text-yellow-500" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-200">Historial de Códigos QR de Reclutamiento</h3>
                    </div>
                    <span className="text-[9px] bg-zinc-950 px-2 py-0.5 rounded border border-white/5 font-mono text-zinc-500 uppercase">Matrices: {historialQrs.length}</span>
                </div>

                {loadingHistorial ? (
                    <div className="text-center py-8 text-zinc-500 text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2">
                        <Loader size={12} className="animate-spin text-yellow-500" /> Leyendo base de datos local...
                    </div>
                ) : historialQrs.length === 0 ? (
                    <div className="text-center py-8 text-zinc-600 text-xs font-mono uppercase border border-dashed border-white/5 rounded-xl">No hay registros de códigos de captación guardados.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        {historialQrs.map((item) => {
                            const esProd = item.payloadUrl?.includes('vercel.app');
                            return (
                                <div key={item.id} className="bg-zinc-950/50 border border-white/5 p-3 rounded-xl flex items-center justify-between gap-3 hover:border-white/10 transition-colors">
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex items-center gap-1.5 font-mono text-[9px]">
                                            <span className="px-1.5 py-0.5 rounded font-black uppercase bg-yellow-500/10 text-yellow-400">
                                                {item.entidadId || 'N/A'}
                                            </span>
                                            <span className={`px-1 py-0.2 rounded font-black uppercase text-[8px] ${esProd ? 'bg-yellow-500/20 text-yellow-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                                {esProd ? 'PROD' : 'LOCAL'}
                                            </span>
                                        </div>
                                        <p className="text-[8px] text-zinc-500 font-mono truncate max-w-[200px]">{item.payloadUrl}</p>
                                        <div className="flex items-center gap-1 text-[8px] text-zinc-600">
                                            <Calendar size={10} /> {item.fechaCreacion?.toDate ? item.fechaCreacion.toDate().toLocaleDateString('es-CO') : 'Reciente'}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => handleCargarDesdeHistorial(item)} title="Ver en Visor" className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                                            <Eye size={12} />
                                        </button>
                                        <button onClick={() => handleEliminarRegistro(item.id)} title="Dar de baja" className="p-2 rounded-lg bg-red-500/5 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QrGenerator;