// Versión Arquitectura: V21.5 - Code Splitting con Lazy Loading y Módulos Protegidos CIMCO-UI V9.3
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\AppRouter.jsx
 * Misión: Orquestar el direccionamiento centralizado, inyectar puentes QR, blindar con autenticación basada en roles 
 *         y aplicar Carga Diferida (Lazy Loading) a módulos administrativos y de desarrollo para optimizar el bundle.
 * UI Standard: CIMCO-UI V9.3 Pure Dark Glassmorphism (backdrop-blur-md, bg-[#121214]/80, border-white/5).
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 🛡️ Importaciones de Contexto y Hooks
import { useAuth } from '@/hooks/useAuth';

// 📄 Componentes Core Públicos (Carga Directa para Fast First Load)
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import Register from '@/pages/Register';
import RegisterPasajero from '@/pages/RegisterPasajero';
import RegisterMoto from '@/pages/RegisterMoto';
import RegisterDespachador from '@/pages/RegisterDespachador';
import RegisterIntermunicipal from '@/pages/RegisterIntermunicipal';

// ⚡ CARGA DIFERIDA (Lazy Loading) - Excluidos del Bundle Principal de Producción
const RegisterAdmin = lazy(() => import('@/pages/RegisterAdmin'));

// 📊 Módulo Administrativo y de Control (Lazy Loaded)
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminPanel = lazy(() => import('@/pages/admin/AdminPanel'));
const QrGenerator = lazy(() => import('@/pages/admin/QrGenerator'));

// 👤 Módulo de Pasajeros (Lazy Loaded)
const HomePasajero = lazy(() => import('@/pages/pasajero/HomePasajero'));
const PerfilPasajero = lazy(() => import('@/pages/pasajero/PerfilPasajero'));
const HistorialViajes = lazy(() => import('@/pages/pasajero/HistorialViajes'));

// 🚚 Módulos de Operación Logística, Despacho y Flota (Lazy Loaded)
const HomeDespachador = lazy(() => import('@/pages/despachador/HomeDespachador'));
const HomeIntermunicipal = lazy(() => import('@/pages/intermunicipal/HomeIntermunicipal'));
const HomeMotocarga = lazy(() => import('@/pages/motocarga/HomeMotocarga'));
const HistorialMotocarga = lazy(() => import('@/pages/motocarga/HistorialMotocarga'));
const HomeMotoparrillero = lazy(() => import('@/pages/motoparrillero/HomeMotoparrillero'));
const HomeMototaxi = lazy(() => import('@/pages/mototaxi/HomeMototaxi'));

// 🔄 Componente de Carga Unificado de Pantalla de Transición (CIMCO-UI Standard)
const RouterLoadingScreen = ({ mensaje }) => (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#121214]/90 backdrop-blur-md text-white border border-white/5 z-50 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-3 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
        <p className="text-[10px] uppercase tracking-widest text-cyan-400/80 font-mono animate-pulse">
            {mensaje || 'SINCRO_NODO...'}
        </p>
    </div>
);

// 🛡️ ADUANA UNIFICADA: Componente Guard de Rutas Protegidas sin fugas de Props al DOM
export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user, loading } = useAuth();
    
    if (loading) {
        return <RouterLoadingScreen mensaje="📡 Verificando Nivel de Autoridad..." />;
    }
    
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 🛡️ Saneamiento preventivo de roles para evitar desbordamiento por nulidad
    const userRole = (user?.rol || user?.role || '').toLowerCase().trim();
    
    // ⚡ Evaluación y bypass para privilegios administrativos (Superusuario / CEO)
    const isAdmin = userRole === 'admin' || user?.access_level === 99 || user?.level === 10 || userRole === 'gerente';
    if (isAdmin) {
        return children;
    }

    // Normalización interna de roles equivalentes de conductores de mototaxi
    const normalizedRole = (userRole === 'conductor' || userRole === 'moto') ? 'mototaxi' : userRole;

    // Normalización de la matriz de roles permitidos
    const safeAllowedRoles = Array.isArray(allowedRoles)
        ? allowedRoles.map(role => role?.trim()?.toLowerCase())
        : [];

    if (safeAllowedRoles.length > 0 && !safeAllowedRoles.includes(normalizedRole)) {
        console.warn(`⚠️ [CIMCO-SECURITY] Acceso denegado. UID: ${user?.uid || 'DESCONOCIDO'} | Rol Real: ${userRole} | Requerido: ${allowedRoles}`);
        return <Navigate to="/" replace />;
    }
    
    return children ? <>{children}</> : null;
};

const AppRouter = () => {
    return (
        <Router>
            <Suspense fallback={<RouterLoadingScreen mensaje="CARGANDO_NODO_LOGICO..." />}>
                <Routes>
                    {/* Rutas Públicas de Acceso y Recuperación */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    
                    {/* Hub Central de Registro (Público) */}
                    <Route path="/register" element={<Register />} />
                    <Route path="/register-pasajero" element={<RegisterPasajero />} />
                    <Route path="/register-moto" element={<RegisterMoto />} />
                    <Route path="/register-despachador" element={<RegisterDespachador />} />
                    <Route path="/register-intermunicipal" element={<RegisterIntermunicipal />} />
                    
                    {/* ⚡ RUTA RESTRINGIDA DE DESARROLLO (Lazy Loaded) */}
                    <Route 
                        path="/register-admin" 
                        element={
                            <Suspense fallback={<RouterLoadingScreen mensaje="SINCRO_ADMIN_DEV..." />}>
                                <RegisterAdmin />
                            </Suspense>
                        } 
                    />
                    
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
                    <Route path="/motocarga/historial" element={<ProtectedRoute allowedRoles={['motocarga']}><HistorialMotocarga /></ProtectedRoute>} />
                    <Route path="/mototaxi/home" element={<ProtectedRoute allowedRoles={['mototaxi']}><HomeMototaxi /></ProtectedRoute>} />
                    <Route path="/motoparrillero/home" element={<ProtectedRoute allowedRoles={['motoparrillero']}><HomeMotoparrillero /></ProtectedRoute>} />
                    
                    {/* 🚀 PUENTES DE ENTRADA DIRECTA PARA CÓDIGOS QR OMNICANAL (Flujo Invertido Público Dinámico) */}
                    <Route path="/mototaxi" element={<Navigate to="/login?role=moto" replace />} />
                    <Route path="/moto-parrillero" element={<Navigate to="/login?role=moto" replace />} />
                    <Route path="/motocarga" element={<Navigate to="/login?role=motocarga" replace />} />
                    <Route path="/intermunicipal" element={<Navigate to="/login?role=intermunicipal" replace />} />
                    <Route path="/pasajero" element={<Navigate to="/login?role=pasajero" replace />} />
                    <Route path="/despachador" element={<Navigate to="/login?role=despachador" replace />} />

                    {/* Home Central y Catch-all */}
                    <Route path="/" element={<RoleBasedRedirect />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
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