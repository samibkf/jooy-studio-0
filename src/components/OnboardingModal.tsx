import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthProvider';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

export const OnboardingModal = ({ open, onComplete }: OnboardingModalProps) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const { authState } = useAuth();
  const { t, isRTL } = useLanguage();

  const handleComplete = async () => {
    if (!authState.user) return;
    
    setIsCompleting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', authState.user.id);

      if (error) throw error;
      
      toast.success(isRTL ? 'تم إكمال التوجيه بنجاح!' : 'Onboarding completed successfully!');
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error(isRTL ? 'حدث خطأ في إكمال التوجيه' : 'Error completing onboarding');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSkip = async () => {
    await handleComplete(); // Same action as complete
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-4xl w-[95vw] max-h-[90vh] p-0 overflow-hidden"
        hideCloseButton
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-center">
              {isRTL ? 'مرحباً بك في جوي ستوديو!' : 'Welcome to Jooy Studio!'}
            </h2>
            <p className="text-muted-foreground text-center mt-2">
              {isRTL 
                ? 'شاهد هذا العرض التوضيحي السريع لتتعلم كيفية استخدام المنصة'
                : 'Watch this quick demo to learn how to use the platform'
              }
            </p>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <div className="relative w-full h-full min-h-[60vh]">
              <iframe 
                src="https://app.supademo.com/embed/cmd1nzhkv00fhvm0icjfwiupc?embed_v=2" 
                loading="lazy" 
                title="Jooy Demo - short" 
                allow="clipboard-write" 
                className="absolute inset-0 w-full h-full border-0"
                style={{ 
                  width: '100%', 
                  height: '100%',
                  minHeight: '400px'
                }}
              />
            </div>
          </div>
          
          <div className="p-6 border-t bg-background/50 backdrop-blur-sm">
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={handleSkip}
                disabled={isCompleting}
                className="min-w-24"
              >
                {isRTL ? 'تخطي' : 'Skip'}
              </Button>
              <Button
                onClick={handleComplete}
                disabled={isCompleting}
                className="min-w-24"
              >
                {isCompleting 
                  ? (isRTL ? 'جاري الإكمال...' : 'Completing...') 
                  : (isRTL ? 'إكمال' : 'Complete')
                }
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};