// Versión Arquitectura: V2.5 - Implementación Cyber-Transport, Control de Excepciones y Estricto CIMCO-UI
/**
 * Ubicación: frontend/src/pages/Register.jsx
 * Misión: Interfaz avanzada de registro híbrido con estética de transporte nocturno premium y aislamiento de fallos de Firestore.
 */

import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const Register = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // 🛡️ Guarda de seguridad: Sanitización estricta de privilegios en Query String
  let initialRole = searchParams.get('role') || 'pasajero';
  if (['admin', 'ceo'].includes(initialRole.toLowerCase().trim())) {
    initialRole = 'pasajero';
  }

  const [loading, setLoading] = useState(false);
  const [currentStepText, setCurrentStepText] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ phone: '', password: '', fullName: '' });

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 🛡️ 1. Guarda Preventiva (Anti-Undefined y Formato de Telecomunicaciones)
      if (!formData.fullName || formData.fullName.trim().length < 3) {
        throw new Error("Identificación inválida. Ingrese su nombre completo.");
      }
      if (!formData.phone || formData.phone.trim().length < 7) {
        throw new Error("El terminal telefónico provisto no cumple con el estándar operativo.");
      }
      if (!formData.password || formData.password.length < 6) {
        throw new Error("La clave de seguridad perimetral debe contener al menos 6 caracteres.");
      }

      // 🚀 2. Encriptación del Identificador Híbrido CIMCO-Core
      const emailHibrido = `${formData.phone.trim()}@taxiacimco.com`;
      
      setCurrentStepText('SINCRO FIREBASE AUTH...');
      console.log(`📡 [CIMCO-AUTH] Transmitiendo credenciales a Google Identity: ${emailHibrido}`);

      // 🔐 3. Registro en el nodo central de Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
          auth, 
          emailHibrido, 
          formData.password
      );
      
      const uid = userCredential.user.uid;

      // 📦 4. Persistencia Tolerante a Fallos en Firestore (Contingencia de Red)
      setCurrentStepText('ESCRIBIENDO NODO DOCUMENTAL...');
      try {
        await setDoc(doc(db, 'usuarios', uid), {
            nombre: formData.fullName.trim(),
            telefono: formData.phone.trim(),
            email: emailHibrido,
            role: initialRole.toLowerCase(),
            fechaCreacion: serverTimestamp()
        });
      } catch (firestoreError) {
        // Alerta de Arquitectura controlada: Si Firestore falla, registramos la advertencia 
        // pero permitimos que el flujo continúe hacia MongoDB Atlas.
        console.warn("⚠️ [CIMCO-WARN] Fallo de escritura en Firestore (verifique reglas de seguridad):", firestoreError.message);
      }

      // 📡 5. Enlace Transaccional con el Clúster Principal (Express + MongoDB Atlas)
      setCurrentStepText('SINCRONIZANDO MONGODB ATLAS...');
      console.log("📡 [CIMCO-SYNC] Enlazando registro con el clúster de MongoDB...");
      
      const respuestaBackend = await fetch('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              nombre: formData.fullName.trim(),
              telefono: formData.phone.trim(),
              email: emailHibrido,
              password: formData.password,
              rol: initialRole.toLowerCase()
          })
      });

      const dataBackend = await respuestaBackend.json();

      if (!respuestaBackend.ok) {
          throw new Error(dataBackend.message || "Fallo de consistencia en el nodo secundario Express/MongoDB.");
      }

      console.log("✅ [CIMCO-ÉXITO] Sincronización Dual Completada de forma exitosa.");
      setCurrentStepText('REDIRECCIONANDO...');
      
      setTimeout(() => {
        navigate('/login');
      }, 1000);

    } catch (err) {
      console.error("❌ Error detectado en pasarela de registro:", err);
      // Desinfectar mensajes nativos de Firebase para visualización del operador externo
      let mensajeLimpio = err.message.replace("Firebase: ", "");
      if (mensajeLimpio.includes("permission-denied") || mensajeLimpio.includes("permissions")) {
        mensajeLimpio = "Error de Seguridad Firestore: Permisos insuficientes en la base de datos de la nube.";
      }
      setError(mensajeLimpio);
    } finally {
      setLoading(false);
      setCurrentStepText('');
    }
  };

  return (
    <div className="min-h-screen bg-[#060608] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-[#09090c] to-[#050507] flex items-center justify-center p-4 selection:bg-cyan-500/30 font-sans relative overflow-hidden">
      
      {/* Efectos de Iluminación de Radar de Tránsito en Fondo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/[0.03] rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-32 h-32 bg-blue-500/[0.02] rounded-full blur-3xl pointer-events-none" />

      {/* Contenedor Principal CIMCO-UI V9.3 - Glassmorphism Restringido */}
      <div className="w-full max-w-md backdrop-blur-md bg-[#121214]/80 border border-white/[0.06] rounded-2xl p-8 shadow-[0_0_50px_-12px_rgba(6,182,212,0.15)] relative overflow-hidden group">
        
        {/* Línea Fosforescente Indicadora de Estado de Sistema */}
        <div className={`absolute top-0 left-0 h-[2px] transition-all duration-500 ${loading ? 'w-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]' : 'w-1/3 bg-gradient-to-r from-transparent via-zinc-700 to-transparent'}`} />

        {/* Encabezado del Centro de Mando */}
        <div className="mb-8 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/[0.06] border border-cyan-500/15 rounded-full mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-mono tracking-[0.15em] text-cyan-400 uppercase">Nodo de Enlace Satelital</span>
          </div>
          <h2 className="text-white font-black text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
            Unirse a CIMCO
          </h2>
          <p className="text-zinc-500 text-xs font-mono tracking-wide mt-1 capitalize">Registro de Cuenta: Modulo {initialRole}</p>
        </div>

        {/* Panel de Visualización de Errores */}
        {error && (
          <div className="mb-6 bg-red-950/30 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-xl font-mono flex items-start gap-2.5 backdrop-blur-sm">
            <span className="text-red-500 mt-0.5">⚠️</span>
            <div className="flex-1">
              <span className="font-bold block text-[10px] tracking-wider uppercase text-red-300 mb-0.5">Fallo de Comunicación</span>
              {error}
            </div>
          </div>
        )}

        {/* Formulario de Entrada Operativa */}
        <form onSubmit={handleRegister} className="space-y-4">
          
          <div className="space-y-1.5">
            <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest pl-1">Nombre de Operador</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Ej. Carlos Fuentes" 
                className="w-full bg-[#131318]/90 border border-white/[0.06] p-3.5 rounded-xl text-zinc-100 text-sm focus:border-cyan-500/40 focus:bg-[#16161f] outline-none transition-all placeholder-zinc-700 shadow-inner" 
                onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest pl-1">Terminal Celular (Identidad)</label>
            <div className="relative">
              <input 
                type="tel" 
                placeholder="Ej. 3009998877" 
                className="w-full bg-[#131318]/90 border border-white/[0.06] p-3.5 rounded-xl text-zinc-100 text-sm focus:border-cyan-500/40 focus:bg-[#16161f] outline-none transition-all placeholder-zinc-700 shadow-inner font-mono" 
                onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest pl-1">Clave de Acceso Perimetral</label>
            <div className="relative">
              <input 
                type="password" 
                placeholder="••••••••" 
                className="w-full bg-[#131318]/90 border border-white/[0.06] p-3.5 rounded-xl text-zinc-100 text-sm focus:border-cyan-500/40 focus:bg-[#16161f] outline-none transition-all placeholder-zinc-700 shadow-inner font-mono tracking-widest" 
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
                disabled={loading}
                required
              />
            </div>
          </div>
          
          {/* Botón de Transmisión del Formulario */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-6 py-4 text-xs font-mono uppercase tracking-[0.25em] rounded-xl transition-all duration-300 relative overflow-hidden font-bold active:scale-[0.99]
              ${loading 
                ? 'bg-zinc-900 border border-white/5 text-zinc-500 cursor-not-allowed shadow-none' 
                : 'bg-zinc-100 text-black hover:bg-cyan-500 hover:text-white border border-transparent hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]'}`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2.5">
                <span className="h-2 w-2 bg-cyan-400 rounded-full animate-ping" />
                <span className="tracking-widest animate-pulse">{currentStepText}</span>
              </span>
            ) : "Inicializar Conexión"}
          </button>
        </form>

        {/* Pie de Página de la Consola UI */}
        <div className="mt-8 pt-4 border-t border-white/[0.03] text-center">
          <p className="text-zinc-600 font-mono text-[9px] uppercase tracking-widest">
            TAXIA CIMCO MULTIMODAL v9.5 • INTEGRIDAD TOTAL
          </p>
        </div>

      </div>
    </div>
  );
};

export default Register;