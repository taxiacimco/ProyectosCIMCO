// Versión Arquitectura: V1.0 - Panel de Despacho Exclusivo Intermunicipal
import React, { useEffect, useState } from 'react';
import profileService from '../../../../functions/src/modules/users/services/profile.service'; // Ajustar según build

const HomeDespachador = ({ userProfile }) => {
  const [conductores, setConductores] = useState([]);

  // Simulamos la carga de conductores de SU COOPERATIVA
  useEffect(() => {
    // En producción, esto vendría de una Cloud Function filtrada por userProfile.fleetId
    const cargarFlota = async () => {
       // Lógica: Solo despacha a los de su fleetId
       console.log(`Despachando para la cooperativa: ${userProfile.fleetId}`);
    };
    cargarFlota();
  }, [userProfile]);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 font-mono text-white">
      <header className="border-b-4 border-yellow-400 mb-6 pb-2">
        <h1 className="text-2xl font-black uppercase">Despacho Intermunicipal</h1>
        <p className="text-xs text-yellow-400">Cooperativa ID: {userProfile.fleetId}</p>
      </header>

      <div className="space-y-4">
        <h3 className="text-sm font-bold bg-zinc-800 p-2 inline-block">CONDUCTORES EN TURNO</h3>
        
        {/* Lista de conductores de la flota */}
        <div className="grid gap-4">
          <div className="border-2 border-zinc-700 p-4 flex justify-between items-center bg-zinc-900 shadow-[4px_4px_0px_0px_#facc15]">
            <div>
              <p className="font-black">VEHÍCULO #204</p>
              <p className="text-[10px] text-zinc-500">CONDUCTOR: Juan Pérez</p>
            </div>
            <button className="bg-yellow-400 text-black px-4 py-2 font-black text-xs uppercase">
              Asignar Viaje
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeDespachador;