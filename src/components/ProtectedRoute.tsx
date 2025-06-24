
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { authState } = useAuth();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();
  
  useEffect(() => {
    // Enhanced debug logging with timestamps
    console.log(`ProtectedRoute [${new Date().toISOString()}] - Auth state:`, { 
      session: authState.session ? 'exists' : 'null', 
      profile: authState.profile, 
      user: authState.user ? 'exists' : 'null',
      path: location.pathname
    });
    
    if (authState.session !== undefined) {
      // Use a shorter timeout to improve user experience
      const timer = setTimeout(() => {
        setIsLoading(false);
        console.log(`ProtectedRoute [${new Date().toISOString()}] - Finished loading, profile:`, authState.profile);
      }, 300); // Reduced from 500ms to 300ms for faster response
      
      return () => clearTimeout(timer);
    }
  }, [authState.session, authState.profile, location.pathname]);

  // Show loading while waiting for auth state
  if (isLoading && authState.session) {
    console.log(`ProtectedRoute [${new Date().toISOString()}] - Still loading...`);
    return <div className="flex items-center justify-center h-screen">{t('protected.loading_auth')}</div>;
  }

  // Return null initially instead of Navigate to prevent rendering outside Router context
  if (authState.session === undefined) {
    return null;
  }

  // Redirect to auth if not authenticated
  if (!authState.session) {
    console.log(`ProtectedRoute [${new Date().toISOString()}] - No session, redirecting to /auth`);
    return <Navigate to="/auth" replace />;
  }
  
  // Force check role for admin redirection
  if (authState.profile && authState.profile.role === 'admin' && location.pathname === '/') {
    console.log(`ProtectedRoute [${new Date().toISOString()}] - Admin detected, redirecting to admin dashboard`);
    return <Navigate to="/admin" replace />;
  }
  
  // Redirect non-admins away from admin page
  if (authState.profile && authState.profile.role !== 'admin' && location.pathname === '/admin') {
    console.log(`ProtectedRoute [${new Date().toISOString()}] - Non-admin trying to access admin page, redirecting to home`);
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
