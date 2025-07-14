import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';

export const useOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { authState } = useAuth();

  useEffect(() => {
    const checkOnboardingStatus = () => {
      // Only show onboarding if user is authenticated and has a profile
      if (authState.session && authState.profile) {
        const needsOnboarding = !(authState.profile as any).onboarding_completed;
        setShowOnboarding(needsOnboarding);
      } else {
        setShowOnboarding(false);
      }
      setIsLoading(false);
    };

    checkOnboardingStatus();
  }, [authState.session, authState.profile]);

  const completeOnboarding = () => {
    setShowOnboarding(false);
  };

  return {
    showOnboarding,
    isLoading,
    completeOnboarding,
  };
};