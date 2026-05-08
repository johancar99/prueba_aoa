import { useState, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { useAuth } from '../store/AuthContext';

/**
 * Shell para todas las rutas privadas.
 * Gestiona el estado del sidebar mobile y la sesión de usuario.
 */
const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleMenuToggle = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const handleClose      = useCallback(() => setSidebarOpen(false), []);

  const handleLogout = useCallback(() => {
    logout();
    toast.success('Sesión cerrada correctamente');
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* ── Sidebar ── */}
      <Sidebar isOpen={sidebarOpen} onClose={handleClose} />

      {/* ── Zona derecha: Header + Contenido ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          onMenuToggle={handleMenuToggle}
          userName={user?.name ?? 'Usuario'}
          onLogout={handleLogout}
        />

        {/* Área de contenido con scroll independiente */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
