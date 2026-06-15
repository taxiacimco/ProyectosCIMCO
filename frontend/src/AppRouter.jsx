// Versión Arquitectura: V19.8 - Blindaje Anti-Undefined, Redirección Dinámica y ACL Híbrido
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\AppRouter.jsx
 * Misión: Orquestar el direccionamiento centralizado con alias absolutos y aduanas perimetrales.
 * Ajuste: Inyección de guardas seguras tolerantes a fallos para validación de roles de Administrador.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 🛡️ Importaciones centralizadas con Alias Absolutos para estabilidad del Grafo Vite
import { useAuth } from '@/hooks/useAuth';
import Login from '@/pages/Login';
import RegisterAdmin from '@/pages/RegisterAdmin';
import RegisterPasajero from '@/pages/RegisterPasajero';
import RegisterMoto from '@/pages/RegisterMoto';
import RegisterDespachador from '@/pages/RegisterDespachador';
import RegisterIntermunicipal from '@/pages/RegisterIntermunicipal';

// Módulo Administrativo
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminPanel from '@/pages/admin/AdminPanel';
import QrGenerator from '@/pages/admin/QrGenerator';

// Módulo Pasajero
import HomePasajero from '@/pages/pasajero/HomePasajero';
import PerfilPasajero from '@/pages/pasajero/PerfilPasajero';
import HistorialViajes from '@/pages/pasajero/HistorialViajes';

// Módulos Logísticos y Flota
import HomeDespachador from '@/pages/despachador/HomeDespachador';
import HomeIntermunicipal from '@/pages/intermunicipal/HomeIntermunicipal';
import HomeMotocarga from '@/pages/motocarga/HomeMotocarga';
import HistorialMotocarga from '@/pages/motocarga/HistorialMotocarga';
import HomeMototaxi from '@/pages/mototaxi/HomeMototaxi';
import HomeMotoparrillero from '@/pages/motoparrillero/HomeMotoparrillero';

// 🛡️ COMPONENTE DE ADUANA (Guard Perimetral Ajustado)
// Bloquea el acceso a cualquier entidad que no posea el nivel de autoridad correspondiente.
const AdminRoute = ({ children }) => {
    // 🛡️ Fusión Atómica: Se extrae 'loading' para evitar evaluaciones prematuras
    const { user, loading } = useAuth();
    
    // 🛡️ GUARDA DE TRANSICIÓN ASÍNCRONA: Detiene la evaluación táctica mientras el AuthProvider recupera la sesión
    if (loading) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#121214]/80 backdrop-blur-md text-white border border-white/5 z-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-3 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
                <p className="text-[10px] uppercase tracking-widest text-cyan-400/80 font-mono animate-pulse">📡 Sincronizando Credenciales de Comando...</p>
            </div>
        );
    }
    
    // 🛡️ Extracción Segura de Rol: Tolerancia a fallos si falta access_level 99
    const userRole = user?.rol || user?.role;
    const isAdmin = userRole === 'admin' || user?.access_level === 99;

    // Guarda Anti-Undefined y validación estricta unificada (Control de Lista de Acceso)
    if (!user || !isAdmin) {
        console.warn(`⚠️ [CIMCO-SECURITY] Acceso denegado a ruta administrativa. Nivel insuficiente o Rol incorrecto: ${userRole}`);
        return <Navigate to="/" replace />;
    }
    
    return children;
};

const AppRouter = () => {
    return (
        <Router>
            <Routes>
                {/* Rutas Públicas de Acceso */}
                <Route path="/login" element={<Login />} />
                <Route path="/register-admin" element={<RegisterAdmin />} />
                <Route path="/register-pasajero" element={<RegisterPasajero />} />
                <Route path="/register-moto" element={<RegisterMoto />} />
                <Route path="/register-despachador" element={<RegisterDespachador />} />
                <Route path="/register-intermunicipal" element={<RegisterIntermunicipal />} />
                
                {/* 🛡️ RUTAS ADMINISTRATIVAS PROTEGIDAS (Requieren Nivel Admin) */}
                <Route path="/admin/dashboard" element={
                    <AdminRoute>
                        <AdminDashboard />
                    </AdminRoute>
                } />
                <Route path="/admin/panel" element={
                    <AdminRoute>
                        <AdminPanel />
                    </AdminRoute>
                } />
                <Route path="/admin/qr" element={
                    <AdminRoute>
                        <QrGenerator />
                    </AdminRoute>
                } />
                
                {/* Rutas Pasajero */}
                <Route path="/pasajero/home" element={<HomePasajero />} />
                <Route path="/pasajero/perfil" element={<PerfilPasajero />} />
                <Route path="/pasajero/historial" element={<HistorialViajes />} />
                
                {/* Rutas Logísticas y Flota */}
                <Route path="/despachador/home" element={<HomeDespachador />} />
                <Route path="/intermunicipal/home" element={<HomeIntermunicipal />} />
                <Route path="/motocarga/home" element={<HomeMotocarga />} />
                <Route path="/motocarga/historial" element={<HistorialMotocarga />} />
                <Route path="/mototaxi/home" element={<HomeMototaxi />} />
                <Route path="/motoparrillero/home" element={<HomeMotoparrillero />} />
                
                {/* Home Central y Catch-all */}
                <Route path="/" element={<RoleBasedRedirect />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
};

// 🔄 Componente de Redirección Dinámica: Protección contra estados nulos
const RoleBasedRedirect = () => {
    // 🛡️ Fusión Atómica: Se extrae 'loading'
    const { user, loading } = useAuth();

    // 🛡️ GUARDA DE TRANSICIÓN ASÍNCRONA: Evita redirecciones erróneas a /login durante arranques en frío
    if (loading) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#121214]/80 backdrop-blur-md text-white border border-white/5 z-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-3 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
                <p className="text-[10px] uppercase tracking-widest text-cyan-400/80 font-mono animate-pulse">📡 Resolviendo Matriz de Direccionamiento...</p>
            </div>
        );
    }

    // 🛡️ Guarda de Seguridad Interna (Anti-Undefined)
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 🛡️ Extracción Segura: Tolerancia a variaciones en la nomenclatura del backend
    const userRole = user?.rol || user?.role || 'pasajero';

    // Indexación de rutas por rol operativo
    const roleRoutes = {
        'admin': '/admin/dashboard',
        'pasajero': '/pasajero/home',
        'despachador': '/despachador/home',
        'intermunicipal': '/intermunicipal/home',
        'motocarga': '/motocarga/home',
        'mototaxi': '/mototaxi/home',
        'motoparrillero': '/motoparrillero/home'
    };

    return <Navigate to={roleRoutes[userRole] || '/login'} replace />;
};

export default AppRouter;