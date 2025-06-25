
import React from 'react';
import { Coins } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import RTLButtonIcon from './RTLButtonIcon';

interface CreditDisplayProps {
  credits: number;
}

const CreditDisplay = ({ credits }: CreditDisplayProps) => {
  const { t, isRTL } = useLanguage();

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground bg-slate-100 rounded-full ${isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}`}>
      <RTLButtonIcon>
        <Coins className="h-4 w-4 text-yellow-500" />
      </RTLButtonIcon>
      <span dir={isRTL ? 'rtl' : 'ltr'}>{credits} {t('credits.credits')}</span>
    </div>
  );
};

export default CreditDisplay;
