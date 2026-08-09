// Versión Arquitectura: V1.1 - Módulo CEO para Gestión de Credenciales con Cancelación Asíncrona y Revocación de Accesos
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\admin\GestionAdmins.jsx
 * Misión: Permitir al CEO la creación, asignación de permisos y revocación de administradores/oficinas.
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/config/firebase';
import { 
    UserPlus, ShieldCheck, Lock, Mail, User, Building, 
    Search, Loader2, AlertCircle, Trash2, KeyRound 
} from 'lucide-react';

const GestionAdmins = () => {
    const { user } = useAuth();
    const [administradores, setAdministradores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [modalAbierto, setModalAbierto] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [revocandoId, setRevocandoId] = useState(null);
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

    // Formulario de creación de Admin/Oficina
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: '',
        role: 'admin', // 'admin', 'oficina', 'ceo'
        access_level: 8,
        cooperativaId: ''
    });

    // Helper para recuperar token JWT REST con guardas de seguridad
    const getAuthToken = async () => {
        let token = user?.token || localStorage.getItem('token') || localStorage.getItem('cimco_token');
        if (!token && auth?.currentUser) {
            token = await auth.currentUser.getIdToken();
        }
        return token || '';
    };

    // 1. Cargar Administradores Existentes con AbortController
    const cargarAdministradores = async (signal) => {
        try {
            setLoading(true);
            const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const cleanBaseUrl = rawBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
            const token = await getAuthToken();

            const response = await fetch(`${cleanBaseUrl}/api/admin/usuarios`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                signal
            });

            if (response.ok) {
                const result = await response.json();
                const listaRaw = result?.data || result?.usuarios || [];
                setAdministradores(Array.isArray(listaRaw) ? listaRaw : []);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('❌ Error al cargar administradores:', err);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        cargarAdministradores(controller.signal);

        return () => {
            controller.abort();
        };
    }, []);

    // 2. Registrar Nuevo Administrador u Oficina
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMensaje({ tipo: '', texto: '' });

        const nombreLimpio = formData.nombre?.trim() || '';
        const emailLimpio = formData.email?.trim() || '';
        const passwordLimpia = formData.password?.trim() || '';

        if (!nombreLimpio || !emailLimpio || !passwordLimpia) {
            setMensaje({ tipo: 'error', texto: 'Todos los campos marcados son obligatorios.' });
            return;
        }

        try {
            setGuardando(true);
            const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const cleanBaseUrl = rawBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
            const token = await getAuthToken();

            const response = await fetch(`${cleanBaseUrl}/api/admin/crear-credencial`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    nombre: nombreLimpio,
                    email: emailLimpio,
                    password: passwordLimpia
                })
            });

            const result = await response.json();

            if (response.ok && (result?.success || result?.ok)) {
                setMensaje({ tipo: 'exito', texto: 'Credencial corporativa creada exitosamente.' });
                await cargarAdministradores();
                setTimeout(() => {
                    setModalAbierto(false);
                    setFormData({ nombre: '', email: '', password: '', role: 'admin', access_level: 8, cooperativaId: '' });
                    setMensaje({ tipo: '', texto: '' });
                }, 1500);
            } else {
                setMensaje({ tipo: 'error', texto: result?.error || result?.message || 'Error al crear la credencial.' });
            }
        } catch (err) {
            console.error('❌ Error de red:', err);
            setMensaje({ tipo: 'error', texto: 'Fallo de comunicación con el servidor central.' });
        } finally {
            setGuardando(false);
        }
    };

    // 3. Revocar o Eliminar Credencial Administrativa
    const handleRevocarCredencial = async (adminId) => {
        if (!adminId) return;
        const confirmacion = window.confirm('⚠️ ¿Está seguro de que desea revocar el acceso a esta credencial administrativa?');
        if (!confirmacion) return;

        try {
            setRevocandoId(adminId);
            const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const cleanBaseUrl = rawBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
            const token = await getAuthToken();

            const response = await fetch(`${cleanBaseUrl}/api/admin/usuarios/${adminId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (response.ok && (result?.success || result?.ok)) {
                await cargarAdministradores();
            } else {
                alert(`❌ Error al revocar credencial: ${result?.error || result?.message || 'Operación fallida'}`);
            }
        } catch (err) {
            console.error('❌ Error al revocar credencial:', err);
            alert('❌ Fallo de conexión al intentar revocar la credencial.');
        } finally {
            setRevocandoId(null);
        }
    };

    const adminsFiltrados = (administradores || []).filter(admin => {
        const nombreStr = admin?.nombre?.toLowerCase() || '';
        const emailStr = admin?.email?.toLowerCase() || '';
        const query = busqueda.toLowerCase().trim();
        return nombreStr.includes(query) || emailStr.includes(query);
    });

    return (
        <div className="space-y-6 w-full max-w-7xl mx-auto animate-in fade-in duration-300 font-mono">
            
            {/* CABECERA Y ACCIÓN PRINCIPAL */}
            <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase border border-amber-500/20">
                            Módulo CEO
                        </span>
                        <span className="text-zinc-500 text-xs">| Niveles 8 a 99</span>
                    </div>
                    <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-amber-400" />
                        Gestión de Credenciales de Oficina & Admins
                    </h2>
                    <p className="text-[10px] text-zinc-500 uppercase mt-0.5">Creación de accesos de personal administrativo y operadores de terminal</p>
                </div>

                <button
                    onClick={() => { setMensaje({ tipo: '', texto: '' }); setModalAbierto(true); }}
                    className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/10 transition-all flex items-center gap-2"
                >
                    <UserPlus className="w-4 h-4 stroke-[3]" />
                    Nueva Credencial
                </button>
            </div>

            {/* BUSCADOR */}
            <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                    type="text"
                    placeholder="Buscar por Nombre o Correo..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full bg-[#121214]/80 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-all"
                />
            </div>

            {/* TABLA / TARJETAS DE ADMINISTRADORES */}
            {loading ? (
                <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-12 text-center">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
                    <p className="text-zinc-500 text-xs uppercase">Consultando personal administrativo en MongoDB...</p>
                </div>
            ) : adminsFiltrados.length === 0 ? (
                <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-2xl p-12 text-center">
                    <ShieldCheck className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-400 text-xs font-bold uppercase">No se encontraron credenciales administrativas</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {adminsFiltrados.map((admin) => {
                        const targetId = admin?._id || admin?.id;
                        const isRevocando = revocandoId === targetId;

                        return (
                            <div key={targetId || Math.random()} className="backdrop-blur-md bg-[#121214]/80 border border-white/5 hover:border-amber-500/30 rounded-2xl p-5 shadow-xl transition-all relative group">
                                <div className="flex justify-between items-start mb-2 gap-2">
                                    <h3 className="font-bold text-white text-sm uppercase truncate">{admin?.nombre || 'Sin nombre'}</h3>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                                            admin?.role === 'ceo' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                        }`}>
                                            {admin?.role || 'Admin'}
                                        </span>
                                        <button
                                            onClick={() => handleRevocarCredencial(targetId)}
                                            disabled={isRevocando}
                                            title="Revocar Credencial"
                                            className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-all disabled:opacity-50"
                                        >
                                            {isRevocando ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                                            ) : (
                                                <Trash2 className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-zinc-400 text-xs truncate mb-3 flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                    {admin?.email || 'N/A'}
                                </p>
                                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500">
                                    <span>Nivel: <strong className="text-white">{admin?.access_level ?? 8}</strong></span>
                                    <span>Coop ID: <strong className="text-zinc-300">{admin?.cooperativaId || 'Global'}</strong></span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL DE CREACIÓN */}
            {modalAbierto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#121214] border border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
                        <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                            <KeyRound className="w-4 h-4 text-amber-400" /> Crear Credencial de Oficina
                        </h3>

                        {mensaje.texto && (
                            <div className={`mb-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
                                mensaje.tipo === 'exito' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}>
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{mensaje.texto}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Nombre Completo</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej. Juan Pérez - Oficina Central"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                    disabled={guardando}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Correo Electrónico (Login)</label>
                                <input 
                                    type="email" 
                                    placeholder="oficina.jagua@cimco.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    disabled={guardando}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Contraseña Temporal</label>
                                <input 
                                    type="password" 
                                    placeholder="••••••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    disabled={guardando}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Rol Operativo</label>
                                    <select 
                                        value={formData.role}
                                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                                        disabled={guardando}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
                                    >
                                        <option value="admin">Administrador</option>
                                        <option value="oficina">Oficina / Despacho</option>
                                        <option value="ceo">CEO / SuperAdmin</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Nivel Acceso</label>
                                    <input 
                                        type="number" 
                                        value={formData.access_level}
                                        onChange={(e) => setFormData({...formData, access_level: Number(e.target.value)})}
                                        disabled={guardando}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => setModalAbierto(false)}
                                    disabled={guardando}
                                    className="px-4 py-2 bg-zinc-800 text-zinc-300 font-bold text-xs uppercase rounded-xl disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={guardando}
                                    className="px-4 py-2 bg-amber-500 text-black font-extrabold text-xs uppercase rounded-xl flex items-center gap-2 disabled:opacity-50"
                                >
                                    {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    {guardando ? 'Emitiendo...' : 'Emitir Credencial'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionAdmins;