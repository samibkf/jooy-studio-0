
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { useEffect } from 'react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { authState } = useAuth();

  // Return null initially instead of Navigate to prevent rendering outside Router context
  if (authState.session === undefined) {
    return null;
  }

  if (!authState.session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
