// Versión Arquitectura: V12.9 - Verificación de Línea Móvil con Mapeo Dual (disponible: true / existe: false) y Control de Flujo Progresivo
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\RegisterPasajero.jsx
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism (Yellow Accent).
 * Misión: Capturar identidad para PASAJEROS con verificación de celular en Step 1.
 * Soporta respuesta dual del backend (/auth/check-phone) validando tanto existe: false como disponible: true para avanzar a Step 2.
 * Fase 2 (Perfil): Formulación de credenciales, datos personales y carga de imagen de perfil binaria.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth'; 
import api from '@/config/api'; 
import { ROLES, DEFAULT_ACCESS_LEVELS } from '@/config/constants';
import { Phone, User, Mail, Lock, ShieldCheck, Camera, Check, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

const RegisterPasajero = () => {
    const navigate = useNavigate();
    const authContext = useAuth() || {};
    const loginLocal = authContext.loginLocal;

    // 🔄 CONTROL DE FLUJO PROGRESIVO
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // 📡 ESTADOS CORE (DATOS PERSONALES E IMAGEN DE PERFIL)
    const [telefono, setTelefono] = useState('');
    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [clave, setClave] = useState('');
    const [fotoPerfilFile, setFotoPerfilFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Ref para abortar peticiones pendientes en Step 1 si el usuario reintenta o desmonta
    const checkPhoneControllerRef = useRef(null);

    useEffect(() => {
        return () => {
            if (checkPhoneControllerRef.current) {
                checkPhoneControllerRef.current.abort();
            }
        };
    }, []);

    // Gestor de limpieza para previas de imágenes cargadas en memoria
    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleFileChange = (e) => {
        const file = e.target?.files ? e.target.files[0] : null;
        if (file) {
            if (!file.type || !file.type.startsWith('image/')) {
                setError('El archivo seleccionado debe ser una imagen válida.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setError('La imagen de perfil no debe superar los 5MB.');
                return;
            }
            setFotoPerfilFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setError('');
        }
    };

    const handleCheckPhone = async (e) => {
        e.preventDefault();
        
        // 🛡️ GUARDAS DE SEGURIDAD PREVENTIVAS
        if (loading) return;

        if (!telefono || !telefono?.trim()) {
            setError('El número de teléfono es obligatorio.');
            return;
        }

        // Validar celular colombiano (10 dígitos iniciando en 3)
        const phoneRegex = /^3\d{9}$/;
        if (!phoneRegex.test(telefono.trim())) {
            setError('Ingrese un número de celular colombiano válido de 10 dígitos (Ej. 3101234567).');
            return;
        }

        // Abortar cualquier petición en vuelo anterior
        if (checkPhoneControllerRef.current) {
            checkPhoneControllerRef.current.abort();
        }

        checkPhoneControllerRef.current = new AbortController();

        setLoading(true);
        setError('');
        
        try {
            const res = await api.post(
                `/auth/check-phone`, 
                { telefono: telefono.trim() },
                { signal: checkPhoneControllerRef.current.signal }
            );
            
            // 🔍 DUAL CHECK: Verificación por 'disponible' (true) o 'existe' (false)
            const payload = res?.data || {};
            const yaExiste = payload.existe === true || payload.disponible === false;
            const estaDisponible = payload.disponible === true || payload.existe === false || payload.success === true;

            if (yaExiste) {
                setError('Este terminal ya posee una identidad indexada. Redirigiendo...');
                setTimeout(() => navigate('/login', { replace: true }), 2500);
            } else if (estaDisponible) {
                // ✅ Si el número NO existe / está disponible, se habilita el formulario de registro (Fase 2)
                setStep(2);
            } else {
                setError('No se pudo verificar la disponibilidad del número. Intente de nuevo.');
            }
        } catch (err) {
            if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
                const apiMessage = err?.response?.data?.message;
                if (apiMessage) {
                    setError(`⚠️ SYSTEM_FAULT: ${apiMessage}`);
                } else {
                    setError('⚠️ SYSTEM_FAULT: El recurso solicitado [POST] /api/auth/check-phone no existe en el mapa de servicios del Nodo Central.');
                }
            }
        } finally {
            setLoading(false);
            checkPhoneControllerRef.current = null;
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (loading) return;

        // 🛡️ GUARDA DE SEGURIDAD: Validación estructural local
        if (!nombre?.trim() || !correo?.trim() || !clave?.trim()) {
            setError('Todos los campos básicos son estructuralmente requeridos.');
            return;
        }

        // Validar celular colombiano (10 dígitos iniciando en 3)
        const phoneRegex = /^3\d{9}$/;
        if (!phoneRegex.test(telefono.trim())) {
            setError('Ingrese un número de celular colombiano válido de 10 dígitos (Ej. 3101234567).');
            return;
        }

        // Validar formato estricto de correo electrónico para canal de recuperación
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(correo.trim())) {
            setError('Ingrese un correo electrónico válido para habilitar notificaciones y recuperación.');
            return;
        }

        setLoading(true);
        try {
            const targetRole = ROLES?.PASAJERO || 'pasajero';
            const accessLevel = DEFAULT_ACCESS_LEVELS?.[targetRole] ?? 0;

            // Fusión Atómica: Payload unificado y limpio hacia el Backend
            const formData = new FormData();
            formData.append('nombre', nombre.trim());
            formData.append('email', correo.toLowerCase().trim());
            formData.append('telefono', telefono.trim());
            formData.append('password', clave);
            
            // 🚀 Inyección Atómica de Gobernanza
            formData.append('role', targetRole);
            formData.append('access_level', String(accessLevel));

            // Verificación binaria segura
            if (fotoPerfilFile instanceof File) {
                formData.append('foto_perfil', fotoPerfilFile);
            }

            const res = await api.post(`/auth/register`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (res?.data?.success) {
                if (typeof loginLocal === 'function' && res.data.usuario && res.data.token) {
                    loginLocal(res.data.usuario, res.data.token);
                }
                navigate('/login', { replace: true });
            }
        } catch (err) {
            console.error("❌ [CIMCO-GATEWAY] Error de Form-Data:", err);
            const apiMessage = err?.response?.data?.message;
            setError(apiMessage ? `⚠️ SYSTEM_FAULT: ${apiMessage}` : 'Error de sincronización con el servidor de carga binaria.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-zinc-200 flex flex-col items-center justify-center p-4 font-sans selection:bg-amber-500/30 relative overflow-hidden transition-colors duration-500">
            
            {/* Efecto de luz ambiental posterior (Glassmorphism Light Bleed) */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
            
            {/* Contenedor Principal CIMCO-UI Premium Glassmorphism */}
            <div className="w-full max-w-md bg-[#121214]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10">
                
                {/* Botón de retorno explícito a Selección de Rol */}
                <Link 
                    to="/register" 
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-400 font-mono text-xs uppercase tracking-wider transition-colors mb-6 text-decoration-none group"
                > 
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
                    <span>Volver a Selección de Rol</span>
                </Link>

                {/* Cabecera & Badge de Seguridad */}
                <div className="text-center space-y-2 mb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono font-bold tracking-wider">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                        <span>CONEXIÓN CIFRADA SSL 256-BIT</span>
                    </div>
                    <h2 className="text-xl font-extrabold uppercase tracking-widest text-amber-500 font-mono flex items-center justify-center gap-2">
                        TAXIA CIMCO
                    </h2>
                    <p className="text-xs text-slate-400 font-mono">
                        {step === 1 ? 'Paso 1 de 2: Verificación de línea móvil' : 'Paso 2 de 2: Formulación de Identidad'}
                    </p>
                </div>

                {/* Stepper Progresivo */}
                <div className="flex items-center justify-between mb-6 px-2 font-mono">
                    <div className={`flex items-center gap-2 font-bold text-xs ${step === 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] ${step === 1 ? 'bg-amber-400/20 border-amber-400' : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'}`}>
                            {step > 1 ? <Check size={12} /> : '1'}
                        </span>
                        <span>TELÉFONO</span>
                    </div>
                    <div className={`h-[2px] flex-1 mx-3 transition-colors ${step > 1 ? 'bg-emerald-500/50' : 'bg-slate-800'}`} />
                    <div className={`flex items-center gap-2 font-bold text-xs ${step === 2 ? 'text-amber-400' : 'text-slate-500'}`}>
                        <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] ${step === 2 ? 'bg-amber-400/20 border-amber-400' : 'bg-slate-800 border-slate-700'}`}>
                            2
                        </span>
                        <span>PERFIL</span>
                    </div>
                </div>

                {/* Notificación Dinámica de Error */}
                {error && (
                    <div className="mb-6 p-3 bg-red-950/40 border border-red-500/20 text-red-400 text-xs font-mono rounded-2xl backdrop-blur-sm flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2">
                        <span className="font-bold flex-shrink-0 text-red-500 mt-0.5">⚠️ SYSTEM_FAULT:</span> 
                        <span className="leading-relaxed">{error.replace(/^⚠️ SYSTEM_FAULT:\s*/, '')}</span>
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleCheckPhone} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 mb-2">
                                Número Celular Colombiano
                            </label>
                            <div className="relative group">
                                <Phone className="absolute left-3.5 top-3.5 text-slate-500 group-focus-within:text-amber-400 transition-colors" size={16} />
                                <input 
                                    type="tel" 
                                    name="telefono"
                                    required
                                    pattern="[3][0-9]{9}"
                                    maxLength={10}
                                    placeholder="Ej. 3157654321" 
                                    title="Ingrese un número de celular colombiano válido de 10 dígitos (Ej. 3157654321)"
                                    value={telefono} 
                                    onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))} 
                                    className="w-full bg-[#18181b]/80 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-xs font-mono tracking-wider text-zinc-200 focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/80 focus:bg-[#1f1f22] transition-all placeholder:text-slate-600 disabled:opacity-50" 
                                    disabled={loading} 
                                />
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 font-mono">10 dígitos iniciando por 3 (Ej. 3157654321)</p>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-mono font-black text-xs uppercase tracking-widest py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 group"
                        >
                            <span>{loading ? 'VERIFICANDO DISPONIBILIDAD...' : 'VERIFICAR DISPONIBILIDAD'}</span>
                            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
                        
                        {/* Estado del Terminal Verificado */}
                        <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Check className="text-emerald-400" size={16} />
                                <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-mono font-bold">Línea Móvil Verificada</span>
                            </div>
                            <span className="text-xs text-emerald-200 font-bold tracking-widest bg-[#18181b] px-3 py-1 rounded-xl border border-white/5 font-mono">
                                {telefono}
                            </span>
                        </div>

                        {/* SECCIÓN 1: DATOS PERSONALES Y FOTO DE PERFIL BINARIA */}
                        <div className="bg-[#18181b]/50 border border-white/5 rounded-2xl p-4 space-y-4">
                            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold border-b border-white/5 pb-2 flex items-center gap-1.5">
                                <Sparkles size={12} className="text-amber-400" />
                                <span>Datos Personales & Fotografía</span>
                            </div>

                            {/* Módulo de Previsualización y Carga de Avatar Binario */}
                            <div className="flex flex-col items-center justify-center p-3 bg-[#18181b]/80 border border-white/10 border-dashed rounded-2xl transition-all hover:border-amber-400/40 group">
                                <div className="relative mb-2">
                                    {previewUrl ? (
                                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                            <img src={previewUrl} alt="Previsualización Avatar" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-[#27272a] border border-white/10 flex items-center justify-center text-slate-500 group-hover:text-amber-400 transition-colors">
                                            <User size={28} />
                                        </div>
                                    )}
                                </div>

                                <input 
                                    type="file" 
                                    id="avatar" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleFileChange} 
                                />
                                <label 
                                    htmlFor="avatar" 
                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl cursor-pointer text-[10px] font-mono font-bold uppercase tracking-wide transition-all ${fotoPerfilFile ? 'bg-amber-950/50 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]' : 'bg-[#27272a] text-slate-300 hover:bg-[#3f3f46] border border-transparent'}`}
                                >
                                    <Camera size={13} />
                                    {fotoPerfilFile ? '✓ CAMBIAR FOTO' : 'SELECCIONAR FOTO DE PERFIL'}
                                </label>
                                {fotoPerfilFile && (
                                    <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1 mt-1">
                                        <Check size={10} /> {fotoPerfilFile.name}
                                    </span>
                                )}
                            </div>

                            {/* Nombre Completo */}
                            <div>
                                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
                                    Nombre Completo *
                                </label>
                                <div className="relative group">
                                    <User className="absolute left-3.5 top-3.5 text-slate-500 group-focus-within:text-amber-400 transition-colors" size={15} />
                                    <input 
                                        type="text" 
                                        name="nombre"
                                        placeholder="Diana Mendoza Altahona" 
                                        value={nombre} 
                                        onChange={(e) => setNombre(e.target.value)} 
                                        className="w-full bg-[#18181b]/80 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-zinc-200 focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/80 focus:bg-[#1f1f22] outline-none transition-all placeholder:text-slate-600 disabled:opacity-50" 
                                        disabled={loading} 
                                        required 
                                    />
                                </div>
                            </div>

                            {/* Correo Electrónico Obligatorio */}
                            <div>
                                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
                                    Correo Electrónico *
                                </label>
                                <div className="relative group">
                                    <Mail className="absolute left-3.5 top-3.5 text-slate-500 group-focus-within:text-amber-400 transition-colors" size={15} />
                                    <input 
                                        type="email" 
                                        name="email"
                                        required
                                        placeholder="diana.mendoza@gmail.com" 
                                        value={correo} 
                                        onChange={(e) => setCorreo(e.target.value)} 
                                        className="w-full bg-[#18181b]/80 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-zinc-200 focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/80 focus:bg-[#1f1f22] outline-none transition-all placeholder:text-slate-600 disabled:opacity-50 font-mono" 
                                        disabled={loading} 
                                    />
                                </div>
                            </div>

                            {/* Contraseña */}
                            <div>
                                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
                                    Clave de Acceso *
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-3.5 text-slate-500 group-focus-within:text-amber-400 transition-colors" size={15} />
                                    <input 
                                        type="password" 
                                        name="password"
                                        placeholder="CONTRASEÑA SEGURA (Mín. 6)" 
                                        value={clave} 
                                        onChange={(e) => setClave(e.target.value)} 
                                        className="w-full bg-[#18181b]/80 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-zinc-200 focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/80 focus:bg-[#1f1f22] outline-none transition-all tracking-widest placeholder:text-slate-600 placeholder:tracking-normal disabled:opacity-50" 
                                        disabled={loading} 
                                        required 
                                    />
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs font-mono font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] mt-2"
                        >
                            {loading ? 'ALMACENANDO EN CENTRAL...' : 'FINALIZAR INSCRIPCIÓN'}
                        </button>
                        
                        <button 
                            type="button" 
                            onClick={() => setStep(1)} 
                            disabled={loading}
                            className="w-full text-center text-slate-400 hover:text-amber-400 text-[10px] uppercase tracking-widest pt-2 transition-colors font-mono font-bold disabled:opacity-50"
                        >
                            ← MODIFICAR TERMINAL TELEFÓNICO
                        </button>
                    </form>
                )}

                <div className="mt-8 pt-4 border-t border-white/5 text-center font-mono">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                        ¿Ya tienes una cuenta activada?{' '}
                        <Link className="text-amber-400 hover:text-amber-300 ml-1 font-bold transition-colors text-decoration-none" to="/login">
                            LOGUEAR ENTRADA
                        </Link>
                    </p>
                </div>

            </div>
        </div>
    );
};

export default RegisterPasajero;