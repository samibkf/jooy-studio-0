
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { useEffect, useState } from 'react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { authState } = useAuth();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Wait for profile to be loaded before making routing decisions
    if (authState.session !== undefined) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500); // Add a small delay to ensure profile is loaded
      
      return () => clearTimeout(timer);
    }
  }, [authState.session, authState.profile]);

  // Show loading while waiting for auth state
  if (isLoading && authState.session) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Return null initially instead of Navigate to prevent rendering outside Router context
  if (authState.session === undefined) {
    return null;
  }

  // Redirect to auth if not authenticated
  if (!authState.session) {
    return <Navigate to="/auth" replace />;
  }
  
  // Redirect admins to admin page if they're trying to access the home page
  if (authState.profile?.role === 'admin' && location.pathname === '/') {
    console.log('Admin detected, redirecting to admin dashboard');
    return <Navigate to="/admin" replace />;
  }
  
  // Redirect non-admins away from admin page
  if (authState.profile && authState.profile.role !== 'admin' && location.pathname === '/admin') {
    console.log('Non-admin trying to access admin page, redirecting to home');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
