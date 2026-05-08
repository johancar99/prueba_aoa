import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@apollo/client';
import Table, { type Column } from '../../../components/common/Table';
import RoleBadge from '../../../components/common/RoleBadge';
import UserModal, { type ModalMode } from '../components/UserModal';
import {
  GET_USERS,
  type GetUsersData,
  type GetUsersVars,
  type UserItem,
  type UserFiltersInput,
} from '../../../api/queries/users.queries';
import type { UserRole } from '../../../store/AuthContext';
import { useDebounce } from '../../../hooks/useDebounce';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Action buttons ───────────────────────────────────────────────────────────

interface ActionButtonProps {
  onView: () => void;
  onEdit: () => void;
}

const ActionButtons = ({ onView, onEdit }: ActionButtonProps) => (
  <div className="flex items-center gap-1">
    <button
      onClick={onView}
      title="Ver detalle"
      className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    </button>
    <button
      onClick={onEdit}
      title="Editar usuario"
      className="p-1.5 rounded-lg text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const UsersPage = () => {
  /* Paginación y filtros */
  const [page, setPage]       = useState(1);
  const [nameInput, setName]  = useState('');
  const [roleFilter, setRole] = useState<UserRole | ''>('');
  const debouncedName         = useDebounce(nameInput, 400);

  /* Estado del modal */
  const [modalMode,   setModalMode]   = useState<ModalMode>('create');
  const [selectedUser, setSelected]   = useState<UserItem | null>(null);
  const [modalOpen,    setModalOpen]  = useState(false);

  const openModal = useCallback((mode: ModalMode, user?: UserItem) => {
    setModalMode(mode);
    setSelected(user ?? null);
    setModalOpen(true);
  }, []);

  /* Query */
  const filters = useMemo<UserFiltersInput>(() => ({
    ...(debouncedName ? { name: debouncedName } : {}),
    ...(roleFilter    ? { role: roleFilter }    : {}),
    limit:  PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }), [debouncedName, roleFilter, page]);

  const { data, loading, error } = useQuery<GetUsersData, GetUsersVars>(GET_USERS, {
    variables: { filters },
    fetchPolicy: 'cache-and-network',
  });

  const total      = data?.users.total ?? 0;
  const items      = data?.users.items ?? [];
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleNameChange = (v: string)           => { setName(v);   setPage(1); };
  const handleRoleChange = (v: UserRole | '') => { setRole(v);  setPage(1); };

  /* Columnas de la tabla */
  const columns = useMemo<Column<UserItem>[]>(() => [
    {
      key: 'name',
      header: 'Usuario',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 select-none">
            {u.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-gray-800">{u.name}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Correo electrónico',
      render: (u) => <span className="text-gray-500">{u.email}</span>,
    },
    {
      key: 'role',
      header: 'Rol',
      render: (u) => <RoleBadge role={u.role} />,
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (u) => (
        <ActionButtons
          onView={() => openModal('view', u)}
          onEdit={() => openModal('edit', u)}
        />
      ),
    },
  ], [openModal]);

  return (
    <div className="space-y-6">
      {/* ── Encabezado ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Usuarios</h1>
          <p className="mt-0.5 text-sm text-gray-500">Gestión de cuentas y roles del sistema</p>
        </div>

        <button
          onClick={() => openModal('create')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg
                     transition-colors shadow-sm self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      {/* ── Tabla card ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Barra de filtros */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={nameInput}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => handleRoleChange(e.target.value as UserRole | '')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-700
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:w-44"
          >
            <option value="">Todos los roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="USER">USER</option>
          </select>

          {(nameInput || roleFilter) && (
            <button
              onClick={() => { handleNameChange(''); handleRoleChange(''); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700
                         border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar
            </button>
          )}
        </div>

        {/* Tabla genérica */}
        <Table
          columns={columns}
          data={items}
          keyExtractor={(u) => u.id}
          loading={loading}
          error={error ? `Error al cargar usuarios: ${error.message}` : undefined}
          emptyMessage="No se encontraron usuarios"
          pagination={{
            page,
            totalPages,
            total,
            pageSize: PAGE_SIZE,
            entityLabel: 'usuarios',
            onPrev: () => setPage((p) => Math.max(1, p - 1)),
            onNext: () => setPage((p) => Math.min(totalPages, p + 1)),
          }}
        />
      </div>

      {/* Modal create / edit / view */}
      <UserModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        user={selectedUser}
      />
    </div>
  );
};

export default UsersPage;
