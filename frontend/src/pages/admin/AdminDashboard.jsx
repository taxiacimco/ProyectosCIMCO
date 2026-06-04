// Versión Arquitectura: V8.0 - Fusión Atómica: Integración de Matriz de Nodos QR de Telemetría Multi-Rol
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\admin\AdminDashboard.jsx
 * Misión: Asegurar la continuidad operativa de la terminal CEO con inyección atómica paralela en wallets (Firebase),
 * pasarela (Express Backend API) y la visualización/descarga de QR de red local para los 6 roles del ecosistema.
 * Resolución: Sincronización del Handshake de Red mediante la instancia global de axios ('api') y variables de entorno homologadas.
 */

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api, { HOST_IP, API_CORE_URL } from '../../config/api'; // 🚀 FUSIÓN ATÓMICA: Handshake restaurado
import {
    collection,
    onSnapshot,
    doc,
    runTransaction,
    serverTimestamp,
    query,
    orderBy
} from 'firebase/firestore';
import { db } from '../../config/firebase'; 
import { useAuth } from '../../hooks/useAuth.jsx';
import { 
    Wallet, 
    ShieldAlert, 
    CheckCircle, 
    Search, 
    Activity,
    DollarSign, 
    Users, 
    Zap,
    Loader,
    QrCode,
    Download,
    Layers
} from 'lucide-react';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [billeteras, setBilleteras] = useState([]);
    const [filtro, setFiltro] = useState('');
    const [seleccionado, setSeleccionado] = useState(null);
    const [montoInyeccion, setMontoInyeccion] = useState('');
    const [transaccionExitosa, setTransaccionExitosa] = useState(false);
    const [errorTransaccion, setErrorTransaccion] = useState('');
    const [loadingRemoto, setLoadingRemoto] = useState(false); 

    // Lista Maestra de Roles Operativos TAXIA CIMCO
    const rolesDisponibles = [
        { id: 'mototaxi', etiqueta: 'Mototaxi', color: '#eab308' },
        { id: 'moto-parrillero', etiqueta: 'Moto Parrillero', color: '#38bdf8' },
        { id: 'motocarga', etiqueta: 'Motocarga', color: '#a855f7' },
        { id: 'pasajero', etiqueta: 'Pasajero', color: '#10b981' },
        { id: 'despachador', etiqueta: 'Despachador', color: '#f97316' },
        { id: 'intermunicipal', etiqueta: 'Conductor Intermunicipal', color: '#ef4444' }
    ];

    useEffect(() => {
        const q = query(collection(db, 'billeteras'), orderBy('nombre', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const docData = doc.data();
                // 🛡️ GUARDA DE SEGURIDAD ANTI-UNDEFINED
                return {
                    id: doc.id,
                    conductorId: docData?.conductorId || doc.id,
                    nombre: docData?.nombre || 'Operador No Identificado',
                    email: docData?.email || 'N/A',
                    saldo: typeof docData?.saldo === 'number' ? docData.saldo : 0,
                    estado: docData?.estado || 'inactive',
                    rol: docData?.rol || 'conductor'
                };
            });
            setBilleteras(data);

            if (seleccionado) {
                const actualizado = data.find(b => b.id === seleccionado.id);
                if (actualizado) setSeleccionado(actualizado);
            }
        }, (error) => {
            console.error("⚠️ [CIMCO-ERROR] Falla en el bus de Firestore:", error);
        });

        return () => unsubscribe();
    }, [seleccionado]);

    const downloadQR = (id, label) => {
        const svg = document.getElementById(id);
        if (!svg) return;
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

    const billeterasFiltradas = billeteras.filter(b => {
        const busqueda = filtro.toLowerCase();
        return (
            b.nombre.toLowerCase().includes(busqueda) ||
            b.email.toLowerCase().includes(busqueda) ||
            b.conductorId.toLowerCase().includes(busqueda)
        );
    });

    const procesarInyeccionSoberana = async (e) => {
        e.preventDefault();
        setTransaccionExitosa(false);
        setErrorTransaccion('');
        
        const valorMonto = parseInt(montoInyeccion, 10);

        if (!seleccionado || !seleccionado.id) {
            setErrorTransaccion('⚠️ ALERTA DE ARQUITECTURA: Nodo de destino ausente o corrupto.');
            return;
        }
        if (isNaN(valorMonto) || valorMonto <= 0) {
            setErrorTransaccion('⚠️ REGLA DE NEGOCIO VIOLADA: El monto de inyección debe ser estrictamente superior a $0 COP.');
            return;
        }
        if (valorMonto > 500000) {
            setErrorTransaccion('⚠️ LÍMITE SOBERANO: No se permiten inyecciones unilaterales mayores a $500.000 COP por operación.');
            return;
        }

        setLoadingRemoto(true);

        try {
            await api.post(`/conductores/admin/recargar-saldo`, {
                conductorId: seleccionado.conductorId,
                monto: valorMonto,
                operador: user?.email || 'SYSTEM_ADMIN_CEO'
            });

            console.log('✅ [CIMCO-REST] Inyección autorizada y registrada en MongoDB / Historial.');

            const sfDocRef = doc(db, 'billeteras', seleccionado.id);
            await runTransaction(db, async (transaction) => {
                const sfDoc = await transaction.get(sfDocRef);
                if (!sfDoc.exists()) {
                    throw new Error("El documento destino no tiene persistencia física en Firebase.");
                }

                const saldoActual = sfDoc.data().saldo || 0;
                const nuevoSaldo = saldoActual + valorMonto;

                transaction.update(sfDocRef, { saldo: nuevoSaldo });

                const historialRef = doc(collection(db, 'historial_billeteras'));
                transaction.set(historialRef, {
                    billeteraId: seleccionado.id,
                    conductorId: seleccionado.conductorId,
                    monto: valorMonto,
                    tipo: 'inyeccion_admin',
                    saldoAnterior: saldoActual,
                    nuevoSaldo: nuevoSaldo,
                    auditor: user?.email || 'SYSTEM_CEO',
                    timestamp: serverTimestamp()
                });
            });

            console.log('✅ [CIMCO-FIRESTORE] Sincronización reactiva del ledger completada.');

            setTransaccionExitosa(true);
            setMontoInyeccion('');
            
        } catch (error) {
            console.error('❌ Falla Crítica en Transmisión de Fondos:', error);
            setErrorTransaccion(`FALLA OPERATIVA: ${error.response?.data?.message || error.message || 'Error de red con el backend central'}`);
        } finally { 
            setLoadingRemoto(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 p-6 font-sans antialiased selection:bg-yellow-500/30 selection:text-yellow-200">
            
            <header className="mb-8 flex items-center justify-between border-b border-zinc-800/40 pb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-yellow-500/10 rounded-xl border border-yellow-500/20 text-yellow-500">
                        <Activity size={22} className="animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-sm font-mono font-bold tracking-widest text-zinc-200 uppercase">CIMCO-CORE ENGINE</h1>
                        <p className="text-[10px] font-mono text-zinc-500 tracking-wider mt-0.5">TERMINAL CEO • HOST LOCAL: {HOST_IP}</p>
                    </div>
                </div>

                <div className="backdrop-blur-md bg-[#121214]/40 px-4 py-2 rounded-xl border border-zinc-800/60 flex items-center gap-3 text-xs font-mono">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-zinc-400">BUS DE CONTROL OPERATIVO ACTIVO</span>
                </div>
            </header>

            {/* SECCIÓN SUPERIOR: Matriz de Despliegue de Códigos QR */}
            <section className="mb-8 backdrop-blur-md bg-[#121214]/60 border border-zinc-800/50 rounded-2xl p-5 shadow-2xl">
                <div className="flex items-center gap-2 mb-5 border-b border-zinc-800/30 pb-3">
                    <QrCode size={16} className="text-cyan-400" />
                    <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-300 uppercase">Matriz de Despliegue de Enlaces Híbridos QR</h2>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {rolesDisponibles.map((rol) => {
                        // Construcción de la URL de redirección directa con el rol inyectado
                        const urlAcceso = `http://192.168.100.34:5173/login?role=${rol.id}`;
                        const idElemento = `qr-${rol.id}`;

                        return (
                            <div key={rol.id} className="bg-[#161619]/80 border border-zinc-800/80 rounded-xl p-4 flex flex-col items-center justify-between transition-all duration-200 hover:border-zinc-700/60">
                                <span className="text-[9px] font-mono uppercase font-bold tracking-wider mb-2 text-center truncate w-full" style={{ color: rol.color }}>
                                    {rol.etiqueta}
                                </span>
                                
                                <div className="bg-white p-2 rounded-lg shadow-md flex items-center justify-center">
                                    <QRCodeSVG 
                                        id={idElemento} 
                                        value={urlAcceso} 
                                        size={100} 
                                        level="M" 
                                        includeMargin={false} 
                                    />
                                </div>
                                
                                <button 
                                    onClick={() => downloadQR(idElemento, rol.id)}
                                    className="mt-3 w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-mono text-[8px] uppercase tracking-wider py-1.5 rounded-md transition-colors border border-zinc-800 flex items-center justify-center gap-1"
                                >
                                    <Download size={10} /> Descargar
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                <div className="lg:col-span-2 backdrop-blur-md bg-[#121214]/80 border border-zinc-800/50 rounded-2xl p-5 shadow-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            <Users size={16} className="text-zinc-400" />
                            <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-300 uppercase">Nodos de Telemetría ({billeterasFiltradas.length})</h2>
                        </div>
                        
                        <div className="relative w-full sm:w-64">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input 
                                type="text"
                                value={filtro}
                                onChange={(e) => setFiltro(e.target.value)}
                                placeholder="BUSCAR POR NOMBRE, ID, CORREO..."
                                className="w-full bg-zinc-950/60 border border-zinc-800/60 rounded-xl pl-9 pr-4 py-2 text-[10px] font-mono tracking-wider uppercase text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-yellow-500/40 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-2">
                        {billeterasFiltradas.length === 0 ? (
                            <div className="col-span-full text-center py-12 border border-dashed border-zinc-800/40 rounded-xl text-zinc-500 font-mono text-[10px] uppercase tracking-widest">
                                No se detectan nodos activos con el criterio ingresado.
                            </div>
                        ) : (
                            billeterasFiltradas.map((b) => {
                                const esEnfocado = seleccionado?.id === b.id;
                                return (
                                    <div 
                                        key={b.id}
                                        onClick={() => {
                                            setSeleccionado(b);
                                            setTransaccionExitosa(false);
                                            setErrorTransaccion('');
                                        }}
                                        className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-32 ${
                                            esEnfocado 
                                            ? 'bg-yellow-500/[0.04] border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.05)]' 
                                            : 'bg-zinc-900/20 border-zinc-800/40 hover:bg-zinc-900/40 hover:border-zinc-800'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="truncate">
                                                <h3 className="text-[11px] font-bold tracking-wide text-zinc-200 uppercase truncate">{b.nombre}</h3>
                                                <p className="text-[9px] font-mono text-zinc-500 truncate mt-0.5">{b.email}</p>
                                            </div>
                                            <span className={`text-[8px] font-mono px-2 py-0.5 rounded uppercase tracking-wider font-bold border ${
                                                b.estado === 'active' 
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                : 'bg-zinc-800/40 text-zinc-500 border-zinc-700/30'
                                            }`}>
                                                {b.estado}
                                            </span>
                                        </div>

                                        <div className="flex items-end justify-between border-t border-zinc-800/30 pt-2 mt-2">
                                            <div>
                                                <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">ID CONSTRUCTOR</p>
                                                <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase mt-0.5">{b.conductorId.substring(0, 12)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">BALANCE</p>
                                                <p className="text-xs font-mono font-bold text-yellow-500 tracking-wide mt-0.5">
                                                    ${b.saldo.toLocaleString('es-CO')} COP
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="backdrop-blur-md bg-[#121214]/80 border border-zinc-800/50 rounded-2xl p-5 shadow-2xl lg:h-[650px] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <Wallet size={16} className="text-yellow-500" />
                            <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-300 uppercase">Inyección Atómica Remota</h2>
                        </div>

                        {seleccionado ? (
                            <form onSubmit={procesarInyeccionSoberana} className="space-y-5">
                                
                                <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/60 rounded-xl font-mono text-[10px] tracking-wider space-y-2">
                                    <div className="flex justify-between text-zinc-500"><span className="uppercase">BENEFICIARIO:</span> <span className="text-zinc-300 font-bold uppercase truncate max-w-[140px]">{seleccionado.nombre}</span></div>
                                    <div className="flex justify-between text-zinc-500"><span className="uppercase">DRV TARGET ID:</span> <span className="text-zinc-400 font-bold">{seleccionado.conductorId}</span></div>
                                    <div className="flex justify-between text-zinc-500"><span className="uppercase">SALDO ACTUAL:</span> <span className="text-yellow-500 font-bold">${seleccionado.saldo.toLocaleString('es-CO')} COP</span></div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[9px] font-mono text-zinc-400 tracking-widest uppercase">MONTO A INYECTAR (COP)</label>
                                    <div className="relative">
                                        <DollarSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                        <input 
                                            type="number"
                                            required
                                            value={montoInyeccion}
                                            onChange={(e) => setMontoInyeccion(e.target.value)}
                                            placeholder="EJ: 20000"
                                            disabled={loadingRemoto}
                                            className="w-full bg-zinc-950/50 border border-zinc-800/60 rounded-xl pl-9 pr-4 py-3 font-mono text-xs text-zinc-200 focus:outline-none focus:border-yellow-500/40 placeholder-zinc-700 transition-colors"
                                        />
                                    </div>
                                </div>

                                {transaccionExitosa && (
                                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-emerald-400 flex items-start gap-2.5 font-mono text-[9px] tracking-wide leading-relaxed uppercase animate-fadeIn">
                                        <CheckCircle size={14} className="shrink-0 text-emerald-500 mt-0.5" />
                                        <div>
                                            <p className="font-bold">Inyección Confirmada exitosamente.</p>
                                            <p className="text-zinc-500 text-[8px] mt-0.5">Los balances han sido actualizados en tiempo real en MongoDB Atlas y Firebase Engine.</p>
                                        </div>
                                    </div>
                                )}

                                {errorTransaccion && (
                                    <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-red-400 flex items-start gap-2.5 font-mono text-[9px] tracking-wide leading-relaxed uppercase">
                                        <ShieldAlert size={14} className="shrink-0 text-red-500 mt-0.5" />
                                        <span className="font-bold">{errorTransaccion}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loadingRemoto}
                                    className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-zinc-950 font-mono font-bold uppercase text-[10px] tracking-widest py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-yellow-600/10 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {loadingRemoto ? (
                                        <>
                                            <Loader size={14} className="animate-spin text-zinc-950" />
                                            AUTORIZANDO INYECTOR CORE...
                                        </>
                                    ) : (
                                        <>
                                            <Zap size={14} className="fill-current" />
                                            EJECUTAR INYECTOR ATÓMICO
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSeleccionado(null);
                                        setMontoInyeccion('');
                                        setTransaccionExitosa(false);
                                        setErrorTransaccion('');
                                    }}
                                    disabled={loadingRemoto}
                                    className="w-full text-zinc-500 font-mono font-bold uppercase text-[10px] tracking-widest hover:text-zinc-300 transition-colors block text-center mt-2.5 disabled:opacity-30"
                                >
                                    ← CANCELAR OPERACIÓN
                                </button>
                            </form>
                        ) : (
                            <div className="text-center py-24 border border-dashed border-zinc-800/40 bg-zinc-950/10 rounded-xl text-zinc-500 flex flex-col items-center justify-center p-5">
                                <ShieldAlert size={32} className="mb-3 text-zinc-700 animate-pulse" />
                                <p className="font-mono uppercase text-[10px] tracking-widest leading-relaxed max-w-xs mx-auto">
                                    Selecciona una cuenta del radar de telemetría para habilitar los controles de inyección atómica.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 border-t border-zinc-800/40 pt-4 text-center text-[9px] text-zinc-600 uppercase font-mono tracking-widest">
                        Auditor Firmado: <span className="text-zinc-400 font-bold">{user?.email || "Terminal Desconectada"}</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminDashboard;