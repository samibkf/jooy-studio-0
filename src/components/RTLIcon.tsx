
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LucideIcon } from 'lucide-react';

interface RTLIconProps {
  icon: LucideIcon;
  className?: string;
  size?: number;
  shouldFlip?: boolean;
}

const RTLIcon: React.FC<RTLIconProps> = ({ 
  icon: Icon, 
  className = '', 
  size = 16, 
  shouldFlip = false 
}) => {
  const { isRTL } = useLanguage();
  
  const iconClassName = isRTL && shouldFlip 
    ? `${className} rtl-flip-icon` 
    : className;
  
  return <Icon className={iconClassName} size={size} />;
};

export default RTLIcon;
