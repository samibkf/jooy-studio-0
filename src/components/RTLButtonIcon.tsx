
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface RTLButtonIconProps {
  children: React.ReactNode;
  className?: string;
}

const RTLButtonIcon: React.FC<RTLButtonIconProps> = ({ children, className = '' }) => {
  const { isRTL } = useLanguage();
  
  // Apply appropriate margin classes based on RTL/LTR context
  const iconClasses = isRTL 
    ? `ml-2 ${className}` // margin-left for RTL (icon on right side of text)
    : `mr-2 ${className}`; // margin-right for LTR (icon on left side of text)
  
  return (
    <span className={iconClasses}>
      {children}
    </span>
  );
};

export default RTLButtonIcon;
