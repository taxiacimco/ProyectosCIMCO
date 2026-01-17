import React, { useState } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { FaMoneyBillWave, FaTimes, FaCheckCircle } from 'react-icons/fa';
import Swal from 'sweetalert2'; // Asegúrate de tenerlo instalado: npm install sweetalert2

const ModalRecarga = ({ user, onClose }) => {
    const [monto, setMonto] = useState('');
    const [cargando, setCargando] = useState(false);

    const handleRecarga = async (e) => {
        e.preventDefault();
        if (!monto || monto <= 0) return;

        setCargando(true);
        try {
            const userRef = doc(db, "usuarios", user.id);
            
            // ✅ Actualizamos el saldo en Firestore usando increment
            await updateDoc(userRef, {
                saldoWallet: increment(Number(monto))
            });

            Swal.fire({
                title: '¡Recarga Exitosa!',
                text: `Se han abonado $${monto} a la cuenta de ${user.nombre}`,
                icon: 'success',
                confirmButtonColor: '#06b6d4',
            });

            onClose(); // Cerramos el modal
        } catch (error) {
            console.error("Error al recargar:", error);
            Swal.fire('Error', 'No se pudo procesar la recarga', 'error');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                
                {/* Cabecera */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-cyan-500/10 to-transparent">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <FaMoneyBillWave className="text-cyan-400" /> Recargar Saldo
                        </h3>
                        <p className="text-slate-400 text-xs">Gestionando cuenta de: {user.nombre}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleRecarga} className="p-8 space-y-6">
                    <div>
                        <label className="block text-slate-400 text-sm font-medium mb-2">Monto de la Recarga ($)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500 font-bold">$</span>
                            <input 
                                autoFocus
                                type="number" 
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                                placeholder="Ej: 50000"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-10 pr-4 text-white text-2xl font-bold focus:outline-none focus:border-cyan-500 transition-all placeholder:text-slate-700"
                                required
                            />
                        </div>
                    </div>

                    <div className="bg-cyan-500/5 border border-cyan-500/20 p-4 rounded-xl">
                        <p className="text-cyan-400 text-xs flex items-center gap-2">
                            <FaCheckCircle /> El saldo se actualizará inmediatamente en la App del conductor.
                        </p>
                    </div>

                    <button 
                        type="submit"
                        disabled={cargando}
                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 ${
                            cargando ? 'bg-slate-700 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500 active:scale-95'
                        }`}
                    >
                        {cargando ? 'Procesando...' : 'Confirmar Recarga'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ModalRecarga;