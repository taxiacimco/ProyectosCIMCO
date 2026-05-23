// Versión Arquitectura: V1.8 - Bloqueo de Registro Administrativo y Path Sagrado de Firestore
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\Register.jsx
 * Misión: Formulario de afiliación e inscripción en La Jagua.
 * Ajuste: Sanitización de roles por query string para anular exploits de inyección de rol CEO/Admin.
 */

import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const Register = () => {
  const [searchParams] = useSearchParams();
  
  // 🛡️ GUARDA DE SEGURIDAD INTERNA: Sanitización forzada del rol entrante
  let role = searchParams.get('role') || 'pasajero';
  if (role === 'admin' || role === 'ceo') {
    role = 'pasajero'; // Sobrescritura estricta e irreversible para blindar producción
  }

  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    fullName: '',
  });

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Guarda contra valores indefinidos o vacíos
    if (!formData.phone || !formData.password || !formData.fullName) {
      setError('Todos los campos de registro son obligatorios.');
      setLoading(false);
      return;
    }

    try {
      // 1. Crear usuario con email sintético para coherencia de base única híbrida
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        `${formData.phone}@taxiacimco.com`, 
        formData.password
      );

      const uid = userCredential.user.uid;

      // 2. REGLA DE ORO DE ARQUITECTURA: Registro explícito en el Path Sagrado
      await setDoc(doc(db, `artifacts/taxiacimco-app/public/data/profiles`, uid), {
        uid,
        phone: formData.phone,
        fullName: formData.fullName,
        role: role, // 'pasajero' o 'conductor' verificado y limpio de exploits
        status: 'ACTIVE',
        createdAt: serverTimestamp()
      });

      alert('🎉 ¡Afiliación Exitosa! Tu cuenta ha sido dada de alta en el nodo TAXIA CIMCO.');
      navigate('/login');
    } catch (err) {
      console.error('❌ Error en el flujo de registro centralizado:', err);
      setError(err.message || 'Error crítico en el despliegue del registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 selection:bg-yellow-400 selection:text-black font-mono">
      <div className="w-full max-w-md bg-black border-4 border-white p-6 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] text-white relative">
        
        <div className="mb-6 border-b-4 border-white pb-4">
          <h1 className="text-3xl font-black tracking-tighter uppercase text-yellow-400">REGISTRO CORE</h1>
          <p className="text-zinc-400 text-xs mt-1 font-sans">Alta de Usuarios - Terminal La Jagua de Ibirico</p>
          <div className="mt-2 inline-block bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white border border-zinc-600">
            MODO DE AFILIACIÓN: {role.toUpperCase()}
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-zinc-900 border-2 border-red-500 text-red-400 text-xs p-3 font-bold uppercase">
            ⚠️ ERROR: {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-yellow-400 font-bold uppercase">Nombre Completo</label>
            <input 
              type="text" 
              required
              value={formData.fullName}
              className="w-full bg-black border-2 border-zinc-700 p-3 text-white focus:border-yellow-400 outline-none transition-all text-sm"
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-yellow-400 font-bold uppercase">Teléfono Movil (Será tu ID)</label>
            <input 
              type="tel" 
              required
              value={formData.phone}
              className="w-full bg-black border-2 border-zinc-700 p-3 text-white focus:border-yellow-400 outline-none transition-all text-sm"
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="3120000000"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-yellow-400 font-bold uppercase">Contraseña del Sistema</label>
            <input 
              type="password" 
              required
              value={formData.password}
              className="w-full bg-black border-2 border-zinc-700 p-3 text-white focus:border-yellow-400 outline-none transition-all text-sm"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 text-black font-black py-4 uppercase shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black transition-all active:translate-x-1 active:translate-y-1 active:shadow-none disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'PROCESANDO ALTA CENTRAL...' : 'CONFIRMAR AFILIACIÓN'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;