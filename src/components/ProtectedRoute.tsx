
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { useEffect, useState } from 'react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { authState } = useAuth();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Debug log to see what's happening with authentication state
    console.log('ProtectedRoute - Auth state:', { 
      session: authState.session ? 'exists' : 'null', 
      profile: authState.profile, 
      user: authState.user ? 'exists' : 'null',
      path: location.pathname
    });
    
    // Wait for profile to be loaded before making routing decisions
    if (authState.session !== undefined) {
      // Allow a bit of time for auth state to settle and profile to load
      const timer = setTimeout(() => {
        setIsLoading(false);
        console.log('ProtectedRoute - Finished loading, profile:', authState.profile);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [authState.session, authState.profile, location.pathname]);

  // Show loading while waiting for auth state
  if (isLoading && authState.session) {
    console.log('ProtectedRoute - Still loading...');
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Return null initially instead of Navigate to prevent rendering outside Router context
  if (authState.session === undefined) {
    return null;
  }

  // Redirect to auth if not authenticated
  if (!authState.session) {
    console.log('ProtectedRoute - No session, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }
  
  // Force check role for admin redirection
  if (authState.profile && authState.profile.role === 'admin' && location.pathname === '/') {
    console.log('ProtectedRoute - Admin detected, redirecting to admin dashboard');
    return <Navigate to="/admin" replace />;
  }
  
  // Redirect non-admins away from admin page
  if (authState.profile && authState.profile.role !== 'admin' && location.pathname === '/admin') {
    console.log('ProtectedRoute - Non-admin trying to access admin page, redirecting to home');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
