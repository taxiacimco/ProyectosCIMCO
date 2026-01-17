import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// --- IMPORTACIÓN DE PÁGINAS ---
import LoginPage from './pages/login';
import DashboardBienvenida from './pages/DashboardBienvenida';
import PasajeroPanel from './pages/PasajeroPanel'; 
import PasajeroHistorial from './pages/PasajeroHistorial';
import DespachadorPanel from './pages/DespachadorPanel';
import ConductorInterPanel from './pages/ConductorInterPanel';
import AdminVehiculos from './pages/AdminVehiculos';
import PagoNequi from './pages/PagoNequi';
import AdminVerificacionDocs from './pages/AdminVerificacionDocs';

// --- NUEVA IMPORTACIÓN: EL DASHBOARD EJECUTIVO ---
import AdminDashboard from './pages/AdminDashboard'; 
// IMPORTAMOS EL NUEVO REPORTE EN TIEMPO REAL
import ReporteGanancias from './pages/ReporteGanancias'; 

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 1. RUTA PÚBLICA: Acceso inicial */}
          <Route path="/login" element={<LoginPage />} />

          {/* 2. RUTAS PROTEGIDAS GENERALES */}
          <Route element={<ProtectedRoute />}>
            <Route path="/welcome" element={<DashboardBienvenida />} />
          </Route>

          {/* 3. RUTA CEO / ADMIN: Dashboard con Gráficas Reales */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/vehiculos" element={<AdminVehiculos />} />
            <Route path="/admin/verificar-docs" element={<AdminVerificacionDocs />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            
            {/* ✅ NUEVA RUTA: REPORTE FINANCIERO EN TIEMPO REAL */}
            <Route path="/admin/reporte-ganancias" element={<ReporteGanancias />} />
          </Route>

          {/* 4. RUTA PAGOS (NEQUI) */}
          <Route element={<ProtectedRoute allowedRoles={['mototaxi', 'motoparrillero', 'motocarga', 'conductorinter', 'despachadorinter', 'admin']} />}>
            <Route path="/pago-nequi" element={<PagoNequi />} />
          </Route>

          {/* 5. RUTA CONDUCTORES URBANOS */}
          <Route element={<ProtectedRoute allowedRoles={['mototaxi', 'motoparrillero', 'motocarga']} />}>
            <Route path="/driver/panel" element={
              <div className="p-10 text-2xl text-white font-bold bg-slate-900 min-h-screen">
                🛵 Panel de Conductor Urbano - La Jagua
              </div>
            } />
          </Route>

          {/* 6. RUTA INTERMUNICIPAL */}
          <Route element={<ProtectedRoute allowedRoles={['despachadorinter', 'conductorinter']} />}>
            <Route path="/inter/panel" element={<DespachadorPanel />} />
            <Route path="/driver/inter" element={<ConductorInterPanel />} />
          </Route>

          {/* 7. RUTA PASAJERO */}
          <Route element={<ProtectedRoute allowedRoles={['pasajero']} />}>
            <Route path="/pasajero/panel" element={<PasajeroPanel />} />
            <Route path="/pasajero/historial" element={<PasajeroHistorial />} />
          </Route>

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;