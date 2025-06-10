import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthState, Profile } from '@/types/auth';
import { toast } from 'sonner';

const AuthContext = createContext<{
  authState: AuthState;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
} | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: undefined, // Initially undefined to indicate loading
    profile: null,
  });

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      console.log('Profile loaded:', profile);
      return profile;
    } catch (error) {
      console.error('Exception when fetching profile:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('Setting up auth state listener');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        // Basic state update with session and user
        setAuthState(prev => ({ ...prev, session, user: session?.user ?? null }));
        
        if (!session?.user) {
          // Clear profile on logout
          setAuthState(prev => ({ ...prev, profile: null }));
          return;
        }
        
        // For login events, fetch profile after a small delay
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          // Use setTimeout to avoid auth recursion
          setTimeout(async () => {
            const profile = await fetchProfile(session.user.id);
            if (profile) {
              console.log('Setting profile after auth change:', profile);
              setAuthState(prev => ({ ...prev, profile }));
            }
          }, 100);
        }
      }
    );

    // Initial session check
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Initial session check:', session?.user?.email);
      
      // Update session state
      setAuthState(prev => ({ ...prev, session, user: session?.user ?? null }));
      
      // Fetch profile if session exists
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (profile) {
          console.log('Initial profile loaded:', profile);
          setAuthState(prev => ({ ...prev, profile }));
        }
      }
    };
    
    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      console.log(`Attempting to sign in: ${email} (rememberMe: ${rememberMe})`);
      
      // If rememberMe is false, update the Supabase client's auth configuration temporarily
      if (!rememberMe) {
        await supabase.auth.setSession({
          access_token: '',
          refresh_token: ''
        });
      }
      
      // Sign in with email and password
      const { error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('Attempting to sign in with Google');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log('Attempting to sign up:', email);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('Attempting to sign out');
      
      // First check if we have a session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      // If we don't have a session, just clear the local state
      if (!currentSession) {
        console.log('No active session found, clearing local auth state');
        setAuthState({
          user: null,
          session: null,
          profile: null
        });
        return;
      }
      
      // We have a session, so try to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase sign out error:', error);
        // Even if we get an error, still clear the local state
        setAuthState({
          user: null,
          session: null,
          profile: null
        });
        toast.error(`Sign out error: ${error.message}`);
        return;
      }
      
      console.log('Sign out successful');
      // State will be updated by the onAuthStateChange listener
    } catch (error) {
      console.error('Sign out catch error:', error);
      
      // Ensure we clear the local state even if there's an error
      setAuthState({
        user: null,
        session: null,
        profile: null
      });
      
      // Show error to user
      if (error instanceof Error) {
        toast.error(`Sign out error: ${error.message}`);
      } else {
        toast.error('An unknown error occurred during sign out');
      }
    }
  };

  return (
    <AuthContext.Provider value={{ authState, signIn, signInWithGoogle, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
