// Versión Arquitectura: V5.3 - Corrección Sintáctica de Ordenamiento en Consulta de Billeteras
/**
 * AdminDashboard.jsx - Súper Terminal CEO Centralizada
 * Ecosistema: TAXIA CIMCO
 * Ajuste: Limpieza de caracteres de escape en la función query de Firestore (línea 56).
 * Estética: Ciber-Neo-Brutalismo / CIMCO-UI (Modo oscuro, alto contraste, bordes gruesos).
 */

import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../../hooks/useAuth';
import { 
    Wallet, 
    ShieldAlert, 
    CheckCircle, 
    Search, 
    TrendingUp, 
    DollarSign, 
    Users, 
    Zap,
    Activity
} from 'lucide-react';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [billeteras, setBilleteras] = useState([]);
    const [filtro, setFiltro] = useState('');
    const [montoRecarga, setMontoRecarga] = useState('');
    const [conductorSeleccionado, setConductorSeleccionado] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

    // Estados analíticos para las tarjetas globales fusionadas
    const [metricas, setMetricas] = useState({
        balanceTotal: 0,
        conductoresActivos: 0,
        operacionesSeguras: 100
    });

    // 1. ESCUCHA ACTIVA DE BILLETERAS (PATH SAGRADO) Y CÁLCULO DE MÉTRICAS GLOBALES
    useEffect(() => {
        const walletsPath = "artifacts/taxiacimco-app/public/data/wallets";
        
        // 🛡️ Guardia de consulta corregida sin caracteres de escape corruptos
        const q = query(collection(db, walletsPath), orderBy("updatedAt", "desc"));
        
        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setBilleteras(data);

            // 📊 Fusión Atómica: Cálculo de estadísticas globales en tiempo real
            const totalCirculante = data.reduce((acc, curr) => acc + (Number(curr.saldo) || 0), 0);
            const conteoConductores = data.filter(w => w.rol === 'conductor').length;

            setMetricas({
                balanceTotal: totalCirculante,
                conductoresActivos: conteoConductores,
                operacionesSeguras: 100
            });

            setLoading(false);
        }, (error) => {
            console.error("❌ Error en escucha activa de la Súper Terminal:", error);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    // 2. FILTRADO INTELIGENTE DE CONDUCTORES / USUARIOS
    const billeterasFiltradas = billeteras.filter(b => {
        const busqueda = filtro.toLowerCase();
        return (
            (b.nombre && b.nombre.toLowerCase().includes(busqueda)) ||
            (b.email && b.email.toLowerCase().includes(busqueda)) ||
            (b.id && b.id.toLowerCase().includes(busqueda))
        );
    });

    // 3. PASARELA TRANSACCIONAL ATÓMICA CON GUARDA DE SEGURIDAD
    const ejecutarRecargaManual = async (e) => {
        e.preventDefault();
        
        // 🛡️ Guardas de Seguridad Obligatorias (Anti-Undefined)
        if (!user) {
            setStatusMsg({ type: 'error', text: 'Sesión inválida o expirada.' });
            return;
        }

        if (!conductorSeleccionado || !conductorSeleccionado.id) {
            setStatusMsg({ type: 'error', text: 'Error crítico: No se ha seleccionado un destino válido.' });
            return;
        }

        const valorNumeric = parseFloat(montoRecarga);
        if (isNaN(valorNumeric) || valorNumeric <= 0) {
            setStatusMsg({ type: 'error', text: 'Monto de recarga inválido.' });
            return;
        }

        // Alerta de Arquitectura preventiva para recargas excesivas de testing
        if (valorNumeric > 500000) {
            setStatusMsg({ type: 'error', text: '⚠️ ALERTA: Supera el límite de recarga manual permitido por turno.' });
            return;
        }

        setLoading(true);
        setStatusMsg({ type: '', text: '' });

        const walletRef = doc(db, `artifacts/taxiacimco-app/public/data/wallets/${conductorSeleccionado.id}`);
        const logRef = doc(collection(db, "artifacts/taxiacimco-app/public/data/logs_ceo"));

        try {
            await runTransaction(db, async (transaction) => {
                const walletDoc = await transaction.get(walletRef);
                
                if (!walletDoc.exists()) {
                    throw new Error("La billetera destino no existe en la red.");
                }

                const saldoActual = parseFloat(walletDoc.data().saldo) || 0;
                const nuevoSaldo = saldoActual + valorNumeric;

                // Mutación atómica del saldo del usuario
                transaction.update(walletRef, {
                    saldo: nuevoSaldo,
                    updatedAt: serverTimestamp()
                });

                // Inyección del registro log transaccional para auditoría de Tesorería
                transaction.set(logRef, {
                    tipoOperacion: 'RECARGA_MANUAL_CEO',
                    monto: valorNumeric,
                    destinoUid: conductorSeleccionado.id,
                    destinoEmail: conductorSeleccionado.email || 'N/A',
                    ejecutadoPor: user.email,
                    timestamp: serverTimestamp()
                });
            });

            setStatusMsg({ 
                type: 'success', 
                text: `¡Recarga de $${valorNumeric.toLocaleString()} exitosa para ${conductorSeleccionado.nombre || 'Conductor'}!` 
            });
            setMontoRecarga('');
            setConductorSeleccionado(null);
        } catch (error) {
            console.error("❌ Fallo en transacción de recarga:", error);
            setStatusMsg({ type: 'error', text: error.message || 'Error interno en la base de datos.' });
        } finally {
            setLoading(false);
        }
    };

    if (loading && billeteras.length === 0) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black text-white font-mono">
                <div className="animate-pulse text-yellow-400 text-xl tracking-widest uppercase">
                    Sincronizando Terminal CEO con Firebase...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-white font-mono selection:bg-yellow-400 selection:text-black">
            {/* ENCABEZADO CIMCO UI */}
            <header className="mb-8 border-4 border-black p-6 bg-zinc-900 shadow-[8px_8px_0px_0px_#000] relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-yellow-400 text-black font-black px-4 py-1 text-xs uppercase tracking-wider animate-pulse">
                    Acceso Máster CEO Active
                </div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase text-yellow-400 flex items-center gap-3">
                    <Zap className="text-yellow-400 fill-yellow-400 animate-bounce" size={32} />
                    SÚPER TERMINAL DE OPERACIONES CEO
                </h1>
                <p className="text-zinc-400 text-xs mt-2 uppercase tracking-widest">
                    Control de Liquidez, Billeteras Híbridas y Auditoría Central TAXIA CIMCO
                </p>
            </header>

            {/* SECCIÓN FUSIONADA: TARJETAS DE ESTADÍSTICAS GLOBALES BRUTALISTAS */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Balance General en Red */}
                <div className="bg-zinc-900 border-4 border-black p-6 shadow-[6px_6px_0px_0px_#facc15] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Balance Global Red</span>
                        <DollarSign className="text-yellow-400" size={24} />
                    </div>
                    <p className="text-3xl font-black text-white">
                        ${metricas.balanceTotal.toLocaleString('es-CO')}
                    </p>
                    <div className="mt-2 text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                        <TrendingUp size={12} /> Flujo de capital activo en Atlas & Firestore
                    </div>
                </div>

                {/* Conductores Operando */}
                <div className="bg-zinc-900 border-4 border-black p-6 shadow-[6px_6px_0px_0px_#22d3ee] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Billeteras Registradas</span>
                        <Users className="text-cyan-400" size={24} />
                    </div>
                    <p className="text-3xl font-black text-white">
                        {metricas.conductoresActivos} <span className="text-sm font-normal text-zinc-500">Cuentas</span>
                    </p>
                    <div className="mt-2 text-[10px] text-cyan-400 font-bold uppercase flex items-center gap-1">
                        <Activity size={12} className="animate-spin" /> Escucha de red en tiempo real en La Jagua
                    </div>
                </div>

                {/* Estado del Núcleo de Seguridad */}
                <div className="bg-zinc-900 border-4 border-black p-6 shadow-[6px_6px_0px_0px_#a855f7] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Integridad del Núcleo</span>
                        <ShieldAlert className="text-purple-400" size={24} />
                    </div>
                    <p className="text-3xl font-black text-purple-400">
                        {metricas.operacionesSeguras}%
                    </p>
                    <div className="mt-2 text-[10px] text-purple-400 font-bold uppercase">
                        🔐 Transacciones Atómicas Habilitadas
                    </div>
                </div>
            </section>

            {/* PANEL PRINCIPAL: DISTRIBUCIÓN EN 2 COLUMNAS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* COLUMNA IZQUIERDA: MOTOR DE BÚSQUEDA Y RADAR DE BILLETERAS */}
                <div className="lg:col-span-2 bg-zinc-900 border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h2 className="text-xl font-black uppercase text-yellow-400 mb-4 flex items-center gap-2">
                        <Wallet size={20} /> RADAR GLOBAL DE BILLETERAS
                    </h2>
                    
                    {/* Input Buscador Brutalista */}
                    <div className="relative mb-6">
                        <input 
                            type="text"
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                            placeholder="BUSCAR CONDUCTOR POR NOMBRE, EMAIL O UID..."
                            className="w-full bg-black border-4 border-black p-4 text-white placeholder-zinc-600 font-black focus:outline-none focus:border-yellow-400 focus:shadow-[4px_4px_0px_0px_#facc15] transition-all"
                        />
                        <Search className="absolute right-4 top-5 text-zinc-600" size={20} />
                    </div>

                    {/* Tabla / Lista de Billeteras */}
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {billeterasFiltradas.length === 0 ? (
                            <p className="text-zinc-500 text-center py-8 border-4 border-dashed border-zinc-800 uppercase font-bold">
                                No se encontraron registros con los criterios ingresados
                            </p>
                        ) : (
                            billeterasFiltradas.map((wallet) => (
                                <div 
                                    key={wallet.id}
                                    onClick={() => setConductorSeleccionado(wallet)}
                                    className={`p-4 border-4 transition-all cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                                        conductorSeleccionado?.id === wallet.id
                                            ? 'bg-yellow-400 border-black text-black shadow-none translate-x-1 translate-y-1'
                                            : 'bg-black border-zinc-800 text-white hover:border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-base uppercase">
                                                {wallet.nombre || 'Usuario sin nombre'}
                                            </span>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                                                wallet.rol === 'conductor' ? 'bg-cyan-500 text-black' : 'bg-purple-600 text-white'
                                            }`}>
                                                {wallet.rol || 'Pasajero'}
                                            </span>
                                        </div>
                                        <p className={`text-xs mt-1 font-mono ${
                                            conductorSeleccionado?.id === wallet.id ? 'text-zinc-800' : 'text-zinc-400'
                                        }`}>
                                            ✉️ {wallet.email || 'Sin correo asociado'}
                                        </p>
                                        <p className="text-[10px] opacity-60 font-mono mt-1 break-all">
                                            UID: {wallet.id}
                                        </p>
                                    </div>

                                    <div className="text-right w-full md:w-auto border-t md:border-t-0 border-zinc-800 md:pt-0 pt-2 flex md:flex-col justify-between items-center md:items-end">
                                        <span className={`text-[10px] uppercase font-bold block ${
                                            conductorSeleccionado?.id === wallet.id ? 'text-zinc-900' : 'text-zinc-400'
                                        }`}>
                                            Saldo Neto:
                                        </span>
                                        <span className="text-xl font-black tracking-tight">
                                            ${(Number(wallet.saldo) || 0).toLocaleString('es-CO')}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* COLUMNA DERECHA: PASARELA INYECTORA DE SALDO */}
                <div className="bg-zinc-900 border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                    <div>
                        <h2 className="text-xl font-black uppercase text-yellow-400 mb-6 flex items-center gap-2">
                            <DollarSign size={20} /> INYECTOR DE CAPITAL
                        </h2>

                        {conductorSeleccionado ? (
                            <form onSubmit={ejecutarRecargaManual} className="space-y-6">
                                <div className="bg-black border-4 border-yellow-400 p-4 text-xs space-y-2">
                                    <p className="text-yellow-400 font-black uppercase tracking-wider">🎯 DESTINO CONFIRMADO:</p>
                                    <p><strong className="text-zinc-400">Nombre:</strong> {conductorSeleccionado.nombre}</p>
                                    <p><strong className="text-zinc-400">Email:</strong> {conductorSeleccionado.email}</p>
                                    <p><strong className="text-zinc-400">Saldo actual:</strong> ${(Number(conductorSeleccionado.saldo) || 0).toLocaleString('es-CO')}</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-zinc-400 tracking-wider block">
                                        Valor en Efectivo Recibido (COP):
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-4 text-xl font-black text-yellow-400">$</span>
                                        <input 
                                            type="number"
                                            value={montoRecarga}
                                            onChange={(e) => setMontoRecarga(e.target.value)}
                                            placeholder="0.00"
                                            required
                                            className="w-full bg-black border-4 border-black p-4 pl-10 text-xl font-black text-yellow-400 focus:outline-none focus:border-yellow-400 transition-all"
                                        />
                                    </div>
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">
                                        * Este proceso alterará la base de datos de manera irreversible.
                                    </span>
                                </div>

                                {statusMsg.text && (
                                    <div className={`p-4 border-4 text-xs font-black uppercase flex items-center gap-2 ${
                                        statusMsg.type === 'success' 
                                            ? 'bg-black border-emerald-500 text-emerald-400 shadow-[4px_4px_0px_0px_#10b981]' 
                                            : 'bg-black border-red-500 text-red-500 shadow-[4px_4px_0px_0px_#ef4444]'
                                    }`}>
                                        {statusMsg.type === 'success' ? <CheckCircle size={16} /> : <ShieldAlert size={16} />}
                                        {statusMsg.text}
                                    </div>
                                )}

                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-yellow-400 text-black font-black uppercase text-xl py-5 border-4 border-black hover:bg-yellow-300 active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] disabled:opacity-50 transition-all"
                                >
                                    {loading ? 'PROCESANDO...' : 'EJECUTAR RECARGA'}
                                </button>
                                
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setConductorSeleccionado(null);
                                        setStatusMsg({ type: '', text: '' });
                                    }}
                                    className="w-full text-zinc-400 font-black uppercase text-xs hover:text-white transition-colors block text-center"
                                >
                                    ← CANCELAR SELECCIÓN
                                </button>
                            </form>
                        ) : (
                            <div className="text-center py-20 border-4 border-black border-dashed bg-black text-zinc-600">
                                <ShieldAlert size={48} className="mx-auto mb-4 animate-pulse text-zinc-700" />
                                <p className="font-black uppercase text-xs px-4 tracking-widest">
                                    Selecciona una cuenta del radar para abrir la pasarela de inyección de capital
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 border-t-2 border-zinc-800 pt-4 text-center text-[10px] text-zinc-500 uppercase font-mono">
                        Auditor: {user?.email || "Terminal Desconectada"}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminDashboard;