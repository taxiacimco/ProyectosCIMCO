// Versión Arquitectura: V13.2 - Transferencia de Línea Móvil a Login al Detectar Duplicado
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\RegisterPasajero.jsx
 * Misión: Flujo de Registro de Pasajeros en 2 pasos con alta legibilidad visual (Light Glassmorphism),
 * psicología de color enfocada en Seguridad SSL (Esmeralda), Confianza (Índigo) y Agilidad (Ámbar),
 * verificación previa de línea móvil contra el backend (/auth/check-phone), carga de foto de perfil,
 * mejorada la UX de redirección a Login con transferencia del número de teléfono digitado en el state de navegación,
 * e integración de login automático posregistro.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth'; 
import api from '@/config/api'; 
import { ROLES, DEFAULT_ACCESS_LEVELS } from '@/config/constants';
import { 
  ShieldCheck, 
  Smartphone, 
  User, 
  Mail, 
  Lock, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  Check,
  Camera,
  LogIn
} from 'lucide-react';

const RegisterPasajero = () => {
    const navigate = useNavigate();
    const authContext = useAuth() || {};
    const loginLocal = authContext.loginLocal;

    // 🔄 CONTROL DE FLUJO PROGRESIVO (Paso 1: Teléfono | Paso 2: Perfil)
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [telefonoExiste, setTelefonoExiste] = useState(false);

    // 📝 PASO 1: LÍNEA MÓVIL
    const [celular, setCelular] = useState('');

    // 📝 PASO 2: PERFIL & CREDENCIALES
    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [clave, setClave] = useState('');
    const [fotoPerfil, setFotoPerfil] = useState(null);
    const [previewFoto, setPreviewFoto] = useState(null);

    const fileInputRef = useRef(null);

    // Liberación de memoria de Blob URL al desmontar o cambiar imagen
    useEffect(() => {
        return () => {
            if (previewFoto && previewFoto.startsWith('blob:')) {
                URL.revokeObjectURL(previewFoto);
            }
        };
    }, [previewFoto]);

    // 📸 MANEJO DE FOTO DE PERFIL
    const handleFotoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError("La foto de perfil excede el límite máximo permitido de 5MB.");
            return;
        }

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setError("Formato de imagen no válido. Formatos soportados: JPG, PNG o WEBP.");
            return;
        }

        setError('');
        setFotoPerfil(file);
        
        if (previewFoto && previewFoto.startsWith('blob:')) {
            URL.revokeObjectURL(previewFoto);
        }
        setPreviewFoto(URL.createObjectURL(file));
    };

    // 🛡️ PASO 1: VERIFICACIÓN TELEFÓNICA CON EL BACKEND (/auth/check-phone)
    const handleVerificarTelefono = async (e) => {
        e.preventDefault();
        setError('');
        setTelefonoExiste(false);

        const phoneRegex = /^3\d{9}$/;
        const telefonoLimpio = celular?.trim();

        if (!telefonoLimpio || !phoneRegex.test(telefonoLimpio)) {
            setError("Ingresa un número celular colombiano válido de 10 dígitos (Ej. 3157654321).");
            return;
        }

        setLoading(true);

        try {
            const res = await api.post('/auth/check-phone', { telefono: telefonoLimpio });
            const data = res?.data || {};

            // Validación flexible de disponibilidad (existe === false OR disponible === true)
            const noExiste = data.existe === false || data.disponible === true;

            if (noExiste) {
                setStep(2);
            } else {
                setTelefonoExiste(true);
                setError(data.message || "Esta línea celular ya está registrada en TAXIA CIMCO. Inicia sesión para continuar.");
            }
        } catch (err) {
            console.error("🚨 [CIMCO-CHECK-PHONE] Error al consultar disponibilidad:", err);
            
            if (err?.response?.status === 404) {
                setError("⚠️ Error de enrutamiento en el servidor (/auth/check-phone). Contacte a soporte técnico.");
            } else if (err?.response?.status === 400 || err?.response?.data?.existe === true) {
                setTelefonoExiste(true);
                setError(err?.response?.data?.message || "Esta línea celular ya está registrada en TAXIA CIMCO. Inicia sesión para continuar.");
            } else {
                setError(err?.response?.data?.message || "No se pudo verificar la línea telefónica. Intente nuevamente.");
            }
        } finally {
            setLoading(false);
        }
    };

    // 🚀 PASO 2: REGISTRO FINAL CON MULTIPART/FORM-DATA
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const nombreLimpio = nombre?.trim();
        const correoLimpio = correo?.trim().toLowerCase();
        const telefonoLimpio = celular?.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!nombreLimpio || !correoLimpio || !clave?.trim()) {
            setError("Por favor completa todos los campos requeridos para habilitar tu cuenta.");
            return;
        }

        if (!emailRegex.test(correoLimpio)) {
            setError("Ingresa un correo electrónico válido para recibir tus confirmaciones de viaje.");
            return;
        }

        if (clave.length < 6) {
            setError("La contraseña de acceso debe tener al menos 6 caracteres.");
            return;
        }

        setLoading(true);

        try {
            const targetRole = ROLES?.PASAJERO || 'pasajero';
            const accessLevel = DEFAULT_ACCESS_LEVELS?.[targetRole] ?? 1;

            const formData = new FormData();
            formData.append('nombre', nombreLimpio);
            formData.append('telefono', telefonoLimpio);
            formData.append('telefonoMovil', telefonoLimpio);
            formData.append('email', correoLimpio);
            formData.append('password', clave);
            formData.append('role', targetRole);
            formData.append('rol', targetRole);
            formData.append('access_level', accessLevel);

            if (fotoPerfil) {
                formData.append('foto_perfil', fotoPerfil);
            }

            const res = await api.post('/auth/register', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const resData = res?.data || {};

            if (resData?.success || res?.status === 200 || res?.status === 201) {
                const token = resData.token || resData.accessToken;
                const userData = resData.user || resData.usuario;

                if (token && userData && typeof loginLocal === 'function') {
                    loginLocal(token, userData);
                    navigate('/pasajero/dashboard');
                } else {
                    navigate('/login', { state: { phone: telefonoLimpio } });
                }
            } else {
                setError(resData?.message || "Rechazo de la central al crear tu cuenta de pasajero.");
            }
        } catch (err) {
            console.error("🚨 [CIMCO-PASAJERO-AUTH] Error de registro:", err);
            setError(err?.response?.data?.message || "Error al conectar con la plataforma de despacho.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50/50 to-indigo-50/60 flex items-center justify-center p-4 font-sans relative overflow-hidden">
            {/* Luces de fondo decorativas */}
            <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md bg-white/85 backdrop-blur-xl border border-slate-200/80 p-6 sm:p-8 rounded-3xl shadow-2xl shadow-sky-950/10 relative z-10 transition-all duration-300 my-6">
                
                {/* Retorno */}
                <Link 
                    to="/register" 
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-mono text-xs font-bold uppercase tracking-wider transition-colors mb-6 text-decoration-none"
                > 
                    <ArrowLeft size={16} /> Volver a Selección de Rol
                </Link>

                {/* Header con Insignia de Seguridad */}
                <div className="mb-6 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full mb-3">
                        <ShieldCheck size={13} className="text-emerald-600" />
                        <span className="text-[10px] font-mono tracking-wider text-emerald-800 uppercase font-black">
                            Conexión Cifrada SSL 256-Bit
                        </span>
                    </div>

                    <h2 className="text-slate-900 font-black text-2xl tracking-tight uppercase">
                        TAXIA CIMCO
                    </h2>
                    <p className="text-slate-500 font-mono text-xs tracking-wide mt-1 font-semibold">
                        Paso {step} de 2: {step === 1 ? 'Verificación de línea móvil' : 'Creación de Perfil de Pasajero'}
                    </p>
                </div>

                {/* Indicador de Pasos (Stepper) */}
                <div className="flex items-center justify-center gap-3 mb-8 px-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                            step >= 1 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-200 text-slate-500'
                        }`}>
                            {step > 1 ? <Check size={14} /> : '1'}
                        </div>
                        <span className={`text-[11px] font-mono font-extrabold uppercase ${step === 1 ? 'text-indigo-900' : 'text-slate-400'}`}>
                            Teléfono
                        </span>
                    </div>

                    <div className={`h-0.5 flex-1 transition-colors ${step > 1 ? 'bg-indigo-600' : 'bg-slate-200'}`} />

                    <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                            step === 2 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-200 text-slate-500'
                        }`}>
                            2
                        </div>
                        <span className={`text-[11px] font-mono font-extrabold uppercase ${step === 2 ? 'text-indigo-900' : 'text-slate-400'}`}>
                            Perfil
                        </span>
                    </div>
                </div>

                {/* Banner de Mensaje de Error y Acción Directa a Login con Estado */}
                {error && (
                    <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-2xl text-xs font-mono font-medium flex flex-col gap-2.5 animate-in fade-in">
                        <div className="flex items-center gap-2.5">
                            <AlertTriangle size={16} className="shrink-0 text-rose-500" />
                            <span>{error}</span>
                        </div>

                        {telefonoExiste && (
                            <button 
                                type="button"
                                onClick={() => navigate('/login', { state: { phone: celular?.trim() } })}
                                className="mt-1 w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-xs font-mono font-bold uppercase transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
                            >
                                <LogIn size={15} /> Iniciar Sesión Ahora
                            </button>
                        )}
                    </div>
                )}

                {/* PASO 1: VERIFICACIÓN TELEFÓNICA */}
                {step === 1 && (
                    <form onSubmit={handleVerificarTelefono} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold block">
                                Número Celular Colombiano *
                            </label>
                            <div className="relative">
                                <Smartphone size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                                <input 
                                    type="tel" 
                                    maxLength={10} 
                                    placeholder="Ej. 3157654321" 
                                    className="w-full bg-slate-50/80 border border-slate-200 pl-10 pr-4 py-3.5 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm font-mono font-semibold shadow-sm disabled:opacity-50" 
                                    value={celular} 
                                    onChange={(e) => {
                                        setCelular(e.target.value.replace(/\D/g, ''));
                                        if (error) setError('');
                                        if (telefonoExiste) setTelefonoExiste(false);
                                    }} 
                                    disabled={loading}
                                    autoFocus
                                    required 
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono mt-1">
                                10 dígitos iniciando por 3 (Ej. 3157654321)
                            </p>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-4 text-xs font-mono uppercase tracking-widest rounded-xl font-black text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-500 hover:to-amber-600 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span>{loading ? "VERIFICANDO LÍNEA..." : "Verificar Disponibilidad"}</span>
                            <ArrowRight size={16} />
                        </button>
                    </form>
                )}

                {/* PASO 2: DATOS DE ACCESO, FOTO Y PERFIL */}
                {step === 2 && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        {/* Selector de Foto de Perfil */}
                        <div className="flex flex-col items-center justify-center pb-2">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-indigo-200 flex items-center justify-center overflow-hidden shadow-md group-hover:border-indigo-500 transition-all">
                                    {previewFoto ? (
                                        <img src={previewFoto} alt="Previsualización" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={32} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-1.5 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                                    <Camera size={13} />
                                </div>
                            </div>
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                accept="image/jpeg,image/png,image/webp" 
                                className="hidden" 
                                onChange={handleFotoChange}
                                disabled={loading}
                            />
                            <span className="text-[10px] font-mono text-slate-400 mt-2">Foto de Perfil (Opcional - Máx 5MB)</span>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold block">
                                Nombre Completo *
                            </label>
                            <div className="relative">
                                <User size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Ej. María Pérez" 
                                    className="w-full bg-slate-50/80 border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs font-medium shadow-sm disabled:opacity-50" 
                                    value={nombre} 
                                    onChange={(e) => setNombre(e.target.value)} 
                                    disabled={loading}
                                    required 
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold block">
                                Correo Electrónico *
                            </label>
                            <div className="relative">
                                <Mail size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                                <input 
                                    type="email" 
                                    placeholder="usuario@dominio.com" 
                                    className="w-full bg-slate-50/80 border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs font-mono shadow-sm disabled:opacity-50" 
                                    value={correo} 
                                    onChange={(e) => setCorreo(e.target.value)} 
                                    disabled={loading}
                                    required 
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-slate-600 font-mono text-[10px] uppercase tracking-wider font-bold block">
                                Contraseña de Acceso *
                            </label>
                            <div className="relative">
                                <Lock size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                                <input 
                                    type="password" 
                                    minLength={6} 
                                    placeholder="Mínimo 6 caracteres" 
                                    className="w-full bg-slate-50/80 border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs shadow-sm disabled:opacity-50" 
                                    value={clave} 
                                    onChange={(e) => setClave(e.target.value)} 
                                    disabled={loading}
                                    required 
                                />
                            </div>
                        </div>

                        <div className="pt-2 flex gap-3">
                            <button 
                                type="button" 
                                onClick={() => setStep(1)} 
                                disabled={loading}
                                className="w-1/3 py-3.5 text-xs font-mono font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                            >
                                Atrás
                            </button>

                            <button 
                                type="submit" 
                                disabled={loading} 
                                className="w-2/3 py-3.5 text-xs font-mono uppercase tracking-widest rounded-xl font-black text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-500 hover:to-amber-600 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                {loading ? (
                                    "CREANDO CUENTA..."
                                ) : (
                                    <>
                                        <Sparkles size={15} />
                                        <span>ACTIVAR CUENTA</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}

                {/* Footer / Login Link */}
                <div className="mt-8 pt-4 border-t border-slate-200/60 text-center">
                    <span className="text-[11px] text-slate-500 font-mono">¿Ya tienes una cuenta activada? </span>
                    <button 
                        type="button" 
                        onClick={() => navigate('/login', { state: { phone: celular?.trim() } })}
                        className="text-[11px] font-mono font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wide transition-colors bg-transparent border-0 p-0 cursor-pointer inline"
                    >
                        Loguear Entrada
                    </button>
                </div>

            </div>
        </div>
    );
};

export default RegisterPasajero;