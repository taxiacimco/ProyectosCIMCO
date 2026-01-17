import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { 
    FaMotorcycle, FaTruckLoading, FaUserTie, FaUserFriends, 
    FaMapMarkedAlt, FaCircle, FaPlusCircle, FaLock, FaUnlock 
} from 'react-icons/fa';
import Swal from 'sweetalert2';

const SidebarUsuarios = ({ onSelectUser, onRechargeUser }) => {
    const [usuarios, setUsuarios] = useState([]);

    // ✅ LÓGICA DE BLOQUEO MANUAL
    const toggleBloqueo = async (e, usuario) => {
        e.stopPropagation();
        const nuevoEstado = usuario.bloqueado ? false : true;
        
        const result = await Swal.fire({
            title: nuevoEstado ? '¿Bloquear Conductor?' : '¿Activar Conductor?',
            text: `El usuario ${usuario.nombre} ${nuevoEstado ? 'no podrá recibir viajes' : 'podrá operar normalmente'}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: nuevoEstado ? '#ef4444' : '#22c55e',
            confirmButtonText: 'Sí, confirmar'
        });

        if (result.isConfirmed) {
            await updateDoc(doc(db, "usuarios", usuario.id), {
                bloqueado: nuevoEstado
            });
        }
    };

    useEffect(() => {
        const rolesInteres = ["mototaxi", "motoparrillero", "motocarga", "despachador", "conductorinter", "pasajeros"];
        const q = query(collection(db, "usuarios"), where("rol", "in", rolesInteres));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lista = snapshot.docs.map(doc => {
                const data = doc.data();
                const id = doc.id;
                
                // 🚨 AUTO-BLOQUEO POR SALDO NEGATIVO (-5000)
                if (data.saldoWallet <= -5000 && !data.bloqueado) {
                    updateDoc(doc(db, "usuarios", id), { bloqueado: true });
                }

                return { id, ...data };
            });
            setUsuarios(lista);
        });

        return () => unsubscribe();
    }, []);

    const getRoleConfig = (rol) => {
        switch(rol) {
            case 'mototaxi': return { icon: <FaMotorcycle />, color: 'text-cyan-400', label: 'MotoTaxi' };
            case 'motoparrillero': return { icon: <FaMotorcycle />, color: 'text-orange-400', label: 'Parrillero' };
            case 'motocarga': return { icon: <FaTruckLoading />, color: 'text-yellow-500', label: 'MotoCarga' };
            case 'despachador': return { icon: <FaUserTie />, color: 'text-purple-400', label: 'Despachador' };
            case 'conductorinter': return { icon: <FaMapMarkedAlt />, color: 'text-emerald-400', label: 'Intermunicipal' };
            case 'pasajeros': return { icon: <FaUserFriends />, color: 'text-pink-400', label: 'Pasajero' };
            default: return { icon: <FaCircle />, color: 'text-slate-400', label: rol };
        }
    };

    return (
        <div className="bg-slate-900/50 rounded-3xl border border-slate-800 h-[500px] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                    👥 Personal Operativo ({usuarios.length})
                </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {usuarios.map((u) => {
                    const config = getRoleConfig(u.rol);
                    const esCritico = u.saldoWallet <= -4000;
                    const esBloqueado = u.bloqueado;

                    return (
                        <div 
                            key={u.id} 
                            className={`p-3 rounded-xl border transition-all group flex items-center gap-3 ${
                                esBloqueado ? 'bg-red-950/20 border-red-900/50 opacity-80' : 'bg-slate-800/40 border-slate-700/50 hover:border-cyan-500/30'
                            }`}
                        >
                            {/* INFO CONDUCTOR */}
                            <div onClick={() => onSelectUser(u)} className="flex items-center gap-3 flex-1 cursor-pointer">
                                <div className={`p-2 rounded-lg bg-slate-900 ${config.color} ${esBloqueado ? 'grayscale' : ''}`}>
                                    {config.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${esBloqueado ? 'text-red-400' : 'text-white'}`}>
                                        {u.nombre || 'Sin nombre'}
                                    </p>
                                    <div className="flex items-center gap-2 text-[9px] font-bold">
                                        <span className={config.color}>{config.label}</span>
                                        {esCritico && <span className="text-red-500 animate-pulse">⚠️ SALDO CRÍTICO</span>}
                                    </div>
                                </div>
                            </div>

                            {/* ACCIONES: BILLETERA Y BLOQUEO */}
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onRechargeUser(u); }}
                                    className="flex flex-col items-end hover:bg-slate-700/50 p-1 rounded-lg transition-colors"
                                >
                                    <span className={`text-[10px] font-bold ${u.saldoWallet < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        ${u.saldoWallet?.toLocaleString() || 0}
                                    </span>
                                    <span className="text-[8px] text-slate-500 flex items-center gap-1 uppercase"><FaPlusCircle/> Recargar</span>
                                </button>

                                <button 
                                    onClick={(e) => toggleBloqueo(e, u)}
                                    className={`p-2 rounded-lg transition-colors ${
                                        esBloqueado ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
                                    }`}
                                    title={esBloqueado ? "Desbloquear" : "Bloquear"}
                                >
                                    {esBloqueado ? <FaLock size={12}/> : <FaUnlock size={12}/>}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SidebarUsuarios;