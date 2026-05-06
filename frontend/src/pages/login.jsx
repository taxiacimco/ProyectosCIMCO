import React, { useState } from 'react';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword
} from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck, ArrowRight, Terminal } from 'lucide-react';

const auth = getAuth();
const db = getFirestore();

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });

  // Bypass para agilizar pruebas en entorno local de CIMCO
  const handleBypass = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, "admin@test.com", "123456");
      navigate('/redirect');
    } catch (e) {
      console.error("Error en bypass: Asegúrate de tener el usuario en el Emulator Suite.");
    } finally { setLoading(false); }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        const res = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await setDoc(doc(db, "usuarios", res.user.uid), {
          uid: res.user.uid,
          email: res.user.email,
          name: formData.name,
          role: 'pasajero',
          balance: 0,
          createdAt: serverTimestamp()
        });
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      }
      navigate('/redirect');
    } catch (error) {
      alert("Error: " + error.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 font-sans text-zinc-100">
      <div className="w-full max-w-md bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-3xl p-10 shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-5">
            <ShieldCheck className="text-blue-400" size={32} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">TAXIA <span className="text-blue-500">CIMCO</span></h1>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {isRegister && (
            <input 
              type="text" placeholder="Nombre" required
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-blue-500/50 transition-all"
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          )}
          <input 
            type="email" placeholder="Email" required
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-blue-500/50 transition-all"
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
          <input 
            type="password" placeholder="Contraseña" required
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-blue-500/50 transition-all"
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
          <button className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <>{isRegister ? 'Crear Cuenta' : 'Entrar'} <ArrowRight size={16} /></>}
          </button>
        </form>

        {import.meta.env.MODE === 'development' && (
          <button onClick={handleBypass} className="w-full mt-4 bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 py-3 rounded-xl text-xs flex items-center justify-center gap-2">
            <Terminal size={14} /> Bypass Dev Mode
          </button>
        )}
      </div>
    </div>
  );
};

export default Login;