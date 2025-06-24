
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface RTLButtonIconProps {
  children: React.ReactNode;
  className?: string;
}

const RTLButtonIcon: React.FC<RTLButtonIconProps> = ({ children, className = '' }) => {
  const { isRTL } = useLanguage();
  
  // For RTL with flex-direction: row-reverse, we need right margin
  // For LTR with flex-direction: row, we need right margin
  // The flex-direction: row-reverse will automatically move the icon to the right (beginning of Arabic text)
  const iconClasses = isRTL 
    ? `mr-2 ${className}` // Right margin for RTL (icon will be on right due to row-reverse)
    : `mr-2 ${className}`; // Right margin for LTR (icon will be on left)
  
  return (
    <span className={iconClasses}>
      {children}
    </span>
  );
};

export default RTLButtonIcon;
