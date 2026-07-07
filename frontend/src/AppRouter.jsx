// Versión Arquitectura: V21.1 - Homologación de Importación de Módulo Mototaxi y Saneamiento de Dependencias Estáticas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\AppRouter.jsx
 * Misión: Orquestar el direccionamiento centralizado, inyectar puentes QR y blindar con autenticación basada en roles todas las vistas operativas.
 * UI Standard: CIMCO-UI V9.3 Pure Dark Glassmorphism (backdrop-blur-md, bg-[#121214]/80, border-white/5).
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 🛡️ Importaciones centralizadas con Alias Absolutos
import { useAuth } from '@/hooks/useAuth';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import Register from '@/pages/Register';
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
import HomeMotoparrillero from '@/pages/motoparrillero/HomeMotoparrillero';

// 🔄 AJUSTE TÉCNICO COMPARTIDO: Homologación de exportación por defecto de HomeMototaxi
import HomeMototaxi from '@/pages/mototaxi/HomeMototaxi';

// 🔄 Componente de Carga Unificado para Optimización DRY (Don't Repeat Yourself)
const RouterLoadingScreen = ({ mensaje }) => (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#121214]/90 backdrop-blur-md text-white border border-white/5 z-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-3 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
        <p className="text-[10px] uppercase tracking-widest text-cyan-400/80 font-mono animate-pulse">{mensaje}</p>
    </div>
);

// 🛡️ ADUANA UNIFICADA: Guard Perimetral con Matriz de Roles Integrada
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user, loading } = useAuth();
    
    if (loading) {
        return <RouterLoadingScreen mensaje="📡 Verificando Nivel de Autoridad..." />;
    }
    
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const userRole = (user?.rol || user?.role || '').toLowerCase().trim();
    
    // ⚡ Evaluación de privilegios administrativos de superusuario
    const isAdmin = userRole === 'admin' || user?.access_level === 99 || user?.level === 10 || userRole === 'gerente';
    if (isAdmin) return children;

    // Normalización de roles equivalentes de conductores de mototaxi
    const normalizedRole = (userRole === 'conductor' || userRole === 'moto') ? 'mototaxi' : userRole;

    if (allowedRoles.length > 0 && !allowedRoles.includes(normalizedRole)) {
        console.warn(`⚠️ [CIMCO-SECURITY] Acceso denegado. UID: ${user?.uid} | Rol Real: ${userRole} | Requerido: ${allowedRoles}`);
        return <Navigate to="/" replace />;
    }
    
    return children;
};

const AppRouter = () => {
    return (
        <Router>
            <Routes>
                {/* Rutas Públicas de Acceso y Recuperación */}
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                
                {/* Hub Central de Registro (Público) */}
                <Route path="/register" element={<Register />} />
                <Route path="/register-admin" element={<RegisterAdmin />} />
                <Route path="/register-pasajero" element={<RegisterPasajero />} />
                <Route path="/register-moto" element={<RegisterMoto />} />
                <Route path="/register-despachador" element={<RegisterDespachador />} />
                <Route path="/register-intermunicipal" element={<RegisterIntermunicipal />} />
                
                {/* 🛡️ RUTAS ADMINISTRATIVAS PROTEGIDAS */}
                <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'gerente']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/panel" element={<ProtectedRoute allowedRoles={['admin', 'gerente']}><AdminPanel /></ProtectedRoute>} />
                <Route path="/admin/qr" element={<ProtectedRoute allowedRoles={['admin', 'gerente']}><QrGenerator /></ProtectedRoute>} />
                
                {/* 🛡️ RUTAS PASAJERO PROTEGIDAS */}
                <Route path="/pasajero/home" element={<ProtectedRoute allowedRoles={['pasajero']}><HomePasajero /></ProtectedRoute>} />
                <Route path="/pasajero/perfil" element={<ProtectedRoute allowedRoles={['pasajero']}><PerfilPasajero /></ProtectedRoute>} />
                <Route path="/pasajero/historial" element={<ProtectedRoute allowedRoles={['pasajero']}><HistorialViajes /></ProtectedRoute>} />
                
                {/* 🛡️ RUTAS LOGÍSTICAS Y FLOTA PROTEGIDAS */}
                <Route path="/despachador/home" element={<ProtectedRoute allowedRoles={['despachador']}><HomeDespachador /></ProtectedRoute>} />
                <Route path="/intermunicipal/home" element={<ProtectedRoute allowedRoles={['intermunicipal']}><HomeIntermunicipal /></ProtectedRoute>} />
                <Route path="/motocarga/home" element={<ProtectedRoute allowedRoles={['motocarga']}><HomeMotocarga /></ProtectedRoute>} />
                <Route path="/motocarga/historial" element={<ProtectedRoute allowedRoles={['motocarga']}><HistorialViajes /></ProtectedRoute>} />
                <Route path="/mototaxi/home" element={<ProtectedRoute allowedRoles={['mototaxi']}><HomeMototaxi /></ProtectedRoute>} />
                <Route path="/motoparrillero/home" element={<ProtectedRoute allowedRoles={['motoparrillero']}><HomeMotoparrillero /></ProtectedRoute>} />
                
                {/* 🚀 PUENTES DE ENTRADA DIRECTA PARA CÓDIGOS QR (Redirecciones Dinámicas Privadas) */}
                <Route path="/mototaxi" element={<ProtectedRoute allowedRoles={['mototaxi']}><Navigate to="/mototaxi/home" replace /></ProtectedRoute>} />
                <Route path="/moto-parrillero" element={<ProtectedRoute allowedRoles={['motoparrillero']}><Navigate to="/motoparrillero/home" replace /></ProtectedRoute>} />
                <Route path="/motocarga" element={<ProtectedRoute allowedRoles={['motocarga']}><Navigate to="/motocarga/home" replace /></ProtectedRoute>} />
                <Route path="/pasajero" element={<ProtectedRoute allowedRoles={['pasajero']}><Navigate to="/pasajero/home" replace /></ProtectedRoute>} />
                <Route path="/despachador" element={<ProtectedRoute allowedRoles={['despachador']}><Navigate to="/despachador/home" replace /></ProtectedRoute>} />
                <Route path="/intermunicipal" element={<ProtectedRoute allowedRoles={['intermunicipal']}><Navigate to="/intermunicipal/home" replace /></ProtectedRoute>} />

                {/* Home Central y Catch-all */}
                <Route path="/" element={<RoleBasedRedirect />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
};

// 🔄 Componente de Redirección Dinámica Blindado V21.0
const RoleBasedRedirect = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <RouterLoadingScreen mensaje="📡 Resolviendo Matriz de Direccionamiento..." />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const rawRole = user?.rol || user?.role || 'pasajero';
    const userRole = rawRole.toLowerCase().trim();

    const roleRoutes = {
        'admin': '/admin/dashboard',
        'gerente': '/admin/dashboard',
        'pasajero': '/pasajero/home',
        'despachador': '/despachador/home',
        'intermunicipal': '/intermunicipal/home',
        'motocarga': '/motocarga/home',
        'mototaxi': '/mototaxi/home',
        'motoparrillero': '/motoparrillero/home',
        'conductor': '/mototaxi/home', 
        'moto': '/mototaxi/home'
    };

    const destinoSeguro = roleRoutes[userRole] || '/pasajero/home';

    return <Navigate to={destinoSeguro} replace />;
};

export default AppRouter;