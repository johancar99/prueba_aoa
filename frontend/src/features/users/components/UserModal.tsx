import { useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import Modal from '../../../components/common/Modal';
import RoleBadge from '../../../components/common/RoleBadge';
import { CREATE_USER, UPDATE_USER } from '../../../api/mutations/users.mutations';
import { GET_USERS } from '../../../api/queries/users.queries';
import type { UserItem } from '../../../api/queries/users.queries';
import type { UserRole } from '../../../store/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModalMode = 'create' | 'edit' | 'view';

interface UserModalProps {
  mode: ModalMode;
  user?: UserItem | null;
  isOpen: boolean;
  onClose: () => void;
}

interface FormValues {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const createSchema = Yup.object({
  name:     Yup.string().required('El nombre es obligatorio'),
  email:    Yup.string().email('Correo inválido').required('El correo es obligatorio'),
  password: Yup.string().min(8, 'Mínimo 8 caracteres').required('La contraseña es obligatoria'),
  role:     Yup.string().oneOf(['ADMIN', 'USER']).required(),
});

const editSchema = Yup.object({
  name:     Yup.string().required('El nombre es obligatorio'),
  email:    Yup.string().email('Correo inválido').required('El correo es obligatorio'),
  password: Yup.string().test(
    'min-if-provided',
    'Mínimo 8 caracteres',
    (val) => !val || val.length >= 8,
  ),
  role: Yup.string().oneOf(['ADMIN', 'USER']).required(),
});

// ─── Field helper ─────────────────────────────────────────────────────────────

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="mt-1 text-xs text-red-500">{msg}</p> : null;

const inputBase =
  'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

const inputClass = (hasError: boolean) =>
  `${inputBase} ${hasError ? 'border-red-400' : 'border-gray-300'}`;

// ─── View mode: read-only display ─────────────────────────────────────────────

const ViewUser = ({ user }: { user: UserItem }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
      <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold select-none">
        {user.name.charAt(0).toUpperCase()}
      </div>
      <div>
        <p className="text-base font-semibold text-gray-800">{user.name}</p>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>
    </div>

    <dl className="space-y-3 text-sm">
      <div className="flex justify-between">
        <dt className="text-gray-500 font-medium">ID</dt>
        <dd className="text-gray-700 font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{user.id}</dd>
      </div>
      <div className="flex justify-between items-center">
        <dt className="text-gray-500 font-medium">Rol</dt>
        <dd><RoleBadge role={user.role} /></dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-gray-500 font-medium">Correo</dt>
        <dd className="text-gray-700">{user.email}</dd>
      </div>
    </dl>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const MODAL_TITLES: Record<ModalMode, string> = {
  create: 'Nuevo usuario',
  edit:   'Editar usuario',
  view:   'Detalle de usuario',
};

const UserModal = ({ mode, user, isOpen, onClose }: UserModalProps) => {
  const isView   = mode === 'view';
  const isEdit   = mode === 'edit';
  const isCreate = mode === 'create';

  const [createUser, { loading: creating }] = useMutation(CREATE_USER, {
    refetchQueries: [GET_USERS],
    onCompleted: () => { toast.success('Usuario creado correctamente'); onClose(); },
    onError: (e)    => toast.error(e.graphQLErrors[0]?.message ?? e.message),
  });

  const [updateUser, { loading: updating }] = useMutation(UPDATE_USER, {
    refetchQueries: [GET_USERS],
    onCompleted: () => { toast.success('Usuario actualizado correctamente'); onClose(); },
    onError: (e)    => toast.error(e.graphQLErrors[0]?.message ?? e.message),
  });

  const submitting = creating || updating;

  const formik = useFormik<FormValues>({
    initialValues: {
      name:     user?.name     ?? '',
      email:    user?.email    ?? '',
      password: '',
      role:     user?.role     ?? 'USER',
    },
    validationSchema: isCreate ? createSchema : editSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (isCreate) {
        await createUser({
          variables: { input: { name: values.name, email: values.email, password: values.password, role: values.role } },
        });
      } else if (isEdit && user) {
        const input: Record<string, unknown> = { name: values.name, email: values.email, role: values.role };
        if (values.password) input.password = values.password;
        await updateUser({ variables: { id: user.id, input } });
      }
    },
  });

  /* Limpiar formulario al cerrar */
  useEffect(() => {
    if (!isOpen) formik.resetForm();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const footer = !isView ? (
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
        form="user-form"
        disabled={submitting}
        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg
                   hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {submitting && (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {isCreate ? 'Crear usuario' : 'Guardar cambios'}
      </button>
    </div>
  ) : (
    <div className="flex justify-end">
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Cerrar
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={MODAL_TITLES[mode]}
      footer={footer}
    >
      {isView && user ? (
        <ViewUser user={user} />
      ) : (
        <form id="user-form" onSubmit={formik.handleSubmit} noValidate className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              placeholder="Nombre completo"
              className={inputClass(!!(formik.touched.name && formik.errors.name))}
              {...formik.getFieldProps('name')}
            />
            <FieldError msg={formik.touched.name ? formik.errors.name : undefined} />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input
              type="email"
              placeholder="usuario@empresa.com"
              className={inputClass(!!(formik.touched.email && formik.errors.email))}
              {...formik.getFieldProps('email')}
            />
            <FieldError msg={formik.touched.email ? formik.errors.email : undefined} />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
              {isEdit && <span className="ml-1 text-xs text-gray-400">(dejar vacío para no cambiar)</span>}
            </label>
            <input
              type="password"
              placeholder={isEdit ? '••••••••' : 'Mínimo 8 caracteres'}
              className={inputClass(!!(formik.touched.password && formik.errors.password))}
              {...formik.getFieldProps('password')}
            />
            <FieldError msg={formik.touched.password ? formik.errors.password : undefined} />
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select
              className={`${inputBase} border-gray-300 bg-white text-gray-700`}
              {...formik.getFieldProps('role')}
            >
              <option value="USER">USER — Acceso estándar</option>
              <option value="ADMIN">ADMIN — Acceso completo</option>
            </select>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default UserModal;
