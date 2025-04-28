
import React from 'react';
import { Check, Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const LanguageSelector = () => {
  const { language, setLanguage, t } = useLanguage();

  // Add this key to translations if it doesn't exist
  const selectLanguageText = t('languages.selectLanguage') || 'Select language';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground" title={selectLanguageText}>
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32 min-w-[150px]" forceMount>
        <DropdownMenuItem onClick={() => setLanguage('en')}>
          <div className="flex items-center justify-between w-full">
            <span>{t('languages.english')}</span>
            {language === 'en' && <Check className="h-4 w-4" />}
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage('ar')}>
          <div className="flex items-center justify-between w-full">
            <span>{t('languages.arabic')}</span>
            {language === 'ar' && <Check className="h-4 w-4" />}
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage('fr')}>
          <div className="flex items-center justify-between w-full">
            <span>{t('languages.french')}</span>
            {language === 'fr' && <Check className="h-4 w-4" />}
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
