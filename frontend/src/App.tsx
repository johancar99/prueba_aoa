import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout  from './layouts/DashboardLayout';
import ProtectedRoute   from './components/common/ProtectedRoute';
import PublicRoute      from './components/common/PublicRoute';
import AdminRoute       from './components/common/AdminRoute';

const LoginPage     = lazy(() => import('./features/auth/pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProductsPage  = lazy(() => import('./features/products/pages/ProductsPage'));
const KardexPage    = lazy(() => import('./features/kardex/pages/KardexPage'));
const ReportsPage   = lazy(() => import('./pages/ReportsPage'));
const UsersPage     = lazy(() => import('./features/users/pages/UsersPage'));

const FullPageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <Suspense fallback={<FullPageLoader />}>
    <Routes>
      {/* ── Rutas públicas (redirigen al dashboard si hay sesión) ── */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* ── Rutas privadas (redirigen al login si no hay sesión) ── */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/"          element={<DashboardPage />} />
          <Route path="/productos" element={<ProductsPage />} />
          <Route path="/kardex"    element={<KardexPage />} />
          <Route element={<AdminRoute />}>
            <Route path="/reportes" element={<ReportsPage />} />
          </Route>
          <Route path="/usuarios"  element={<UsersPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

export default App;
