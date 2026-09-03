import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ProtectedRoute = ({ allowedRoles = [], safeFallback = '/login' }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  if (!user) {
    return <Navigate to={safeFallback} replace />;
  }

  const hasValidRole = allowedRoles.length === 0 || allowedRoles.includes(user.role);

  if (!hasValidRole) {
    return <Navigate to={safeFallback} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;