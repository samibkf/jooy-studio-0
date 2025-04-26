
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { authState } = useAuth();

  if (!authState.session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
