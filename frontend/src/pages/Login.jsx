// Versión Arquitectura: V18.2 - Rompe-Bucles Automático y Sincronización del Handshake V9.3
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\Login.jsx
 * Misión: Componente de autenticación de alta fidelidad con redirección predictiva para Operadores, Secretarias y CEO.
 * Ajuste: Mitigación total del bucle de renders infinitos congelando el formulario tras validación exitosa.
 */

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/config/api';
import { Eye, EyeOff, ShieldAlert, KeyRound, Terminal } from 'lucide-react';

const Login = () => {
  const { loginLocal } = useAuth();
  const navigate = useNavigate();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return; // 🛡️ Cortafuegos 1: Previene ráfagas de ejecución concurrente

    setLoading(true);
    setError('');

    // 🛡️ GUARDA DE SEGURIDAD: Validación preventiva estricta en el cliente
    const cleanIdentifier = identifier ? identifier.trim() : '';
    if (!cleanIdentifier || !password) {
      setError('Por favor, complete todos los campos de autenticación.');
      setLoading(false);
      return;
    }

    try {
      console.log('📡 [CIMCO-AUTH] Solicitando handshake de acceso al nodo central...');
      
      // Petición perimetral utilizando la API unificada (api.js con puerto 3000)
      const res = await api.post('/auth/login', {
        identifier: cleanIdentifier,
        password: password
      });

      // 🛡️ Anti-Undefined: Verificación estricta de la estructura del payload
      if (res.data && res.data.success && res.data.usuario && res.data.token) {
        console.log('✅ [CIMCO-AUTH] Handshake exitoso. Payload de identidad recibido.');
        
        const userRole = res.data.usuario.role || res.data.usuario.rol;
        
        // Determinar mapa topológico de redirecciones por rol operativo
        let redirectPath = '/';
        switch (userRole) {
          case 'admin':
            redirectPath = '/admin/dashboard';
            break;
          case 'secretaria':
            redirectPath = '/dashboard/operaciones';
            break;
          case 'pasajero':
            redirectPath = '/pasajero/home';
            break;
          case 'despachador':
            redirectPath = '/despachador/home';
            break;
          case 'intermunicipal':
            redirectPath = '/intermunicipal/home';
            break;
          case 'motocarga':
            redirectPath = '/motocarga/home';
            break;
          case 'mototaxi':
          case 'motoparrillero':
            redirectPath = '/mototaxi/home';
            break;
          default:
            redirectPath = '/';
        }

        console.log(`🚀 [CIMCO-AUTH] Sincronizando sesión local. Destino asignado: ${redirectPath}`);
        
        // 🔥 Sincronización atómica del contexto global de autenticación
        await loginLocal(res.data.usuario, res.data.token);
        
        // 🛡️ Cortafuegos 2: Limpieza de credenciales en memoria local para romper re-renders accidentales
        setIdentifier('');
        setPassword('');
        
        // Transición instantánea y segura una vez asentada la data en memoria/storage
        navigate(redirectPath);
      } else {
        setError(res.data?.message || 'Estructura de respuesta corrupta o token ausente.');
        setLoading(false);
      }
    } catch (err) {
      console.error('🚨 [CIMCO-AUTH-FATAL] Quiebre en pasarela de acceso:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('El servidor Express no responde. Verifique el estado del clúster central.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0a0a0c] flex items-center justify-center p-4 overflow-hidden select-none">
      
      {/* CAPA DE AMBIENTE ESTÉTICO: CIMCO NEBULA */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* RECIPIENTE PERIMETRAL PREMIUM CON ESTÉTICA GLASSMORPHISM */}
      <div className="relative w-full max-w-md backdrop-blur-md bg-[#121214]/80 border border-white/[0.04] p-8 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.8)] transition-all duration-300">
        
        {/* ENCABEZADO TÁCTICO */}
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-cyan-400 mb-4 shadow-inner">
            <Terminal size={24} className="animate-pulse" />
          </div>
          <h1 className="text-xl font-black text-white uppercase tracking-[0.15em] font-mono">
            TAXIA CIMCO
          </h1>
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1">
            Módulo de Acceso Ecosistema Híbrido
          </p>
        </div>

        {/* COMPUERTA DE GESTIÓN DE ERRORES SÓNICOS */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono flex items-start gap-3 animate-fade-in">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* FORMULARIO DE ACCESO INDUSTRIAL */}
        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
          <div>
            <label className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest mb-2 font-bold">
              Identificador (Celular o Correo)
            </label>
            <input 
              type="text" 
              placeholder="Ej: 3001234567 o admin@cimco.com"
              className="w-full bg-[#16161a]/90 border border-white/[0.05] p-3.5 rounded-xl text-zinc-100 text-sm focus:border-cyan-500/40 focus:bg-[#1a1a22] outline-none font-mono transition-all duration-200"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest mb-2 font-bold">
              Clave Operativa
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••"
                className="w-full bg-[#16161a]/90 border border-white/[0.05] p-3.5 pr-11 rounded-xl text-zinc-100 text-sm focus:border-cyan-500/40 focus:bg-[#1a1a22] outline-none font-mono tracking-widest transition-all duration-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button 
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-zinc-300 rounded-lg transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-6 py-4 text-xs font-mono uppercase tracking-[0.25em] rounded-xl bg-zinc-100 text-black hover:bg-cyan-500 hover:text-white font-black transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-cyan-500/10 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="h-3 w-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Sincronizando Nodo...
              </>
            ) : (
              <>
                <KeyRound size={12} /> Acceder al Nodo Central
              </>
            )}
          </button>
        </form>

        {/* PASARELA DE ENLACES PERIMETRALES */}
        <div className="mt-8 pt-4 border-t border-white/[0.03] relative z-10">
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                <Link to="/register" className="hover:text-cyan-400 transition-colors">Crear cuenta</Link>
                <Link to="/forgot-password" className="hover:text-cyan-400 transition-colors">¿Olvidó clave?</Link>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Login;