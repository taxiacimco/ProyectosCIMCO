// Versión Arquitectura: V16.1 - Enrutamiento Sincronizado para UX V9.4
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\AppRouter.jsx
 * Misión: Orquestar el direccionamiento limpio del tráfico según rol.
 * Integridad: Fusión Atómica con useAuth V16.0 y sincronización de ruta /recuperar.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 🛡️ VERIFICACIÓN ATÓMICA: Importación única desde el punto central de verdad
import { useAuth } from './hooks/useAuth';

// Páginas Operativas
import HomePasajero from './pages/pasajero/HomePasajero';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPanel from './pages/admin/AdminPanel'; 
import QrGenerator from './pages/admin/QrGenerator';

// Pasarelas Segmentadas
import RegisterPasajero from './pages/RegisterPasajero';
import RegisterDespachador from './pages/RegisterDespachador';
import RegisterMoto from './pages/RegisterMoto';
import ForgotPassword from './pages/ForgotPassword';

/**
 * 🛡️ HOC GUARDIÁN DE SEGURIDAD OPERACIONAL (RutaProtegidaAdmin)
 * Aplica la "Guarda de Seguridad" anti-undefined antes de validar roles.
 */
const RutaProtegidaAdmin = ({ children }) => {
    const auth = useAuth();
    
    // Si el contexto está nulo o no hay usuario, redirección de seguridad
    if (!auth || !auth.user) return <Navigate to="/login" replace />;
    
    // Verificación de privilegios jerárquicos
    if (auth.user.rol !== 'admin' && auth.user.rol !== 'despachador') return <Navigate to="/" replace />;
    
    return children;
};

export const AppRouter = () => {
    const auth = useAuth();
    
    // 🛡️ MATRIZ DE REDIRECCIÓN INTELIGENTE (Anti-Crash)
    const obtenerDestinoUsuario = () => {
        // Manejo de carga de sesión
        if (auth && auth.loading) return <div className="flex h-screen w-full items-center justify-center bg-[#09090b] text-zinc-500 font-mono text-[10px] tracking-widest">CARGANDO NODO...</div>;
        
        // Si no hay usuario, login forzado
        if (!auth || !auth.user) return <Login />;
        
        // Direccionamiento según el rol detectado en la matriz de identidades
        if (auth.user.rol === 'admin' || auth.user.rol === 'despachador') return <AdminDashboard />;
        
        // Retorno a consola civil por defecto
        return <HomePasajero />;
    };

    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
                {/* 🚀 Pasarelas Abiertas */}
                <Route path="/login" element={<Login />} />
                
                {/* 🔄 AQUI EL CAMBIO: Ruta sincronizada con el botón del Login */}
                <Route path="/recuperar" element={<ForgotPassword />} />

                {/* 📝 Registros Transaccionales Unificados */}
                <Route path="/register" element={<RegisterPasajero />} />
                <Route path="/register/despachador" element={<RegisterDespachador />} />
                <Route path="/register/moto" element={<RegisterMoto />} />

                {/* 🎛️ Suite Administrativa Protegida */}
                <Route path="/qr" element={<QrGenerator />} />
                <Route path="/admin" element={<RutaProtegidaAdmin><AdminDashboard /></RutaProtegidaAdmin>} />
                <Route path="/admin/panel" element={<RutaProtegidaAdmin><AdminPanel /></RutaProtegidaAdmin>} />
                <Route path="/admin/tesoreria" element={<RutaProtegidaAdmin><AdminPanel /></RutaProtegidaAdmin>} />
                
                {/* 🏠 Home Central - Redirección Inteligente Operativa */}
                <Route path="/" element={obtenerDestinoUsuario()} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
};

export default AppRouter;