import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download, File, LogOut, QrCode, KeyRound, Mic } from 'lucide-react';
import type { Profile } from '@/types/auth';
import QRCornerSelector from './QRCornerSelector';
import { GeminiApiKeyDialog, getGeminiApiKeys } from './GeminiApiKeyDialog';
import { Link } from 'react-router-dom';
import CreditDisplay from './CreditDisplay';

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
          {/* Left Group */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <File className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-gray-800">Book+ Studio</h1>
            </div>
            {user && <CreditDisplay credits={user.credits_remaining || 0} />}
            <Button
              onClick={() => setGeminiDialogOpen(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 px-3"
              title="Set Gemini API Key for AI generation"
            >
              <KeyRound  className={`h-4 w-4 transition-colors ${isGeminiKeySet ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
              API keys
            </Button>
          </div>
          
          {/* Center Group */}
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm" className="px-3">
                <Link to="/tts-history" title="View Virtual Tutor history and request new sessions">
                <Mic className="h-4 w-4 mr-2" />
                Virtual Tutor
                </Link>
            </Button>
            <Button 
                onClick={onUploadClick} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2 px-3"
            >
                <Upload className="h-4 w-4" />
                Upload
            </Button>
            <Button 
                onClick={onQRExport} 
                disabled={!hasDocument || isQRExporting}
                className="flex items-center gap-2 px-3"
                variant="outline"
                size="sm"
                title={!hasDocument ? "Select a document with a valid PDF to export QR codes" : "Export QR codes for all pages"}
            >
                <QrCode className="h-4 w-4" />
                {isQRExporting ? "Exporting..." : ""}
            </Button>

            <div className="flex items-center">
                <Button 
                onClick={() => onPDFQRExport(qrCorner)} 
                disabled={!hasDocument || isPDFQRExporting}
                className="flex items-center gap-2 rounded-r-none px-3"
                variant="outline"
                size="sm"
                title={!hasDocument ? "Select a document with a valid PDF to embed QR codes" : "Download PDF with embedded QR codes"}
                >
                <Download className="h-4 w-4" />
                {isPDFQRExporting ? "Processing..." : "Download"}
                </Button>
                
                <div className="border-l">
                <QRCornerSelector
                    value={qrCorner}
                    onChange={onQRCornerChange}
                    disabled={!hasDocument || isPDFQRExporting}
                />
                </div>
            </div>

            {user?.role === 'admin' && (
                <Button 
                onClick={onExport} 
                disabled={!hasDocument}
                variant="outline"
                size="sm"
                className="px-3"
                title={!hasDocument ? "Select a document with a valid PDF to export" : "Export region mappings"}
                >
                <Download className="h-4 w-4" />
                Export Data
                </Button>
            )}
          </div>
          
          {/* Right Group */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
                {user?.full_name || user?.email}
            </span>
            <Button
                onClick={onSignOut}
                variant="ghost"
                size="sm"
                className="text-muted-foreground px-2"
                title="Sign Out"
            >
                <LogOut className="h-4 w-4" />
            </Button>
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