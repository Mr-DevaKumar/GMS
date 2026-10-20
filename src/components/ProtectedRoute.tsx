import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: 'admin' | 'coordinator';
}) {
  const { profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid place-items-center min-h-screen">
        <div className="label">Loading…</div>
      </div>
    );
  }
  if (!profile) return <Navigate to="/login" replace />;
  if (role && profile.role !== role) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/c'} replace />;
  }
  return <>{children}</>;
}