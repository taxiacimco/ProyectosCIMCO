// Versión Arquitectura: V12.2 - Blindaje de FormData (Multipart) y Homologación de Payload (rol/role)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\RegisterPasajero.jsx
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism (Yellow).
 * Misión: Capturar identidad exclusivamente para PASAJEROS y enviar el payload con access_level: 0.
 * Ajuste: Protección Anti-Undefined en inyecciones de FormData y estandarización de variables de rol.
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth'; 
import api from '@/config/api'; 
import { ROLES, DEFAULT_ACCESS_LEVELS } from '@/config/constants';
import { Phone, User, Mail, Lock, ShieldCheck, Camera } from 'lucide-react';

const RegisterPasajero = () => {
    const navigate = useNavigate();
    const { loginLocal } = useAuth();

    // 🔄 CONTROL DE FLUJO PROGRESIVO
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // 📡 ESTADOS CORE
    const [telefono, setTelefono] = useState('');
    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [clave, setClave] = useState('');
    const [fotoPerfilFile, setFotoPerfilFile] = useState(null);

    const handleCheckPhone = async (e) => {
        e.preventDefault();
        
        // 🛡️ GUARDA DE SEGURIDAD PREVENTIVA
        if (!telefono || !telefono?.trim() || telefono.length < 7) {
            setError('El número de teléfono (mínimo 7 dígitos) es obligatorio.');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            const res = await api.post(`/api/auth/check-phone`, { telefono: telefono.trim() });
            
            if (res?.data?.success && res?.data?.existe) {
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

        // 🛡️ GUARDA DE SEGURIDAD: Validación estructural local
        if (!nombre?.trim() || !correo?.trim() || !clave?.trim()) {
            setError('Todos los campos básicos son estructuralmente requeridos.');
            return;
        }

        setLoading(true);
        try {
            const targetRole = ROLES?.PASAJERO || 'pasajero';
            const accessLevel = DEFAULT_ACCESS_LEVELS?.[targetRole] ?? 0;

            // ⚠️ ALERTA DE ARQUITECTURA: Uso de FormData requiere blindaje Anti-Undefined
            // para evitar que valores nulos se serialicen como strings "undefined".
            const formData = new FormData();
            formData.append('nombre', nombre.trim());
            formData.append('email', correo.toLowerCase().trim());
            formData.append('telefono', telefono.trim());
            formData.append('password', clave);
            
            // 🚀 Inyección Atómica de Gobernanza (Homologada con Moto/Intermunicipal)
            formData.append('role', targetRole); // Para la validación de Middleware
            formData.append('rol', targetRole);  // Para el mapeo en el Controlador
            formData.append('access_level', accessLevel);

            // Verificación binaria segura
            if (fotoPerfilFile instanceof File) {
                formData.append('foto_perfil', fotoPerfilFile);
            }

            // Llamada al endpoint con headers explícitos para Multer/Cloudinary
            const res = await api.post(`/api/auth/register`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (res?.data?.success) {
                // Iniciar sesión automáticamente delegando el token
                loginLocal(res.data.usuario, res.data.token);
                navigate('/');
            }
        } catch (err) {
            console.error("❌ [CIMCO-GATEWAY] Error de Form-Data:", err);
            setError(err.response?.data?.message || 'Error de sincronización con el servidor de carga binaria.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-zinc-200 flex flex-col items-center justify-center p-4 font-sans selection:bg-yellow-500/30 relative transition-colors duration-500">
            
            {/* Efecto de luz ambiental posterior (Glassmorphism Light Bleed) */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/[0.05] rounded-full blur-[100px] pointer-events-none" />
            
            {/* Contenedor Principal CIMCO-UI */}
            <div className="w-full max-w-md bg-[#121214]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-2xl relative z-10">
                <div className="text-center mb-6">
                    <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-500">TAXIA CIMCO</h2>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1 font-mono font-semibold">Registro de Pasajero</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-950/40 border border-red-500/20 text-red-400 text-xs font-mono rounded-lg backdrop-blur-sm flex items-center gap-2">
                        <span className="font-bold flex-shrink-0 text-red-500">⚠️ SYSTEM_FAULT:</span> 
                        <span className="leading-tight">{error}</span>
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleCheckPhone} className="space-y-4">
                        <div className="text-center mb-1">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono font-bold">Fase 01: Vinculación Telefónica</span>
                        </div>
                        <div className="relative group">
                            <Phone className="absolute left-3.5 top-3.5 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" size={14} />
                            <input 
                                type="tel" 
                                placeholder="INGRESAR NÚMERO CELULAR" 
                                value={telefono} 
                                onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))} 
                                className="w-full bg-[#18181b]/80 border border-white/5 rounded-lg py-3 pl-10 pr-4 text-xs font-mono uppercase tracking-wide text-zinc-200 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 focus:bg-[#1f1f22] transition-all placeholder:text-zinc-600" 
                                disabled={loading} 
                                maxLength={10} 
                                required 
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-black text-xs font-mono font-black uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)] hover:shadow-[0_0_25px_rgba(234,179,8,0.4)]"
                        >
                            {loading ? 'CONECTANDO CENTRAL...' : 'VERIFICAR DISPONIBILIDAD'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        
                        <div className="bg-yellow-950/30 border border-yellow-500/20 rounded-xl p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="text-yellow-500" size={15} />
                                <span className="text-[9px] text-yellow-500 uppercase tracking-widest font-mono font-bold">Identidad Celular</span>
                            </div>
                            <span className="text-xs text-yellow-100 font-bold tracking-widest bg-[#18181b] px-2.5 py-1 rounded-md border border-white/5 font-mono">
                                {telefono}
                            </span>
                        </div>

                        {/* Módulo de Inyección Binaria (Foto) */}
                        <div className="flex flex-col items-center justify-center p-3 bg-[#18181b]/60 border border-white/5 border-dashed rounded-xl transition-all hover:border-yellow-500/30 group">
                            <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono font-bold mb-2 group-hover:text-zinc-400 transition-colors">Avatar / Foto de Perfil</div>
                            <div className="flex items-center gap-3 w-full justify-center">
                                <input 
                                    type="file" 
                                    id="avatar" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => setFotoPerfilFile(e.target.files ? e.target.files[0] : null)} 
                                />
                                <label 
                                    htmlFor="avatar" 
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-[10px] font-mono font-bold uppercase tracking-wide transition-all ${fotoPerfilFile ? 'bg-yellow-950/50 text-yellow-500 border border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.1)]' : 'bg-[#27272a] text-zinc-400 hover:bg-[#3f3f46] border border-transparent'}`}
                                >
                                    <Camera size={14} />
                                    {fotoPerfilFile ? '✓ BINARIO LISTO' : 'SELECCIONAR FOTO'}
                                </label>
                                {fotoPerfilFile && <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[120px]">{fotoPerfilFile.name}</span>}
                            </div>
                        </div>

                        <div className="relative group">
                            <User className="absolute left-3.5 top-3.5 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" size={14} />
                            <input 
                                type="text" 
                                placeholder="NOMBRE COMPLETO" 
                                value={nombre} 
                                onChange={(e) => setNombre(e.target.value)} 
                                className="w-full bg-[#18181b]/80 border border-white/5 rounded-lg py-3 pl-10 pr-4 text-xs text-zinc-200 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 focus:bg-[#1f1f22] outline-none transition-all placeholder:text-zinc-600" 
                                disabled={loading} 
                                required 
                            />
                        </div>
                        <div className="relative group">
                            <Mail className="absolute left-3.5 top-3.5 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" size={14} />
                            <input 
                                type="email" 
                                placeholder="CORREO ELECTRÓNICO" 
                                value={correo} 
                                onChange={(e) => setCorreo(e.target.value)} 
                                className="w-full bg-[#18181b]/80 border border-white/5 rounded-lg py-3 pl-10 pr-4 text-xs text-zinc-200 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 focus:bg-[#1f1f22] outline-none transition-all placeholder:text-zinc-600" 
                                disabled={loading} 
                                required 
                            />
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-3.5 top-3.5 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" size={14} />
                            <input 
                                type="password" 
                                placeholder="CONTRASEÑA SEGURA (Mín. 6)" 
                                value={clave} 
                                onChange={(e) => setClave(e.target.value)} 
                                className="w-full bg-[#18181b]/80 border border-white/5 rounded-lg py-3 pl-10 pr-4 text-xs text-zinc-200 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 focus:bg-[#1f1f22] outline-none transition-all tracking-widest placeholder:text-zinc-600 placeholder:tracking-normal" 
                                disabled={loading} 
                                required 
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-black text-xs font-mono font-black uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)] hover:shadow-[0_0_25px_rgba(234,179,8,0.4)] mt-2"
                        >
                            {loading ? 'ALMACENANDO EN CENTRAL...' : 'FINALIZAR INSCRIPCIÓN'}
                        </button>
                        
                        <button 
                            type="button" 
                            onClick={() => setStep(1)} 
                            className="w-full text-center text-zinc-500 hover:text-zinc-300 text-[9px] uppercase tracking-widest pt-2 transition-colors font-mono font-bold"
                        >
                            ← MODIFICAR TERMINAL TELEFÓNICO
                        </button>
                    </form>
                )}

                <div className="mt-6 pt-4 border-t border-white/5 text-center font-mono">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">¿Ya tienes cuenta? <Link className="text-yellow-500 hover:text-yellow-400 ml-1 font-bold transition-colors" to="/login">LOGUEAR ENTRADA</Link></p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPasajero;