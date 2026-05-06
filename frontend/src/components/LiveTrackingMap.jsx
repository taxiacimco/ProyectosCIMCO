// Versión Arquitectura: V4.2 - Mapa con Filtrado de Capas por Tipo de Servicio
/**
 * frontend/src/components/LiveTrackingMap.jsx
 */
import React, { useEffect, useState, useRef, memo } from 'react';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { Navigation, Loader2 } from 'lucide-react';

const LiveTrackingMap = ({ 
  modo = "pasajero", 
  tipoServicioSeleccionado = "mototaxi",
  conductores = [], 
  height = "400px" 
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  // Configuración de iconos por servicio
  const icons = {
    mototaxi: 'https://cdn-icons-png.flaticon.com/512/1048/1048314.png',
    intermunicipal: 'https://cdn-icons-png.flaticon.com/512/2898/2898588.png',
    motocarga: 'https://cdn-icons-png.flaticon.com/512/411/411763.png'
  };

  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = window.L.map(mapContainerRef.current, { zoomControl: false }).setView([9.3025, -73.3245], 16);
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapInstanceRef.current);
    }

    const L = window.L;

    // 🧹 Limpieza de marcadores antiguos para el filtrado reactivo
    Object.keys(markersRef.current).forEach(id => {
      mapInstanceRef.current.removeLayer(markersRef.current[id]);
      delete markersRef.current[id];
    });

    // 📍 Renderizado de conductores FILTRADOS
    conductores
      .filter(c => c.serviceType === tipoServicioSeleccionado)
      .forEach(cond => {
        const iconUrl = icons[cond.serviceType] || icons.mototaxi;
        const customIcon = L.icon({ iconUrl, iconSize: [35, 35], iconAnchor: [17, 17] });
        
        markersRef.current[cond.id] = L.marker([cond.lat, cond.lng], { icon: customIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`<b class="uppercase text-[10px]">${cond.nombre}</b>`);
      });

  }, [mapLoaded, conductores, tipoServicioSeleccionado]);

  return (
    <div style={{ height }} className="w-full rounded-[2.5rem] overflow-hidden relative bg-slate-900 border border-white/10">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute bottom-4 left-6 z-[1000] opacity-40 pointer-events-none text-white text-[9px] font-black uppercase italic">
        CIMCO <span className="text-cyan-500">Radar: {tipoServicioSeleccionado}</span>
      </div>
    </div>
  );
};

export default memo(LiveTrackingMap);