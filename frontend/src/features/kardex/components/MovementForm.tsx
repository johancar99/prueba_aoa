import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import Modal from '../../../components/common/Modal';
import ConfirmModal from '../../../components/common/ConfirmModal';
import {
  GET_PRODUCTS,
  type GetProductsData,
  type GetProductsVars,
  type ProductItem,
} from '../../../api/queries/products.queries';
import {
  REGISTER_MOVEMENT,
  type RegisterMovementData,
  type RegisterMovementInput,
} from '../../../api/mutations/kardex.mutations';
import { formatCurrencyCOP, formatQuantity } from '../../../utils/format';
import { formatMutationError } from '../../../utils/apollo-errors';

interface MovementFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormValues {
  productId: string;
  type: 'IN' | 'OUT';
  quantity: string;
  unitPrice: string;
  observations: string;
}

const INITIAL_VALUES: FormValues = {
  productId: '',
  type: 'IN',
  quantity: '',
  unitPrice: '',
  observations: '',
};

const buildSchema = (currentStock: number) =>
  Yup.object({
    productId: Yup.string().required('Selecciona un producto'),
    type: Yup.string().oneOf(['IN', 'OUT']).required(),
    quantity: Yup.number()
      .typeError('Ingresa una cantidad válida')
      .positive('La cantidad debe ser mayor a 0')
      .integer('La cantidad debe ser un número entero')
      .required('La cantidad es requerida'),
    unitPrice: Yup.number()
      .typeError('Ingresa un precio válido')
      .when('type', {
        is: 'IN',
        then: (s) =>
          s.positive('Debe ser mayor a 0').required('El precio es requerido para entradas'),
        otherwise: (s) => s.nullable().optional(),
      }),
    observations: Yup.string()
      .trim()
      .min(3, 'Mínimo 3 caracteres')
      .required('La observación es requerida'),
  }).test('stock-check', '', function (values) {
    if (
      values.type === 'OUT' &&
      values.quantity !== undefined &&
      !isNaN(Number(values.quantity)) &&
      Number(values.quantity) > currentStock
    ) {
      return this.createError({
        path: 'quantity',
        message: `Stock insuficiente. Disponible: ${formatQuantity(currentStock)}`,
      });
    }
    return true;
  });

const FieldError = ({ name }: { name: string }) => (
  <ErrorMessage name={name}>
    {(msg) => <p className="mt-1 text-xs text-red-600">{msg}</p>}
  </ErrorMessage>
);

