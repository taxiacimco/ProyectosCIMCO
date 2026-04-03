/**
 * PROYECTO: TAXIA CIMCO - Módulo de Autenticación
 * Arquitectura: Hexagonal (Capa de Adaptadores de Entrada)
 * Estilo: Ciber-Neo-Brutalista con Tailwind CSS
 */

import React, { useState } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { 
  Loader2, Mail, Lock, Chrome, 
  ShieldCheck, ArrowRight, Smartphone, User, AlertCircle 
} from 'lucide-react';

// Importamos el servicio de sincronización con el Backend
import { syncUserWithBackend } from '../api/authService';

const auth = getAuth();
const db = getFirestore();
const appId = 'taxiacimco-app';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [errorMessage, setErrorMessage] = useState(""); // Estado para errores visuales
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    nombre: '', 
    rol: 'pasajero',
    telefono: '' 
  });

  /**
   * ✅ SINCRONIZACIÓN QUIRÚRGICA CON FIRESTORE
   * Ruta Sagrada: artifacts/taxiacimco-app/public/data/usuarios/[uid]
   */
  const syncUserProfile = async (authUser, additionalData = {}) => {
    if (!authUser) return;

    // Definición de la Ruta Sagrada
    const userRef = doc(
      db, 
      'artifacts', 'taxiacimco-app', 
      'public', 'data', 
      'usuarios', authUser.uid
    );
    
    try {
      const docSnap = await getDoc(userRef);
      
      if (!docSnap.exists()) {
        console.log("📝 [CIMCO] Creando nuevo perfil en la Ruta Sagrada...");
        
        const newUserData = {
          uid: authUser.uid,
          nombre: additionalData.nombre || authUser.displayName || 'Nuevo Usuario',
          email: authUser.email,
          telefono: additionalData.telefono || '',
          role: additionalData.rol || 'pasajero', // Por defecto pasajero
          saldoWallet: 0,
          estado: 'Activo',
          verificado: false,
          fechaRegistro: serverTimestamp(),
          ultimaConexion: serverTimestamp(),
          placa: additionalData.rol === 'conductor' ? (additionalData.placa || '') : null
        };

        await setDoc(userRef, newUserData);
        console.log("✅ [CIMCO] Documento creado con éxito.");
      } else {
        console.log("🔄 [CIMCO] El usuario ya existe, actualizando última conexión...");
        await setDoc(userRef, { ultimaConexion: serverTimestamp() }, { merge: true });
      }
    } catch (err) {
      console.error("❌ [CIMCO-ERROR] Fallo crítico en la Ruta Sagrada:", err);
      throw new Error("No se pudo registrar el perfil en la base de datos.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(""); 

    try {
      let userCredential;
      
      if (isRegister) {
        userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await syncUserProfile(userCredential.user, { 
          nombre: formData.nombre, 
          rol: formData.rol,
          telefono: formData.telefono 
        });
      } else {
        userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        // Si es login normal, actualizamos su última conexión
        await syncUserProfile(userCredential.user);
      }

      // 🔄 SINCRONIZACIÓN QUIRÚRGICA CON BACKEND
      const idToken = await userCredential.user.getIdToken();
      await syncUserWithBackend(idToken);

      navigate('/redirect');

    } catch (err) {
      console.error("🚨 Auth Error:", err.code);
      
      const errorMap = {
        'auth/invalid-credential': 'Las credenciales no coinciden. Revisa tu correo o contraseña.',
        'auth/user-not-found': 'Este usuario no existe en el sistema CIMCO.',
        'auth/wrong-password': 'Contraseña incorrecta.',
        'auth/unauthorized-domain': '⚠️ Dominio no autorizado. Verifica tu IP local.',
        'auth/network-request-failed': 'Error de red. ¿Tu celular tiene internet y alcanza la PC?'
      };

      setErrorMessage(errorMap[err.code] || "Error: Verifica tus credenciales o conexión.");
    } finally {
      setLoading(false);
    }
  };

  const loginGoogle = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      
      const idToken = await res.user.getIdToken();
      await syncUserProfile(res.user);
      await syncUserWithBackend(idToken); 
      
      navigate('/redirect');
    } catch (err) {
      setErrorMessage("Fallo la autenticación con Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-md z-10">
        <div className="bg-slate-900/80 backdrop-blur-2xl p-8 md:p-10 rounded-[3rem] border border-white/10 shadow-2xl">
          
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl mb-4 shadow-lg shadow-cyan-500/20">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-white leading-none">
              CIMCO<span className="text-cyan-500">AUTH</span>
            </h1>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 bg-red-500/10 border-l-4 border-red-500 rounded-r-xl flex items-start gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <p className="text-xs font-bold text-red-200 uppercase tracking-tight">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="text" placeholder="Nombre Completo" required
                    className="w-full bg-black/40 border border-white/5 p-4 pl-12 rounded-2xl text-sm focus:border-cyan-500/50 outline-none transition-all"
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  />
                </div>
                
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="tel" placeholder="Teléfono" required
                    className="w-full bg-black/40 border border-white/5 p-4 pl-12 rounded-2xl text-sm focus:border-cyan-500/50 outline-none transition-all"
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  />
                </div>

                <div className="relative">
                  <select 
                    className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-sm focus:border-cyan-500/50 outline-none transition-all appearance-none text-slate-300"
                    onChange={(e) => setFormData({...formData, rol: e.target.value})}
                    value={formData.rol}
                  >
                    <option value="pasajero">Pasajero</option>
                    <option value="conductor">Conductor</option>
                  </select>
                </div>
              </div>
            )}
            
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="email" placeholder="Correo Electrónico" required
                className="w-full bg-black/40 border border-white/5 p-4 pl-12 rounded-2xl text-sm focus:border-cyan-500/50 outline-none transition-all"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="password" placeholder="Contraseña" required
                className="w-full bg-black/40 border border-white/5 p-4 pl-12 rounded-2xl text-sm focus:border-cyan-500/50 outline-none transition-all"
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            <button 
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-4 rounded-2xl uppercase text-[11px] tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>{isRegister ? 'Crear Cuenta' : 'Ingresar'} <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div className="relative my-8 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <span className="relative bg-slate-900 px-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">o continuar con</span>
          </div>

          <button 
            type="button"
            onClick={loginGoogle}
            className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
          >
            <Chrome size={18} className="text-cyan-400" /> Google Account
          </button>

          <p className="mt-10 text-center text-[11px] text-slate-500 font-bold uppercase">
            {isRegister ? '¿Ya eres parte de CIMCO?' : '¿Aún no tienes cuenta?'} 
            <span 
              onClick={() => setIsRegister(!isRegister)} 
              className="text-cyan-500 font-black cursor-pointer ml-2 hover:underline italic transition-all"
            >
              {isRegister ? 'Inicia Sesión' : 'Regístrate'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;