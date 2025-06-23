import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Upload,
  Share,
  File,
  LogOut,
  QrCode,
  KeyRound,
  UserRound,
  CircleUserRound,
  CornerDownLeft,
  CornerDownRight,
  FileJson,
  Settings,
} from 'lucide-react';
import type { Profile } from '@/types/auth';
import { GeminiApiKeyDialog, getGeminiApiKeys } from './GeminiApiKeyDialog';
import { Link } from 'react-router-dom';
import CreditDisplay from './CreditDisplay';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

  useEffect(() => {
    setGeminiKeySet(getGeminiApiKeys().length > 0);
  }, []);

  const handleKeySave = () => {
    setGeminiKeySet(getGeminiApiKeys().length > 0);
  };

  const isExportDisabled = !hasDocument || isQRExporting || isPDFQRExporting;

  return (
    <>
      <TooltipProvider>
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
            <div className="flex items-center gap-2">
              <Button
                onClick={onUploadClick}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 px-3"
              >
                <Upload className="h-4 w-4" />
                Upload PDF
              </Button>

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 px-3"
                        disabled={isExportDisabled}
                      >
                        <Share className="h-4 w-4" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Export options for the selected document</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onQRExport} disabled={isQRExporting}>
                    <QrCode className="mr-2 h-4 w-4" />
                    <span>{isQRExporting ? 'Exporting...' : 'Export QR Codes (.zip)'}</span>
                  </DropdownMenuItem>

                  {/* Improved PDF with QR Codes Export */}
                  <div className="flex items-center">
                    <DropdownMenuItem
                      onClick={() => onPDFQRExport(qrCorner)}
                      disabled={isPDFQRExporting}
                      className="flex-grow"
                    >
                      <QrCode className="mr-2 h-4 w-4" />
                      <span>{isPDFQRExporting ? 'Processing...' : 'Download PDF with QRs'}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="w-8 h-8 p-0 flex items-center justify-center">
                         <Settings className="h-4 w-4" />
                      </DropdownMenuSubTrigger>
                       <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            <DropdownMenuLabel>QR Position</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => onQRCornerChange('top-left')}>
                              <CornerDownLeft className="mr-2 h-4 w-4" />
                              <span>Top Left</span>
                              {qrCorner === 'top-left' && <span className="ml-auto text-xs">✓</span>}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onQRCornerChange('top-right')}>
                              <CornerDownRight className="mr-2 h-4 w-4" />
                              <span>Top Right</span>
                              {qrCorner === 'top-right' && <span className="ml-auto text-xs">✓</span>}
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                       </DropdownMenuPortal>
                    </DropdownMenuSub>
                  </div>


                  {user?.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onExport}>
                        <FileJson className="mr-2 h-4 w-4" />
                        <span>Export Region Data</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <CircleUserRound className="h-6 w-6" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Account</p>
                  </TooltipContent>
                </Tooltip>
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
      </TooltipProvider>
      <GeminiApiKeyDialog
        isOpen={isGeminiDialogOpen}
        onOpenChange={setGeminiDialogOpen}
        onKeySave={handleKeySave}
      />
    </>
  );
};

export default Header;