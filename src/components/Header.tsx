
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download, File, LogOut, QrCode, FileText, KeyRound, History, Settings, Mic } from 'lucide-react';
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
  onSettingsClick: () => void;
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
  onSettingsClick,
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
              <>
                <CreditDisplay credits={user.credits_remaining || 0} />
                <span className="text-sm text-muted-foreground">
                  {user.full_name || user.email}
                </span>
              </>
            )}
            
            <div className="flex items-center gap-6">
              {/* Left side - AI/Generation Tools */}
              <div className="flex items-center gap-2">
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

                <Button asChild variant="outline" size="sm" className="px-3">
                  <Link to="/tts-history" title="View TTS History and request new conversions">
                    <Mic className="h-4 w-4 mr-2" />
                    TTS Requests
                  </Link>
                </Button>
              </div>

              {/* Right side - Document Operations */}
              <div className="flex items-center gap-2">
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
                  {isQRExporting ? "Exporting..." : "Export QR Codes"}
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

                <Button
                  onClick={onSettingsClick}
                  disabled={!hasDocument}
                  variant="outline"
                  size="sm"
                  className="px-2"
                  title={!hasDocument ? "Select a document to view settings" : "Document Settings"}
                >
                  <Settings className="h-4 w-4" />
                </Button>

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
