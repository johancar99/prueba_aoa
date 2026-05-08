interface HeaderProps {
  onMenuToggle: () => void;
  userName?: string;
  onLogout: () => void;
}

const Header = ({ onMenuToggle, userName = 'Usuario', onLogout }: HeaderProps) => (
  <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
    <div className="flex items-center justify-between h-16 px-4 sm:px-6">
      {/* Botón hamburguesa — solo visible en mobile */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="Abrir menú"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Breadcrumb / título de página — se puede extender con Context */}
      <div className="hidden lg:block">
        <span className="text-sm text-gray-400">Panel de administración</span>
      </div>

      {/* Acciones del usuario */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Avatar + nombre */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold select-none">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="hidden sm:block text-sm font-medium text-gray-700">{userName}</span>
        </div>

        {/* Separador */}
        <div className="h-6 w-px bg-gray-200" aria-hidden="true" />

        {/* Botón Cerrar Sesión */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </div>
    </div>
  </header>
);

export default Header;
