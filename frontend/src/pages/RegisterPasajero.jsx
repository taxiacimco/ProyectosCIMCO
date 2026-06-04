// Versión Arquitectura: V16.6 - Sincronización Estricta de Importaciones, Ruteo API Centralizado y Blindaje Anti-Undefined
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\RegisterPasajero.jsx
 * Estilo: CIMCO-UI V1.1 Light Mode Premium Glassmorphism (Unificado con Login).
 * Misión: Capturar el teléfono y bloquearlo visualmente como identidad inmutable, desplegando
 *         dinámicamente los campos según el rol (Pasajero, Operador, Despachador).
 * Sincronización: Importación limpia de useAuth y migración de axios manual a api.js global.
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../config/api';
import { Phone, User, Mail, Lock, ShieldCheck } from 'lucide-react';

const RegisterPasajero = () => {
    const navigate = useNavigate();
    const auth = useAuth();
    
    // 🛡️ GUARDA DE SEGURIDAD (Anti-Undefined): Previene desbordamiento si useAuth es ejecutado fuera de contexto
    const setUser = auth ? auth.setUser : null;

    // 🔄 CONTROL DE FLUJO PROGRESIVO
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // 📡 ESTADOS CORE
    const [telefono, setTelefono] = useState('');
    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [clave, setClave] = useState('');
    const [tipoRegistro, setTipoRegistro] = useState('pasajero'); // 'pasajero', 'conductor', 'despachador'

    // 🚖 ESTADOS ESPECÍFICOS OPERATIVOS
    const [tipoVehiculo, setTipoVehiculo] = useState('mototaxi');
    const [placa, setPlaca] = useState('');
    const [empresa, setEmpresa] = useState('');
    const [numeroInterno, setNumeroInterno] = useState('');

    // 📂 DOCUMENTOS
    const [cedulaFile, setCedulaFile] = useState(null);
    const [licenciaFile, setLicenciaFile] = useState(null);
    const [vehiculoFile, setVehiculoFile] = useState(null);

    const handleCheckPhone = async (e) => {
        e.preventDefault();
        if (!telefono.trim() || telefono.length < 7) {
            setError('El número de teléfono (mínimo 7 dígitos) es obligatorio.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            // Sincronización con el gateway de api.js centralizado
            const res = await api.post(`/api/auth/check-phone`, { telefono: telefono.trim() });
            if (res.data.success && res.data.existe) {
                setError('Este terminal ya posee una identidad indexada. Redirigiendo...');
                setTimeout(() => navigate('/login'), 2500);
            } else {
                setStep(2);
            }
        } catch (err) {
            setError('Error de enlace en el gateway. Verifique el nodo central.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (!nombre.trim() || !correo.trim() || !clave.trim()) {
            setError('Todos los campos básicos son estructuralmente requeridos.');
            return;
        }
        if (tipoRegistro === 'conductor' && !placa.trim()) {
            setError('La placa es obligatoria para registrar unidades operativas.');
            return;
        }
        if (tipoRegistro === 'despachador' && !empresa.trim()) {
            setError('El nombre de la cooperativa/base es obligatorio para despachadores.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                nombre: nombre.trim(),
                email: correo.toLowerCase().trim(),
                telefono: telefono.trim(),
                password: clave,
                rol: tipoRegistro,
                ...(tipoRegistro === 'conductor' && { 
                    placa: placa.toUpperCase().trim(), 
                    sub_rol: tipoVehiculo,
                    numero_interno: numeroInterno.trim(),
                    empresa: empresa.trim() 
                }),
                ...(tipoRegistro === 'despachador' && {
                    empresa: empresa.trim(),
                    numero_interno: numeroInterno.trim(),
                })
            };

            // Ejecución mediante instancia axial limpia
            const res = await api.post(`/api/auth/register`, payload);
            
            if (res.data.success) {
                if (res.data.token) localStorage.setItem('token', res.data.token);
                if (setUser) setUser(res.data.usuario || { nombre, email: correo, telefono, rol: tipoRegistro });
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error de sincronización con Express.');
        } finally {
            setLoading(false);
        }
    };

    return (
        // Contenedor General en Light Mode
        <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4 font-sans selection:bg-teal-500/30 relative transition-colors duration-500">
            {/* Difuminado de fondo turquesa adaptado a entornos claros */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/[0.03] rounded-full blur-[100px] pointer-events-none" />
            
            {/* Tarjeta Cristalina Unificada */}
            <div className="w-full max-w-md bg-white/90 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 shadow-xl shadow-slate-200/50 relative z-10">
                <div className="text-center mb-6">
                    <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-teal-600">TAXIA CIMCO</h2>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1 font-mono font-semibold">Matriz Satelital de Registro</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-mono rounded-lg">
                        ⚠️ {error}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleCheckPhone} className="space-y-4">
                        <div className="text-center mb-1">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold">Fase 01: Vinculación Telefónica</span>
                        </div>
                        <div className="relative">
                            <Phone className="absolute left-3.5 top-3.5 text-slate-400" size={14} />
                            <input type="tel" placeholder="INGRESAR NÚMERO CELULAR" value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 pl-10 pr-4 text-xs font-mono uppercase tracking-wide text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:bg-white transition-all" disabled={loading} maxLength={10} required />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white text-xs font-mono font-bold uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-md hover:shadow-teal-200">
                            {loading ? 'CONECTANDO CENTRAL...' : 'VERIFICAR DISPONIBILIDAD'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        {/* 📱 BADGE TURQUESA: IDENTIDAD BLOQUEADA */}
                        <div className="bg-teal-500/[0.06] border border-teal-500/20 rounded-xl p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="text-teal-600" size={15} />
                                <span className="text-[9px] text-teal-600 uppercase tracking-widest font-mono font-bold">Identidad Celular</span>
                            </div>
                            <span className="text-xs text-slate-800 font-bold tracking-widest bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 font-mono">
                                {telefono}
                            </span>
                        </div>

                        {/* SELECTOR DE PERFIL MULTI-ROL (Light Mode UI) */}
                        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200/60">
                            <button type="button" className={`py-2 text-[9px] uppercase tracking-widest rounded-lg transition-all font-mono ${tipoRegistro === 'pasajero' ? 'bg-white text-teal-600 font-bold border border-slate-200/80 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`} onClick={() => setTipoRegistro('pasajero')}>📱 Pasajero</button>
                            <button type="button" className={`py-2 text-[9px] uppercase tracking-widest rounded-lg transition-all font-mono ${tipoRegistro === 'conductor' ? 'bg-white text-amber-600 font-bold border border-slate-200/80 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`} onClick={() => setTipoRegistro('conductor')}>🚖 Operador</button>
                            <button type="button" className={`py-2 text-[9px] uppercase tracking-widest rounded-lg transition-all font-mono ${tipoRegistro === 'despachador' ? 'bg-white text-indigo-600 font-bold border border-slate-200/80 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`} onClick={() => setTipoRegistro('despachador')}>🎧 Despacho</button>
                        </div>

                        <div className="relative">
                            <User className="absolute left-3.5 top-3.5 text-slate-400" size={14} />
                            <input type="text" placeholder="NOMBRE COMPLETO" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 p-3 pl-10 pr-4 text-xs text-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:bg-white outline-none transition-all" disabled={loading} required />
                        </div>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-3.5 text-slate-400" size={14} />
                            <input type="email" placeholder="CORREO ELECTRÓNICO" value={correo} onChange={(e) => setCorreo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 p-3 pl-10 pr-4 text-xs text-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:bg-white outline-none transition-all" disabled={loading} required />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-3.5 text-slate-400" size={14} />
                            <input type="password" placeholder="CONTRASEÑA SEGURA (Mín. 6)" value={clave} onChange={(e) => setClave(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 p-3 pl-10 pr-4 text-xs text-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:bg-white outline-none transition-all tracking-widest" disabled={loading} required />
                        </div>

                        {/* CAMPOS OPERATIVOS (Conductores / Despachadores) */}
                        {(tipoRegistro === 'conductor' || tipoRegistro === 'despachador') && (
                            <div className="pt-3 border-t border-slate-200 space-y-3">
                                {tipoRegistro === 'conductor' && (
                                    <>
                                        <select value={tipoVehiculo} onChange={(e) => setTipoVehiculo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 text-[10px] uppercase text-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:bg-white outline-none transition-all">
                                            <option value="mototaxi">Mototaxi Individual</option>
                                            <option value="motoparrillero">Moto Parrillero Autorizado</option>
                                            <option value="motocarga">Motocarga Logística</option>
                                            <option value="intermunicipal">Ruta Intermunicipal</option>
                                        </select>
                                        <input type="text" placeholder="PLACA (EJ. ABC123)" value={placa} onChange={(e) => setPlaca(e.target.value)} maxLength={6} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 text-xs uppercase text-center font-mono text-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:bg-white outline-none transition-all" required />
                                    </>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="text" placeholder="N° INTERNO" value={numeroInterno} onChange={(e) => setNumeroInterno(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 text-xs text-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:bg-white outline-none transition-all" />
                                    <input type="text" placeholder="COOPERATIVA/BASE" value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 text-xs text-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:bg-white outline-none transition-all" required={tipoRegistro === 'despachador' || tipoVehiculo === 'intermunicipal'} />
                                </div>
                                {tipoRegistro === 'conductor' && (
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                                        <div className="text-[9px] text-slate-500 uppercase tracking-widest text-center font-mono font-bold border-b border-slate-200 pb-1 mb-2">Bóveda de Documentos</div>
                                        <div className="flex justify-between items-center bg-white border border-slate-200 p-2 rounded-lg text-[9px] font-mono"><span className="text-slate-500">📂 CÉDULA</span><input type="file" id="ced" className="hidden" onChange={(e)=>setCedulaFile(e.target.files[0])}/><label htmlFor="ced" className={`px-2 py-1 rounded cursor-pointer font-bold transition-colors ${cedulaFile?'bg-emerald-50 text-emerald-600 border border-emerald-200':'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>{cedulaFile?'OK':'SUBIR'}</label></div>
                                        <div className="flex justify-between items-center bg-white border border-slate-200 p-2 rounded-lg text-[9px] font-mono"><span className="text-slate-500">📂 LICENCIA</span><input type="file" id="lic" className="hidden" onChange={(e)=>setLicenciaFile(e.target.files[0])}/><label htmlFor="lic" className={`px-2 py-1 rounded cursor-pointer font-bold transition-colors ${licenciaFile?'bg-emerald-50 text-emerald-600 border border-emerald-200':'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>{licenciaFile?'OK':'SUBIR'}</label></div>
                                        <div className="flex justify-between items-center bg-white border border-slate-200 p-2 rounded-lg text-[9px] font-mono"><span className="text-slate-500">📂 SOAT/TECNICO</span><input type="file" id="soat" className="hidden" onChange={(e)=>setVehiculoFile(e.target.files[0])}/><label htmlFor="soat" className={`px-2 py-1 rounded cursor-pointer font-bold transition-colors ${vehiculoFile?'bg-emerald-50 text-emerald-600 border border-emerald-200':'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>{vehiculoFile?'OK':'SUBIR'}</label></div>
                                    </div>
                                )}
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white text-xs font-mono font-bold uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-md hover:shadow-teal-200 mt-2">
                            {loading ? 'ALMACENANDO...' : 'FINALIZAR INSCRIPCIÓN'}
                        </button>
                        <button type="button" onClick={() => setStep(1)} className="w-full text-center text-slate-500 hover:text-slate-800 text-[9px] uppercase tracking-widest pt-2 transition-colors font-mono font-bold">
                            ← MODIFICAR TERMINAL TELEFÓNICO
                        </button>
                    </form>
                )}

                <div className="mt-6 pt-4 border-t border-slate-200/60 text-center font-mono">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">¿Unidad ya indexada? <Link to="/login" className="text-teal-600 hover:text-teal-700 ml-1 font-bold transition-colors">LOGUEAR ENTRADA</Link></p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPasajero;