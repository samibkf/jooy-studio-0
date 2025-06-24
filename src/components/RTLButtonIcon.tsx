
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface RTLButtonIconProps {
  children: React.ReactNode;
  className?: string;
}

const RTLButtonIcon: React.FC<RTLButtonIconProps> = ({ children, className = '' }) => {
  const { isRTL } = useLanguage();
  
  // For RTL, we need to position the icon on the right side (beginning of Arabic text)
  // We'll use CSS classes that control flex ordering and margins
  const iconClasses = isRTL 
    ? `order-2 ml-2 ${className}` // In RTL: icon goes after text (right side) with left margin
    : `order-1 mr-2 ${className}`; // In LTR: icon goes before text (left side) with right margin
  
  return (
    <span className={iconClasses}>
      {children}
    </span>
  );
};

export default RTLButtonIcon;
