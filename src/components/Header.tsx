import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Upload,
  Download,
  File,
  LogOut,
  QrCode,
  KeyRound,
  UserRound,
  CircleUserRound,
  ChevronDown,
  ChevronUp,
  CornerDownLeft,
  CornerDownRight,
} from 'lucide-react';
import type { Profile } from '@/types/auth';
import { GeminiApiKeyDialog, getGeminiApiKeys } from '@/components/GeminiApiKeyDialog';
import { Link } from 'react-router-dom';
import CreditDisplay from '@/components/CreditDisplay';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  onSignOut,
}: HeaderProps) => {
  const [isGeminiDialogOpen, setGeminiDialogOpen] = useState(false);
  const [isGeminiKeySet, setGeminiKeySet] = useState(false);
  const [isQrDropdownOpen, setIsQrDropdownOpen] = useState(false);

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
              <h1 className="text-2xl font-bold text-gray-800">Jooy Studio</h1>
            </div>
            {user && <CreditDisplay credits={user.credits_remaining || 0} />}
          </div>

          {/* Center Group */}
          <div className="flex-1 flex justify-center items-center">
            <Button asChild variant="outline" size="sm" className="px-3">
              <Link
                to="/tts-history"
                title="View Virtual Tutor history and request new sessions"
              >
                <UserRound className="h-4 w-4 mr-2" />
                Virtual Tutor
              </Link>
            </Button>
          </div>

          {/* Right Group */}
          <div className="flex items-center gap-4">
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
              title={
                !hasDocument
                  ? 'Select a document with a valid PDF to export QR codes'
                  : 'Export QR codes for all pages'
              }
            >
              <QrCode className="h-4 w-4" />
              {isQRExporting ? 'Exporting...' : 'QRs'}
            </Button>
            <div className="flex items-center">
              <DropdownMenu
                open={isQrDropdownOpen}
                onOpenChange={setIsQrDropdownOpen}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 px-3"
                    disabled={!hasDocument || isPDFQRExporting}
                  >
                    <Download className="h-4 w-4" />
                    {isPDFQRExporting ? 'Processing...' : 'Download'}
                    {isQrDropdownOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>QR Code Position</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onQRCornerChange('top-left')}>
                    <CornerDownLeft className="mr-2 h-4 w-4" />
                    <span>Top Left</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onQRCornerChange('top-right')}
                  >
                    <CornerDownRight className="mr-2 h-4 w-4" />
                    <span>Top Right</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onPDFQRExport(qrCorner)}
                    className="bg-primary text-primary-foreground focus:bg-primary/90 focus:text-primary-foreground"
                  >
                    Download with QR
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {user?.role === 'admin' && (
              <Button
                onClick={onExport}
                disabled={!hasDocument}
                variant="outline"
                size="sm"
                className="px-3"
                title={
                  !hasDocument
                    ? 'Select a document with a valid PDF to export'
                    : 'Export region mappings'
                }
              >
                <Download className="h-4 w-4" />
                Export Data
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <CircleUserRound className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {user?.full_name || user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setGeminiDialogOpen(true)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  <span>API Keys</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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