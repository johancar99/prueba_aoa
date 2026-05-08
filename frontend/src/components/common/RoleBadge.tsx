import type { UserRole } from '../../store/AuthContext';

const styles: Record<UserRole, string> = {
  ADMIN: 'bg-blue-100 text-blue-700',
  USER:  'bg-slate-100 text-slate-600',
};

const RoleBadge = ({ role }: { role: UserRole }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[role]}`}>
    {role}
  </span>
);

export default RoleBadge;
