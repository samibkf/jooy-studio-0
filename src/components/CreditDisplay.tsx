
import React from 'react';
import { Coins } from 'lucide-react';

interface CreditDisplayProps {
  credits: number;
}

const CreditDisplay = ({ credits }: CreditDisplayProps) => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground bg-slate-100 rounded-full">
      <Coins className="h-4 w-4 text-yellow-500" />
      <span>{credits} Credits</span>
    </div>
  );
};

export default CreditDisplay;
