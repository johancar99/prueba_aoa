import { useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import Modal from '../../../components/common/Modal';
import { CREATE_PRODUCT, UPDATE_PRODUCT } from '../../../api/mutations/products.mutations';
import { GET_PRODUCTS } from '../../../api/queries/products.queries';
import type { ProductItem } from '../../../api/queries/products.queries';
import { formatCurrencyCOP, formatQuantity } from '../../../utils/format';
import { formatMutationError } from '../../../utils/apollo-errors';

export type ProductModalMode = 'create' | 'edit' | 'view';

interface ProductModalProps {
  mode: ProductModalMode;
  product?: ProductItem | null;
  isOpen: boolean;
  onClose: () => void;
  /** Tras crear/editar con éxito: refresca la lista (refetch) para no depender solo del cache. */
  onMutationSuccess?: () => void | Promise<unknown>;
}

interface CreateFormValues {
  code: string;
  name: string;
  description: string;
  category: string;
  stock: number;
  minStock: number;
  salePrice: number;
  averagePrice: string;
}

interface EditFormValues {
  code: string;
  name: string;
  description: string;
  category: string;
  minStock: number;
  salePrice: number;
  status: boolean;
}

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="mt-1 text-xs text-red-500">{msg}</p> : null;

const inputBase =
  'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

const inputClass = (hasError: boolean) =>
  `${inputBase} ${hasError ? 'border-red-400' : 'border-gray-300'}`;

const toNumber = (value: unknown, fallback = 0): number => {
  if (value === '' || value === null || value === undefined) return fallback;
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
};

const codePattern = /^[a-zA-Z0-9]+$/;

const createSchema = Yup.object({
  code: Yup.string()
    .trim()
    .required('El código es obligatorio')
    .matches(codePattern, 'Solo letras y números (sin espacios ni guiones)'),
  name: Yup.string().trim().required('El nombre es obligatorio'),
  description: Yup.string().trim(),
  category: Yup.string().trim(),
  stock: Yup.number()
    .transform((_, orig) => toNumber(orig, 0))
    .min(0, 'No puede ser negativo')
    .required(),
  /* Backend: minStock debe ser > 0 (product.validator.ts) */
  minStock: Yup.number()
    .transform((_, orig) => toNumber(orig, 0))
    .moreThan(0, 'El stock mínimo debe ser mayor a 0')
    .required('Stock mínimo obligatorio'),
  salePrice: Yup.number()
    .transform((_, orig) => toNumber(orig, 0))
    .min(0.01, 'Debe ser mayor a 0')
    .required('Precio de venta obligatorio'),
  averagePrice: Yup.string().test(
    'avgOptional',
    'Valor numérico inválido',
    (val) => !val?.trim() || Number.isFinite(Number(String(val).trim().replace(',', '.'))),
  ),
});

const editSchema = Yup.object({
  code: Yup.string()
    .trim()
    .test('alnum', 'Solo letras y números', (v) => !v || codePattern.test(v)),
  name: Yup.string().trim().required('El nombre es obligatorio'),
  description: Yup.string().trim(),
  category: Yup.string().trim(),
  minStock: Yup.number()
    .transform((_, orig) => toNumber(orig, 0))
    .moreThan(0, 'El stock mínimo debe ser mayor a 0')
    .required(),
  salePrice: Yup.number()
    .transform((_, orig) => toNumber(orig, 0))
    .min(0.01, 'Debe ser mayor a 0')
    .required(),
  status: Yup.boolean().required(),
});

const MODAL_TITLES: Record<ProductModalMode, string> = {
  create: 'Nuevo producto',
  edit: 'Editar producto',
  view: 'Detalle del producto',
};

const ViewProduct = ({ product }: { product: ProductItem }) => (
  <div className="space-y-4 text-sm">
    <div className="pb-4 border-b border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</p>
      <p className="mt-1 font-mono text-base font-semibold text-gray-800">{product.code}</p>
      <p className="mt-2 text-lg font-semibold text-gray-900">{product.name}</p>
      {product.category && (
        <p className="mt-1 text-gray-500">
          Categoría: <span className="text-gray-700">{product.category}</span>
        </p>
      )}
    </div>

    {product.description && (
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</p>
        <p className="mt-1 text-gray-700 whitespace-pre-wrap">{product.description}</p>
      </div>
    )}

    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <dt className="text-gray-500 font-medium">Stock actual</dt>
        <dd className="text-gray-900 font-semibold">{formatQuantity(product.stock)}</dd>
      </div>
      <div>
        <dt className="text-gray-500 font-medium">Stock mínimo</dt>
        <dd className="text-gray-900 font-semibold">{formatQuantity(product.minStock)}</dd>
      </div>
      <div>
        <dt className="text-gray-500 font-medium">Precio venta</dt>
        <dd className="text-gray-900 font-semibold">{formatCurrencyCOP(product.salePrice)}</dd>
      </div>
      <div>
        <dt className="text-gray-500 font-medium">Precio promedio (PPP)</dt>
        <dd className="text-gray-900 font-semibold">{formatCurrencyCOP(product.averagePrice)}</dd>
      </div>
      <div>
        <dt className="text-gray-500 font-medium">Estado</dt>
        <dd>
          <span
            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
              product.status ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {product.status ? 'Activo' : 'Inactivo'}
          </span>
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-gray-500 font-medium">ID</dt>
        <dd className="font-mono text-xs text-gray-600 break-all">{product.id}</dd>
      </div>
    </dl>
  </div>
);

const ProductModal = ({ mode, product, isOpen, onClose, onMutationSuccess }: ProductModalProps) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [createProduct, { loading: creating }] = useMutation(CREATE_PRODUCT, {
    refetchQueries: [{ query: GET_PRODUCTS }],
    awaitRefetchQueries: true,
    onCompleted: async () => {
      toast.success('Producto creado correctamente');
      try {
        await onMutationSuccess?.();
      } finally {
        onClose();
      }
    },
    onError: (e) => toast.error(formatMutationError(e)),
  });

  const [updateProduct, { loading: updating }] = useMutation(UPDATE_PRODUCT, {
    refetchQueries: [{ query: GET_PRODUCTS }],
    awaitRefetchQueries: true,
    onCompleted: async () => {
      toast.success('Producto actualizado correctamente');
      try {
        await onMutationSuccess?.();
      } finally {
        onClose();
      }
    },
    onError: (e) => toast.error(formatMutationError(e)),
  });

  const submitting = creating || updating;

  const createFormik = useFormik<CreateFormValues>({
    initialValues: {
      code: '',
      name: '',
      description: '',
      category: '',
      stock: 0,
      minStock: 1,
      salePrice: 0,
      averagePrice: '',
    },
    validationSchema: createSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      const avgStr = values.averagePrice.trim().replace(',', '.');
      const averagePrice =
        avgStr === '' || Number.isNaN(Number(avgStr)) ? undefined : Number(avgStr);

      await createProduct({
        variables: {
          input: {
            code: values.code.trim().toUpperCase(),
            name: values.name.trim(),
            description: values.description.trim() || undefined,
            category: values.category.trim() || undefined,
            stock: values.stock,
            minStock: values.minStock,
            salePrice: values.salePrice,
            ...(averagePrice !== undefined ? { averagePrice } : {}),
          },
        },
      });
    },
  });

  const editFormik = useFormik<EditFormValues>({
    initialValues: {
      code: product?.code ?? '',
      name: product?.name ?? '',
      description: product?.description ?? '',
      category: product?.category ?? '',
      minStock: Math.max(1, product?.minStock ?? 1),
      salePrice: product?.salePrice ?? 0,
      status: product?.status ?? true,
    },
    validationSchema: editSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (!product) return;
      const input: Record<string, unknown> = {
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        category: values.category.trim() || undefined,
        minStock: values.minStock,
        salePrice: values.salePrice,
        status: values.status,
      };
      const codeTrim = values.code.trim().toUpperCase();
      if (codeTrim && codeTrim !== product.code.toUpperCase()) {
        input.code = codeTrim;
      }
      await updateProduct({ variables: { id: product.id, input } });
    },
  });

  useEffect(() => {
    if (!isOpen) {
      createFormik.resetForm();
      editFormik.resetForm();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const footer =
    isView ? (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cerrar
        </button>
      </div>
    ) : (
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          form={isCreate ? 'product-create-form' : 'product-edit-form'}
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg
                     hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {submitting && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {isCreate ? 'Crear producto' : 'Guardar cambios'}
        </button>
      </div>
    );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={MODAL_TITLES[mode]} size="lg" footer={footer}>
      {isView && product ? (
        <ViewProduct product={product} />
      ) : isCreate ? (
        <form id="product-create-form" onSubmit={createFormik.handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input
                type="text"
                placeholder="P001"
                className={inputClass(!!(createFormik.touched.code && createFormik.errors.code))}
                {...createFormik.getFieldProps('code')}
              />
              <FieldError msg={createFormik.touched.code ? createFormik.errors.code : undefined} />
              <p className="mt-1 text-xs text-gray-500">Solo letras y números, sin espacios (ej. P001).</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                className={inputClass(!!(createFormik.touched.name && createFormik.errors.name))}
                {...createFormik.getFieldProps('name')}
              />
              <FieldError msg={createFormik.touched.name ? createFormik.errors.name : undefined} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              rows={3}
              className={`${inputBase} border-gray-300 resize-y`}
              {...createFormik.getFieldProps('description')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <input
              type="text"
              placeholder="Ej. Repuestos"
              className={inputClass(false)}
              {...createFormik.getFieldProps('category')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock inicial</label>
              <input
                type="number"
                min={0}
                step="any"
                name="stock"
                className={inputClass(!!(createFormik.touched.stock && createFormik.errors.stock))}
                value={createFormik.values.stock}
                onChange={(e) =>
                  createFormik.setFieldValue('stock', e.target.value === '' ? 0 : toNumber(e.target.value, 0))
                }
                onBlur={createFormik.handleBlur}
              />
              <FieldError msg={createFormik.touched.stock ? createFormik.errors.stock : undefined} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
              <input
                type="number"
                min={1}
                step="any"
                name="minStock"
                className={inputClass(!!(createFormik.touched.minStock && createFormik.errors.minStock))}
                value={createFormik.values.minStock}
                onChange={(e) =>
                  createFormik.setFieldValue(
                    'minStock',
                    e.target.value === '' ? 1 : toNumber(e.target.value, 1),
                  )
                }
                onBlur={createFormik.handleBlur}
              />
              <FieldError msg={createFormik.touched.minStock ? createFormik.errors.minStock : undefined} />
              <p className="mt-1 text-xs text-gray-500">Debe ser mayor a 0 (validación del servidor).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta (COP)</label>
              <input
                type="number"
                min={0}
                step="any"
                name="salePrice"
                className={inputClass(!!(createFormik.touched.salePrice && createFormik.errors.salePrice))}
                value={createFormik.values.salePrice}
                onChange={(e) =>
                  createFormik.setFieldValue(
                    'salePrice',
                    e.target.value === '' ? 0 : toNumber(e.target.value, 0),
                  )
                }
                onBlur={createFormik.handleBlur}
              />
              <FieldError msg={createFormik.touched.salePrice ? createFormik.errors.salePrice : undefined} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio promedio (opcional)
              </label>
              <input
                type="text"
                placeholder="Vacío = se calcula en el servidor"
                className={inputClass(
                  !!(createFormik.touched.averagePrice && createFormik.errors.averagePrice),
                )}
                {...createFormik.getFieldProps('averagePrice')}
              />
              <FieldError msg={createFormik.touched.averagePrice ? createFormik.errors.averagePrice : undefined} />
            </div>
          </div>
        </form>
      ) : (
        product && (
          <form id="product-edit-form" onSubmit={editFormik.handleSubmit} noValidate className="space-y-4">
            <p className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              El stock solo cambia mediante movimientos de Kardex. Precio promedio ponderado se actualiza con
              entradas de inventario.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  className={inputClass(false)}
                  {...editFormik.getFieldProps('code')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  className={inputClass(!!(editFormik.touched.name && editFormik.errors.name))}
                  {...editFormik.getFieldProps('name')}
                />
                <FieldError msg={editFormik.touched.name ? editFormik.errors.name : undefined} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                rows={3}
                className={`${inputBase} border-gray-300 resize-y`}
                {...editFormik.getFieldProps('description')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <input type="text" className={inputClass(false)} {...editFormik.getFieldProps('category')} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock actual</label>
                <input
                  type="text"
                  readOnly
                  className={`${inputBase} border-gray-200 bg-gray-50 text-gray-700`}
                  value={formatQuantity(product.stock)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio promedio (PPP)</label>
                <input
                  type="text"
                  readOnly
                  className={`${inputBase} border-gray-200 bg-gray-50 text-gray-700`}
                  value={formatCurrencyCOP(product.averagePrice)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
                <input
                  type="number"
                  min={1}
                  step="any"
                  name="minStock"
                  className={inputClass(!!(editFormik.touched.minStock && editFormik.errors.minStock))}
                  value={editFormik.values.minStock}
                  onChange={(e) =>
                    editFormik.setFieldValue(
                      'minStock',
                      e.target.value === '' ? 1 : toNumber(e.target.value, 1),
                    )
                  }
                  onBlur={editFormik.handleBlur}
                />
                <FieldError msg={editFormik.touched.minStock ? editFormik.errors.minStock : undefined} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta (COP)</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  name="salePrice"
                  className={inputClass(!!(editFormik.touched.salePrice && editFormik.errors.salePrice))}
                  value={editFormik.values.salePrice}
                  onChange={(e) =>
                    editFormik.setFieldValue(
                      'salePrice',
                      e.target.value === '' ? 0 : toNumber(e.target.value, 0),
                    )
                  }
                  onBlur={editFormik.handleBlur}
                />
                <FieldError msg={editFormik.touched.salePrice ? editFormik.errors.salePrice : undefined} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="product-status"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={editFormik.values.status}
                onChange={(e) => editFormik.setFieldValue('status', e.target.checked)}
              />
              <label htmlFor="product-status" className="text-sm font-medium text-gray-700">
                Producto activo (visible en búsquedas e inventario)
              </label>
            </div>
          </form>
        )
      )}
    </Modal>
  );
};

export default ProductModal;
