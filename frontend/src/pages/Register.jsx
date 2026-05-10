// Versión Arquitectura: V1.7 - Redirección Post-Registro y Path Sagrado
import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const Register = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'pasajero';
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    fullName: '',
  });

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      // 1. Crear usuario con email sintético
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        `${formData.phone}@taxiacimco.com`, 
        formData.password
      );

      const uid = userCredential.user.uid;

      // 2. REGLA DE ORO: Guardar en Path Sagrado
      await setDoc(doc(db, `artifacts/taxiacimco-app/public/data/profiles`, uid), {
        uid,
        phone: formData.phone,
        fullName: formData.fullName,
        role: role,
        status: 'ACTIVE',
        createdAt: serverTimestamp()
      });

      // 3. Inicializar Billetera Atómica
      await setDoc(doc(db, `artifacts/taxiacimco-app/public/data/wallets`, uid), {
        balance: 0,
        currency: 'COP',
        updatedAt: serverTimestamp()
      });

      // ✅ REDIRECCIÓN AL HOME (Donde AppRouter cargará el dashboard según rol)
      navigate('/'); 

    } catch (error) {
      console.error("❌ Error en Registro CIMCO:", error.message);
      alert("Error al registrar: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-md bg-zinc-900 border-t-8 border-yellow-400 p-8 shadow-[10px_10px_0px_0px_rgba(255,255,255,0.1)]">
        <h2 className="text-3xl font-black text-white uppercase mb-2 italic">Registro <span className="text-yellow-400">{role}</span></h2>
        <p className="text-zinc-500 text-xs mb-8 uppercase tracking-tighter">Acceso al Sistema de Transporte La Jagua</p>
        
        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] text-yellow-400 font-bold uppercase">Nombre Completo</label>
            <input 
              type="text" 
              required
              className="w-full bg-black border-2 border-zinc-700 p-3 text-white focus:border-yellow-400 outline-none transition-all"
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-yellow-400 font-bold uppercase">Teléfono (Será tu ID)</label>
            <input 
              type="tel" 
              required
              className="w-full bg-black border-2 border-zinc-700 p-3 text-white focus:border-yellow-400 outline-none transition-all"
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-yellow-400 font-bold uppercase">Contraseña</label>
            <input 
              type="password" 
              required
              className="w-full bg-black border-2 border-zinc-700 p-3 text-white focus:border-yellow-400 outline-none transition-all"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button className="w-full bg-yellow-400 text-black font-black py-4 uppercase shadow-[4px_4px_0px_0px_#fff] active:translate-y-1 active:shadow-none transition-all">
            Crear Cuenta CIMCO
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;