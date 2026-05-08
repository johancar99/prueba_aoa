import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import toast from 'react-hot-toast';
import Table, { type Column } from '../../../components/common/Table';
import ConfirmModal from '../../../components/common/ConfirmModal';
import ProductModal, { type ProductModalMode } from '../components/ProductModal';
import { DELETE_PRODUCT } from '../../../api/mutations/products.mutations';
import {
  GET_PRODUCTS,
  type GetProductsData,
  type GetProductsVars,
  type ProductItem,
  type ProductFiltersInput,
} from '../../../api/queries/products.queries';
import { useDebounce } from '../../../hooks/useDebounce';
import { formatCurrencyCOP, formatQuantity } from '../../../utils/format';
import { formatMutationError } from '../../../utils/apollo-errors';

const PAGE_SIZE = 10;

interface ActionButtonProps {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ActionButtons = ({ onView, onEdit, onDelete }: ActionButtonProps) => (
  <div className="flex items-center justify-end gap-0.5 flex-wrap">
    <button
      type="button"
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
      type="button"
      onClick={onEdit}
      title="Editar producto"
      className="p-1.5 rounded-lg text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
    <button
      type="button"
      onClick={onDelete}
      title="Eliminar producto"
      className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  </div>
);

const StockCell = ({ product }: { product: ProductItem }) => {
  const low = product.stock <= product.minStock;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-semibold text-gray-900 tabular-nums">{formatQuantity(product.stock)}</span>
      {low && (
        <span className="inline-flex w-fit items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
          Bajo mínimo
        </span>
      )}
    </div>
  );
};

const StatusPill = ({ active }: { active: boolean }) => (
  <span
    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
      active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
    }`}
  >
    {active ? 'Activo' : 'Inactivo'}
  </span>
);

const ProductsPage = () => {
  const [page, setPage] = useState(1);
  const [nameInput, setName] = useState('');
  const [categoryInput, setCategory] = useState('');
  const debouncedName = useDebounce(nameInput, 400);
  const debouncedCategory = useDebounce(categoryInput, 400);

  const [modalMode, setModalMode] = useState<ProductModalMode>('create');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = useCallback((mode: ProductModalMode, product?: ProductItem) => {
    setModalMode(mode);
    setSelectedProduct(product ?? null);
    setModalOpen(true);
  }, []);

  const filters = useMemo<ProductFiltersInput>(() => ({
    ...(debouncedName.trim() ? { name: debouncedName.trim() } : {}),
    ...(debouncedCategory.trim() ? { category: debouncedCategory.trim() } : {}),
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }), [debouncedName, debouncedCategory, page]);

  const { data, loading, error, refetch } = useQuery<GetProductsData, GetProductsVars>(GET_PRODUCTS, {
    variables: { filters },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const [deleteTarget, setDeleteTarget] = useState<ProductItem | null>(null);

  const [deleteProduct, { loading: deleting }] = useMutation(DELETE_PRODUCT, {
    onCompleted: async () => {
      toast.success('Producto eliminado correctamente');
      setDeleteTarget(null);
      await refetch({ filters });
    },
    onError: (e) => toast.error(formatMutationError(e)),
  });

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    void deleteProduct({ variables: { id: deleteTarget.id } });
  };

  const total = data?.products.total ?? 0;
  const items = data?.products.items ?? [];
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleNameChange = (v: string) => {
    setName(v);
    setPage(1);
  };
  const handleCategoryChange = (v: string) => {
    setCategory(v);
    setPage(1);
  };

  const columns = useMemo<Column<ProductItem>[]>(
    () => [
      {
        key: 'code',
        header: 'Código',
        render: (p) => <span className="font-mono text-sm font-semibold text-gray-800">{p.code}</span>,
      },
      {
        key: 'name',
        header: 'Producto',
        render: (p) => (
          <div>
            <span className="font-medium text-gray-900">{p.name}</span>
            {p.category && (
              <p className="text-xs text-gray-500 mt-0.5">{p.category}</p>
            )}
          </div>
        ),
      },
      {
        key: 'stock',
        header: 'Stock',
        render: (p) => <StockCell product={p} />,
      },
      {
        key: 'minStock',
        header: 'Mín.',
        render: (p) => (
          <span className="text-gray-600 tabular-nums">{formatQuantity(p.minStock)}</span>
        ),
      },
      {
        key: 'salePrice',
        header: 'P. venta',
        render: (p) => (
          <span className="text-gray-800 font-medium tabular-nums">{formatCurrencyCOP(p.salePrice)}</span>
        ),
      },
      {
        key: 'averagePrice',
        header: 'PPP',
        render: (p) => (
          <span className="text-gray-600 text-xs tabular-nums">{formatCurrencyCOP(p.averagePrice)}</span>
        ),
      },
      {
        key: 'status',
        header: 'Estado',
        render: (p) => <StatusPill active={p.status} />,
      },
      {
        key: 'actions',
        header: 'Acciones',
        headerClassName: 'text-right',
        className: 'text-right',
        render: (p) => (
          <ActionButtons
            onView={() => openModal('view', p)}
            onEdit={() => openModal('edit', p)}
            onDelete={() => setDeleteTarget(p)}
          />
        ),
      },
    ],
    [openModal],
  );

  const hasFilters = Boolean(nameInput || categoryInput);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventario</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Productos, stock y precios (COP)
          </p>
        </div>

        <button
          type="button"
          onClick={() => openModal('create')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg
                     transition-colors shadow-sm self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo producto
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
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

          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              placeholder="Categoría..."
              value={categoryInput}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                handleNameChange('');
                handleCategoryChange('');
              }}
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

        <Table
          columns={columns}
          data={items}
          keyExtractor={(p) => p.id}
          loading={loading}
          error={error ? `Error al cargar productos: ${error.message}` : undefined}
          emptyMessage="No se encontraron productos"
          emptyIcon={
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          pagination={{
            page,
            totalPages,
            total,
            pageSize: PAGE_SIZE,
            entityLabel: 'productos',
            onPrev: () => setPage((p) => Math.max(1, p - 1)),
            onNext: () => setPage((p) => Math.min(totalPages, p + 1)),
          }}
        />
      </div>

      <ProductModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        product={selectedProduct}
        onMutationSuccess={() => refetch({ filters })}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Eliminar producto"
        message={
          deleteTarget ? (
            <>
              ¿Eliminar <strong className="text-gray-800">{deleteTarget.name}</strong> ({deleteTarget.code})?
              La ficha dejará de mostrarse en el inventario activo.
            </>
          ) : null
        }
        confirmLabel={deleting ? 'Eliminando...' : 'Sí, eliminar'}
        cancelLabel="Cancelar"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  );
};

export default ProductsPage;
