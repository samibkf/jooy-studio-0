import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download, File, LogOut, QrCode, FileText, Sparkles } from 'lucide-react';
import type { Profile } from '@/types/auth';
import QRCornerSelector from './QRCornerSelector';
import { GeminiApiKeyDialog, getGeminiApiKeys } from './GeminiApiKeyDialog';

interface HeaderProps {
  onUploadClick: () => void;
  onExport: () => void;
  onQRExport: () => void;
  onPDFQRExport: (corner: 'top-left' | 'top-right') => void;
  hasDocument: boolean;
  isQRExporting: boolean;
  isPDFQRExporting: boolean;
  qrCorner: 'top-left' | 'top-right';
  onQRCornerChange: (corner: 'top-left' | 'top-right') => void;
  user: Profile | null;
  onSignOut: () => Promise<void>;
}

const Header = ({ 
  onUploadClick, 
  onExport, 
  onQRExport,
  onPDFQRExport,
  hasDocument, 
  isQRExporting,
  isPDFQRExporting,
  qrCorner,
  onQRCornerChange,
  user, 
  onSignOut 
}: HeaderProps) => {
  const [isGeminiDialogOpen, setGeminiDialogOpen] = useState(false);
  const [isGeminiKeySet, setGeminiKeySet] = useState(false);

  useEffect(() => {
    setGeminiKeySet(getGeminiApiKeys().length > 0);
  }, []);

  const handleKeySave = () => {
    setGeminiKeySet(getGeminiApiKeys().length > 0);
  };
  
  return (
    <>
      <header className="bg-white border-b border-gray-200 shadow-sm py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <File className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-gray-800">Book+ Studio</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-muted-foreground">
                {user.full_name || user.email}
              </span>
            )}
            
            <div className="flex items-center gap-3">
              <Button 
                onClick={onUploadClick} 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload PDF
              </Button>
              
              {user?.role === 'admin' && (
                <Button 
                  onClick={onExport} 
                  disabled={!hasDocument}
                  className="flex items-center gap-2"
                  title={!hasDocument ? "Select a document with a valid PDF to export" : "Export region mappings"}
                >
                  <Download className="h-4 w-4" />
                  Export Data
                </Button>
              )}

              <Button
                onClick={() => setGeminiDialogOpen(true)}
                variant="outline"
                className="flex items-center gap-2"
                title="Set Gemini API Key for AI generation"
              >
                <Sparkles className={`h-4 w-4 transition-colors ${isGeminiKeySet ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                Gemini API
              </Button>

              <Button 
                onClick={onQRExport} 
                disabled={!hasDocument || isQRExporting}
                className="flex items-center gap-2"
                variant="outline"
                title={!hasDocument ? "Select a document with a valid PDF to export QR codes" : "Export QR codes for all pages"}
              >
                <QrCode className="h-4 w-4" />
                {isQRExporting ? "Generating..." : "Export QR Codes"}
              </Button>

              <div className="flex items-center">
                <Button 
                  onClick={() => onPDFQRExport(qrCorner)} 
                  disabled={!hasDocument || isPDFQRExporting}
                  className="flex items-center gap-2 rounded-r-none"
                  variant="outline"
                  title={!hasDocument ? "Select a document with a valid PDF to embed QR codes" : "Download PDF with embedded QR codes"}
                >
                  <FileText className="h-4 w-4" />
                  {isPDFQRExporting ? "Processing..." : "Download PDF with QR"}
                </Button>
                
                <div className="border-l">
                  <QRCornerSelector
                    value={qrCorner}
                    onChange={onQRCornerChange}
                    disabled={!hasDocument || isPDFQRExporting}
                  />
                </div>
              </div>

              <Button
                onClick={onSignOut}
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      <GeminiApiKeyDialog
        isOpen={isGeminiDialogOpen}
        onOpenChange={setGeminiDialogOpen}
        onKeySave={handleKeySave}
      />
    </>
  );
};

export default Header;