const MovementForm = ({ isOpen, onClose, onSuccess }: MovementFormProps) => {
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);

  const { data: productsData, loading: productsLoading } = useQuery<GetProductsData, GetProductsVars>(
    GET_PRODUCTS,
    {
      variables: { filters: { limit: 1000 } },
      fetchPolicy: 'cache-and-network',
      skip: !isOpen,
    },
  );

  const products = productsData?.products.items ?? [];

  const [registerMovement, { loading: registering }] = useMutation<RegisterMovementData>(
    REGISTER_MOVEMENT,
    {
      onCompleted: (data) => {
        const result = data.registerMovement;
        const typeLabel = result.type === 'IN' ? 'Entrada' : 'Salida';

        if (result.lowStockAlert) {
          toast.error(
            `${typeLabel} registrada. ¡Alerta! El producto ha quedado bajo el stock mínimo.`,
            { duration: 7000 },
          );
        } else {
          toast.success(`${typeLabel} registrada correctamente`);
        }

        setPendingValues(null);
        onSuccess?.();
        onClose();
      },
      onError: (e) => {
        toast.error(formatMutationError(e));
        setPendingValues(null);
      },
      refetchQueries: [
        'Products',
        'GetGlobalMovements',
        'LowStockProducts',
        'InventoryTotalValue',
      ],
    },
  );

  const handleFormSubmit = (values: FormValues) => {
    setPendingValues(values);
  };

  const handleConfirm = () => {
    if (!pendingValues) return;
    const input: RegisterMovementInput = {
      productId: pendingValues.productId,
      type: pendingValues.type,
      quantity: Number(pendingValues.quantity),
      observations: pendingValues.observations.trim(),
      ...(pendingValues.type === 'IN' && pendingValues.unitPrice
        ? { unitPrice: Number(pendingValues.unitPrice) }
        : {}),
    };
    void registerMovement({ variables: { input } });
  };

  const handleClose = () => {
    if (!registering) onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="Registrar Movimiento" size="md">
        <Formik
          initialValues={INITIAL_VALUES}
          validationSchema={undefined}
          validate={(values) => {
            const selectedProduct = products.find((p) => p.id === values.productId);
            const schema = buildSchema(selectedProduct?.stock ?? 0);
            try {
              schema.validateSync(values, { abortEarly: false });
              return {};
            } catch (err) {
              if (err instanceof Yup.ValidationError) {
                const errors: Record<string, string> = {};
                err.inner.forEach((e) => {
                  if (e.path && !errors[e.path]) errors[e.path] = e.message;
                });
                return errors;
              }
              return {};
            }
          }}
          onSubmit={handleFormSubmit}
        >
          {({ values, setFieldValue, isSubmitting, errors, touched }) => {
            const selectedProduct: ProductItem | undefined = products.find(
              (p) => p.id === values.productId,
            );
            const isOut = values.type === 'OUT';
            const stockExceeded =
              isOut &&
              selectedProduct &&
              Number(values.quantity) > selectedProduct.stock;

            return (
              <Form className="space-y-5">
                {/* Product selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Producto <span className="text-red-500">*</span>
                  </label>
                  <Field
                    as="select"
                    name="productId"
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      ${touched.productId && errors.productId ? 'border-red-400' : 'border-gray-300'}`}
                    disabled={productsLoading}
                  >
                    <option value="">
                      {productsLoading ? 'Cargando productos...' : '— Selecciona un producto —'}
                    </option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.code}] {p.name}
                      </option>
                    ))}
                  </Field>
                  <FieldError name="productId" />

                  {/* Live stock display */}
                  {selectedProduct && (
                    <div
                      className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                        ${selectedProduct.stock <= selectedProduct.minStock
                          ? 'bg-amber-50 border border-amber-200 text-amber-800'
                          : 'bg-blue-50 border border-blue-200 text-blue-800'
                        }`}
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <span>
                        Stock actual:{' '}
                        <strong className="font-bold">{formatQuantity(selectedProduct.stock)}</strong>
                        {selectedProduct.stock <= selectedProduct.minStock && (
                          <span className="ml-2 text-xs font-semibold text-amber-700">
                            (bajo mínimo: {formatQuantity(selectedProduct.minStock)})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Movement type toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tipo de movimiento <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['IN', 'OUT'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFieldValue('type', t)}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all
                          ${values.type === t
                            ? t === 'IN'
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                          }`}
                      >
                        {t === 'IN' ? (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Entrada
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                            </svg>
                            Salida
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Cantidad <span className="text-red-500">*</span>
                  </label>
                  <Field
                    name="quantity"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="0"
                    className={`w-full px-3 py-2 text-sm border rounded-lg
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      ${touched.quantity && errors.quantity ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  />
                  {/* Stock exceeded warning banner */}
                  {stockExceeded && (
                    <div className="mt-1.5 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span>
                        Stock insuficiente — disponible:{' '}
                        <strong>{formatQuantity(selectedProduct!.stock)}</strong>
                      </span>
                    </div>
                  )}
                  <FieldError name="quantity" />
                </div>

                {/* Unit price — only for IN */}
                {values.type === 'IN' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Precio unitario (COP) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
                        $
                      </span>
                      <Field
                        name="unitPrice"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        className={`w-full pl-7 pr-3 py-2 text-sm border rounded-lg
                          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                          ${touched.unitPrice && errors.unitPrice ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                      />
                    </div>
                    <FieldError name="unitPrice" />
                  </div>
                )}

                {/* PPP info for OUT */}
                {values.type === 'OUT' && selectedProduct && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                    <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      Precio calculado automáticamente por PPP:{' '}
                      <strong>{formatCurrencyCOP(selectedProduct.averagePrice)}</strong>
                    </span>
                  </div>
                )}

                {/* Observations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Observación <span className="text-red-500">*</span>
                  </label>
                  <Field
                    as="textarea"
                    name="observations"
                    rows={3}
                    placeholder="Describe el motivo del movimiento..."
                    className={`w-full px-3 py-2 text-sm border rounded-lg resize-none
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      ${touched.observations && errors.observations ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  />
                  <FieldError name="observations" />
                </div>

                {/* Date display (informational — server sets createdAt) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Fecha del movimiento
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={new Intl.DateTimeFormat('es-CO', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date())}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>

                {/* Footer actions */}
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300
                               rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedProduct}
                    className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg
                      transition-colors disabled:opacity-60 disabled:cursor-not-allowed
                      ${values.type === 'IN'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                  >
                    {values.type === 'IN' ? 'Registrar Entrada' : 'Registrar Salida'}
                  </button>
                </div>
              </Form>
            );
          }}
        </Formik>
      </Modal>

      {/* Confirmation modal */}
      <ConfirmModal
        isOpen={Boolean(pendingValues)}
        danger={pendingValues?.type === 'OUT'}
        title={`Confirmar ${pendingValues?.type === 'IN' ? 'Entrada' : 'Salida'}`}
        message={
          pendingValues ? (
            <div className="space-y-3">
              <p>
                ¿Confirmas el registro de este movimiento? Esta acción actualizará el Kardex de
                inventario.
              </p>
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1.5 border border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-500">Producto:</span>
                  <span className="font-medium text-gray-800">
                    {products.find((p) => p.id === pendingValues.productId)?.name ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tipo:</span>
                  <span
                    className={`font-semibold ${pendingValues.type === 'IN' ? 'text-green-700' : 'text-red-700'}`}
                  >
                    {pendingValues.type === 'IN' ? '▲ Entrada' : '▼ Salida'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cantidad:</span>
                  <span className="font-medium text-gray-800">
                    {formatQuantity(Number(pendingValues.quantity))}
                  </span>
                </div>
                {pendingValues.type === 'IN' && pendingValues.unitPrice && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Precio unitario:</span>
                    <span className="font-medium text-gray-800">
                      {formatCurrencyCOP(Number(pendingValues.unitPrice))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : null
        }
        confirmLabel={registering ? 'Registrando...' : 'Sí, registrar'}
        cancelLabel="Revisar"
        loading={registering}
        onConfirm={handleConfirm}
        onCancel={() => !registering && setPendingValues(null)}
      />
    </>
  );
};

export default MovementForm;
