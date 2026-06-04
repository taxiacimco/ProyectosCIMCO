// Versión Arquitectura: V2.0 - Consola Privada de Inyección de Infraestructura (Anti-Intrusos)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\RegisterAdmin.jsx
 * Misión: Sembrar los perfiles de Alta Gerencia y Operaciones en entorno local de forma segura.
 * Seguridad: Sin inputs públicos. Ejecución directa controlada hacia el API Gateway.
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../config/api';

const RegisterAdmin = () => {
  const navigate = useNavigate();
  const [log, setLog] = useState('');
  const [loading, setLoading] = useState(false);

  // 🚀 Función genérica para inyectar cuentas administrativas al backend
  const ejecutarInyeccion = async (perfil) => {
    setLoading(true);
    setLog('');

    try {
      let payload = {};

      if (perfil === 'CEO') {
        payload = {
          nombre: "CARLOS MARIO CEO",
          telefono: "3101112233",
          email: "admin@test.com",
          password: "123456",
          rol: "admin",
          access_level: 99 // Nivel Máximo de Consola
        };
      } else if (perfil === 'SECRETARIA') {
        payload = {
          nombre: "Secretaria CIMCO",
          telefono: "3107778899",
          email: "secretaria@test.com",
          password: "123456",
          rol: "secretaria" // Rol Operativo de Soporte / Staff
        };
      }

      // Enviar comando directo al endpoint de registro
      const response = await api.post('/api/auth/register', payload);
      
      setLog(`✅ Perfil [${perfil}] indexado con éxito en el clúster local.`);
    } catch (err) {
      setLog(`❌ Error: ${err.response?.data?.message || 'Fallo de conexión con el nodo central'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Resplandor Rojo de advertencia de infraestructura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md backdrop-blur-xl bg-[#0b0b0f]/95 border border-red-500/10 rounded-2xl p-8 shadow-2xl shadow-black relative z-10">
        
        {/* Encabezado Restringido */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/[0.08] border border-red-500/30 rounded-full mb-3">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-[10px] font-mono tracking-[0.2em] text-red-400 uppercase font-bold">Terminal Interno de Control</span>
          </div>
          <h2 className="text-zinc-100 font-black text-xl tracking-tight uppercase">Inicializador de Cuentas</h2>
          <p className="text-zinc-500 font-mono text-[9px] tracking-widest mt-1 uppercase">Entorno Local de Pruebas CIMCO</p>
        </div>

        {/* Consola de Logs */}
        {log && (
          <div className="mb-6 bg-black/50 border border-zinc-800/80 p-3 rounded-xl font-mono text-[11px] text-zinc-300 whitespace-pre-line leading-relaxed">
            {log}
          </div>
        )}

        <div className="space-y-4">
          <p className="text-[11px] text-zinc-400 text-center font-mono uppercase tracking-wider mb-2">
            Presione para inyectar las credenciales preestablecidas de desarrollo:
          </p>

          {/* ACCIÓN 1: ADMINISTRADOR MÁXIMO / CEO */}
          <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white font-mono">⚡ El Administrador Máximo / CEO</span>
              <span className="text-[9px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20 font-mono font-bold">LVL 99</span>
            </div>
            <div className="text-[10px] font-mono text-zinc-500 space-y-0.5">
              <p>User: admin@test.com</p>
              <p>Pass: 123456</p>
            </div>
            <button type="button" onClick={() => ejecutarInyeccion('CEO')} disabled={loading} className="w-full bg-red-600/90 hover:bg-red-600 disabled:opacity-40 text-white font-mono uppercase text-[10px] font-bold tracking-widest py-2.5 rounded-lg transition-all shadow-md shadow-red-900/20">
              {loading ? "Procesando..." : "Inyectar Perfil CEO"}
            </button>
          </div>

          {/* ACCIÓN 2: SOPORTE Y OPERACIONES / SECRETARIA */}
          <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white font-mono">🎧 Soporte y Operaciones</span>
              <span className="text-[9px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700 font-mono font-bold">STAFF</span>
            </div>
            <div className="text-[10px] font-mono text-zinc-500 space-y-0.5">
              <p>User: secretaria@test.com</p>
              <p>Pass: 123456</p>
            </div>
            <button type="button" onClick={() => ejecutarInyeccion('SECRETARIA')} disabled={loading} className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 font-mono uppercase text-[10px] font-bold tracking-widest py-2.5 rounded-lg transition-all">
              {loading ? "Procesando..." : "Inyectar Perfil Secretaria"}
            </button>
          </div>
        </div>

        {/* Retorno seguro */}
        <div className="mt-8 text-center border-t border-zinc-900 pt-4">
          <Link to="/login" className="text-zinc-600 hover:text-zinc-400 font-mono text-[10px] uppercase tracking-widest transition-colors">
            ← Regresar al Acceso Público
          </Link>
        </div>

      </div>
    </div>
  );
};

export default RegisterAdmin;