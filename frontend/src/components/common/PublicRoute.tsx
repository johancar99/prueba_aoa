import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

/**
 * Rutas accesibles solo sin sesión activa (ej. /login).
 * Si el usuario ya está autenticado lo redirige al dashboard.
 */
const PublicRoute = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
