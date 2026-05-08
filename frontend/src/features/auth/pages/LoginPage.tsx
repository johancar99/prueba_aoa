import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { useAuth, type AuthUser } from '../../../store/AuthContext';
import { LOGIN_MUTATION } from '../../../api/mutations/auth.mutations';

// ─── GQL types ────────────────────────────────────────────────────────────────

interface LoginData {
  login: {
    token: string;
    user: AuthUser;
  };
}

interface LoginVars {
  email: string;
  password: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

const loginSchema = Yup.object({
  email: Yup.string()
    .email('Ingresa un correo válido')
    .required('El correo es obligatorio'),
  password: Yup.string()
    .min(6, 'Mínimo 6 caracteres')
    .required('La contraseña es obligatoria'),
});

// ─── Sub-components ───────────────────────────────────────────────────────────

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="mt-1 text-xs text-red-500">{msg}</p> : null;

// ─── Page ─────────────────────────────────────────────────────────────────────

const LoginPage = () => {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  const [loginMutation] = useMutation<LoginData, LoginVars>(LOGIN_MUTATION, {
    onError: (err) => {
      const message = err.graphQLErrors[0]?.message ?? err.message;
      toast.error(message);
    },
  });

  const formik = useFormik<LoginVars>({
    initialValues: { email: '', password: '' },
    validationSchema: loginSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const result = await loginMutation({ variables: values });
        const data = result.data?.login;

        if (!data) throw new Error('Respuesta inesperada del servidor');

        login(data.token, data.user);
        toast.success(`Bienvenido, ${data.user.name}`);
        navigate(from, { replace: true });
      } catch {
        // Los errores de GraphQL ya los maneja onError; aquí capturamos errores de red.
      } finally {
        setSubmitting(false);
      }
    },
  });

  const inputClass = (field: keyof LoginVars) =>
    `w-full px-4 py-2.5 text-sm rounded-lg border bg-white transition-colors outline-none
     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
     ${
       formik.touched[field] && formik.errors[field]
         ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
         : 'border-gray-300'
     }`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-700 to-blue-900 px-4">
      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header de la card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AOA Inventario</h1>
          <p className="mt-1 text-blue-200 text-sm">Sistema de gestión de Kardex</p>
        </div>

        {/* Formulario */}
        <form onSubmit={formik.handleSubmit} noValidate className="px-8 py-8 space-y-5">
          <h2 className="text-lg font-semibold text-gray-800 text-center">Iniciar sesión</h2>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="usuario@empresa.com"
              className={inputClass('email')}
              {...formik.getFieldProps('email')}
            />
            <FieldError msg={formik.touched.email ? formik.errors.email : undefined} />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputClass('password')}
              {...formik.getFieldProps('password')}
            />
            <FieldError msg={formik.touched.password ? formik.errors.password : undefined} />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={formik.isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700
                       disabled:opacity-60 disabled:cursor-not-allowed
                       text-white text-sm font-semibold rounded-lg
                       transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {formik.isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verificando...
              </>
            ) : (
              'Ingresar al sistema'
            )}
          </button>

          {/* Credenciales de demo */}
          <p className="text-center text-xs text-gray-400 pt-1">
            Demo:{' '}
            <button
              type="button"
              onClick={() => formik.setValues({ email: 'admin@aoa.com', password: 'Admin12345' })}
              className="text-blue-500 hover:underline font-medium"
            >
              admin@aoa.com
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
