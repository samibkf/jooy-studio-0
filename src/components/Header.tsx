
import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download, File } from 'lucide-react';

interface HeaderProps {
  onUploadClick: () => void;
  onExport: () => void;
  hasDocument: boolean;
}

const Header = ({ onUploadClick, onExport, hasDocument }: HeaderProps) => {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <File className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-gray-800">PDF Region Mapper</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={onUploadClick} 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload PDF
          </Button>
          
          <Button 
            onClick={onExport} 
            disabled={!hasDocument}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
