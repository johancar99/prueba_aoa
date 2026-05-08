import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, isAdmin } from '../../store/AuthContext';

/**
 * Rutas exclusivas para administradores.
 * Si el usuario autenticado no tiene rol ADMIN se redirige al dashboard.
 */
const AdminRoute = () => {
  const { user } = useAuth();

  if (!isAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
