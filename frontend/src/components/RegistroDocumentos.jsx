import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, doc, updateDoc, serverTimestamp, setDoc 
} from 'firebase/firestore';
import { 
  getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken 
} from 'firebase/auth';
import { 
  ShieldCheck, FileText, Camera, 
  Send, CheckCircle2, Loader2, UploadCloud,
  X, AlertCircle, Info, Car, Bike, Package, Users,
  CheckCircle, Zap
} from 'lucide-react';

// --- CONFIGURACIÓN ESTRATÉGICA ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'taxiacimco-app';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Tipo, 2: Datos/Fotos, 3: Finalizado
  const [uploadStatus, setUploadStatus] = useState("");
  const [error, setError] = useState("");

  const [unidad, setUnidad] = useState({
    tipo: 'Carro', // Carro, MotoParrillero, MotoTaxi, Motocarga
    placa: '',
    marca: '',
    modelo: '',
    soatVence: '',
    cedula: ''
  });

  const [photos, setPhotos] = useState({
    frontal: null,
    lateral: null,
    documento: null,
    licencia: null,
    soat: null
  });

  // --- PROTOCOLO DE AUTENTICACIÓN ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Fail:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- LÓGICA DE CAPTURA VISUAL ---
  const handleImage = (e, key) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadStatus(`Procesando ${key}...`);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotos(prev => ({ ...prev, [key]: reader.result }));
      setUploadStatus("");
    };
    reader.readAsDataURL(file);
  };

  // --- ENVÍO A CENTRAL CIMCO ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return setError("Identidad no validada");
    
    // Validación de campos críticos
    if (!unidad.placa || !photos.documento || !photos.licencia) {
      return setError("Faltan documentos obligatorios o placa");
    }

    setLoading(true);
    setError("");

    try {
      const timestamp = new Date().getTime();
      const registroPath = doc(db, 'artifacts', appId, 'public', 'data', 'registros_unidades', `${unidad.placa}_${user.uid}`);
      const userPath = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid);

      const payload = {
        metadata: {
          uid: user.uid,
          fecha: serverTimestamp(),
          appSource: 'CIMCO_DRIVER_V3',
          tipoUnidad: unidad.tipo
        },
        tecnico: { ...unidad },
        evidencia: { ...photos },
        status: 'PENDIENTE_AUDITORIA'
      };

      // Guardar registro de unidad
      await setDoc(registroPath, payload);

      // Actualizar estado del conductor
      await updateDoc(userPath, {
        unidadActiva: unidad.placa,
        tipoServicio: unidad.tipo,
        estadoOperativo: 'EN_VALIDACION',
        ultimoRegistro: serverTimestamp()
      });

      setStep(3);
    } catch (err) {
      console.error(err);
      setError("Error crítico de sincronización con la central.");
    } finally {
      setLoading(false);
    }
  };

  const SelectorTipo = ({ id, label, icon: Icon, color }) => (
    <button 
      onClick={() => setUnidad({...unidad, tipo: id})}
      className={`relative p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 ${unidad.tipo === id ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/5 bg-slate-900/40 text-slate-500'}`}
    >
      <div className={`p-4 rounded-2xl ${unidad.tipo === id ? 'bg-yellow-400 text-black' : 'bg-slate-800'}`}>
        <Icon size={28} />
      </div>
      <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
      {unidad.tipo === id && <Zap size={14} className="absolute top-4 right-4 text-yellow-400 animate-pulse" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#050810] text-slate-200 font-sans selection:bg-yellow-400 selection:text-black">
      
      {/* HEADER DE SEGURIDAD */}
      <div className="w-full max-w-md mx-auto px-6 pt-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">CIMCO Cloud Sync</span>
            </div>
            <h1 className="text-3xl font-black italic uppercase text-white leading-none">Gestión de <span className="text-yellow-400">Unidades</span></h1>
          </div>
          <div className="w-12 h-12 bg-slate-900 rounded-2xl border border-white/5 flex items-center justify-center">
            <ShieldCheck className="text-yellow-400" size={24} />
          </div>
        </div>

        {uploadStatus && (
          <div className="mb-6 p-4 bg-yellow-400 text-black rounded-2xl font-black text-[10px] uppercase flex items-center gap-3 animate-pulse">
            <Loader2 size={16} className="animate-spin" /> {uploadStatus}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-rose-500/20 border border-rose-500/40 text-rose-400 rounded-2xl font-bold text-xs flex items-center gap-3">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* --- PASO 1: SELECTOR UNIVERSAL --- */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-slate-500 text-sm mb-6 font-medium">Seleccione el tipo de unidad operativa que desea registrar en el sistema:</p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <SelectorTipo id="Carro" label="Automóvil" icon={Car} />
              <SelectorTipo id="MotoParrillero" label="Moto Parrilla" icon={Bike} />
              <SelectorTipo id="MotoTaxi" label="Moto Taxi" icon={Users} />
              <SelectorTipo id="Motocarga" label="Moto Carga" icon={Package} />
            </div>
            <button 
              onClick={() => setStep(2)}
              className="w-full py-6 bg-white text-black rounded-[2rem] font-black uppercase italic tracking-widest hover:bg-yellow-400 transition-all active:scale-95 shadow-xl shadow-white/5"
            >
              Configurar Unidad
            </button>
          </div>
        )}

        {/* --- PASO 2: DOCUMENTACIÓN Y EVIDENCIA --- */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
            <div className="flex items-center gap-4 mb-8">
               <button onClick={() => setStep(1)} className="p-3 bg-slate-900 rounded-xl text-slate-400"><X size={20}/></button>
               <div>
                 <h3 className="font-black uppercase text-xs text-white">Ficha Técnica: {unidad.tipo}</h3>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Complete los datos de la placa {unidad.placa || '---'}</p>
               </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900/60 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic tracking-[0.2em]">Placa de la Unidad</label>
                    <input 
                      type="text" 
                      placeholder="XXX-000" 
                      className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xl font-black text-white uppercase mt-1 outline-none focus:border-yellow-400"
                      value={unidad.placa}
                      onChange={e => setUnidad({...unidad, placa: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Cédula Titular</label>
                    <input type="number" placeholder="..." className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-bold mt-1 outline-none" onChange={e => setUnidad({...unidad, cedula: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">SOAT Vence</label>
                    <input type="date" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-bold mt-1 outline-none" onChange={e => setUnidad({...unidad, soatVence: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 p-6 rounded-[2.5rem] border border-white/5">
                 <h4 className="text-[10px] font-black uppercase text-slate-400 mb-6 flex items-center gap-2">
                   <Camera size={14} className="text-yellow-400" /> Evidencia Visual Obligatoria
                 </h4>
                 
                 <div className="space-y-4">
                    {[
                      {id: 'documento', label: 'Cédula (Frente)', icon: FileText},
                      {id: 'licencia', label: 'Licencia de Conducir', icon: ShieldCheck},
                      {id: 'soat', label: 'Documento SOAT', icon: UploadCloud},
                      {id: 'frontal', label: `Foto Frontal ${unidad.tipo}`, icon: Camera}
                    ].map(item => (
                      <label key={item.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${photos[item.id] ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400' : 'border-white/5 bg-black/20 text-slate-500'}`}>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleImage(e, item.id)} />
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${photos[item.id] ? 'bg-emerald-500 text-black' : 'bg-slate-800'}`}>
                          {photos[item.id] ? <CheckCircle size={18} /> : <item.icon size={18} />}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
                        {photos[item.id] && <div className="ml-auto w-8 h-8 rounded-lg overflow-hidden border border-emerald-500/30"><img src={photos[item.id]} className="w-full h-full object-cover" /></div>}
                      </label>
                    ))}
                 </div>

                 <button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full mt-8 bg-yellow-400 text-black py-6 rounded-[2rem] font-black uppercase italic flex items-center justify-center gap-3 shadow-2xl shadow-yellow-400/20 active:scale-95 transition-all"
                 >
                   {loading ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Enviar a Validación</>}
                 </button>
              </div>
            </div>
          </div>
        )}

        {/* --- PASO 3: ÉXITO --- */}
        {step === 3 && (
          <div className="animate-in zoom-in duration-500 flex flex-col items-center text-center py-10">
            <div className="w-24 h-24 bg-emerald-500 text-black rounded-[2rem] flex items-center justify-center mb-8 rotate-12 shadow-2xl shadow-emerald-500/20">
              <CheckCircle size={48} />
            </div>
            <h2 className="text-4xl font-black italic uppercase leading-tight mb-4 text-white">Registro <span className="text-emerald-400">Exitoso</span></h2>
            <p className="text-slate-500 text-sm max-w-xs mb-10 font-medium">Su unidad <span className="text-white font-bold">{unidad.placa}</span> ha sido ingresada al sistema de auditoría CIMCO. En máximo 24h recibirá respuesta.</p>
            
            <div className="w-full p-6 bg-slate-900/50 rounded-[2rem] border border-white/5 space-y-3 mb-8 text-left">
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span className="text-slate-600">ID Operación</span>
                <span className="text-slate-400">#{(Math.random() * 10000).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span className="text-slate-600">Tipo Unidad</span>
                <span className="text-yellow-400">{unidad.tipo}</span>
              </div>
            </div>

            <button onClick={() => window.location.reload()} className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 hover:text-white transition-colors">Finalizar Sesión</button>
          </div>
        )}

      </div>

      <footer className="fixed bottom-0 w-full p-6 bg-gradient-to-t from-[#050810] to-transparent pointer-events-none">
        <div className="max-w-md mx-auto flex justify-between items-center opacity-30">
          <p className="text-[8px] font-black uppercase tracking-widest">CIMCO Security Protocol</p>
          <p className="text-[8px] font-black uppercase tracking-widest">2026 ©</p>
        </div>
      </footer>
    </div>
  );
};

export default App;