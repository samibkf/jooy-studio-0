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
  CornerDownLeft,
  CornerDownRight,
  FileJson,
  Settings,
  Languages,
  Moon,
  Sun,
} from 'lucide-react';
import type { Profile } from '@/types/auth';
import { GeminiApiKeyDialog, getGeminiApiKeys } from './GeminiApiKeyDialog';
import { Link } from 'react-router-dom';
import CreditDisplay from './CreditDisplay';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import RTLButtonIcon from './RTLButtonIcon';
import GradientSvgDefs from './GradientSvgDefs';
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
  onOpenApiDialog?: React.MutableRefObject<(() => void) | null>;
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
  onOpenApiDialog,
}: HeaderProps) => {
  const [isGeminiDialogOpen, setGeminiDialogOpen] = useState(false);
  const [isGeminiKeySet, setGeminiKeySet] = useState(false);
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setGeminiKeySet(getGeminiApiKeys().length > 0);
  }, []);

  // Expose dialog opener function to parent
  useEffect(() => {
    if (onOpenApiDialog) {
      onOpenApiDialog.current = () => setGeminiDialogOpen(true);
    }
  }, [onOpenApiDialog]);

  const handleKeySave = () => {
    setGeminiKeySet(getGeminiApiKeys().length > 0);
  };

  const isExportDisabled = !hasDocument || isQRExporting || isPDFQRExporting;

  return (
    <>
      <GradientSvgDefs />
      <TooltipProvider>
        <header className="bg-card border-b border-border shadow-sm py-4">
          <div className="container mx-auto px-4 flex justify-between items-center">
            {/* Left Group */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <File className="h-6 w-6 text-primary gradient-icon-orange-purple" />
                <h1 className="text-2xl font-bold gradient-text-orange-purple">{t('header.jooy_studio')}</h1>
              </div>
              {user && <CreditDisplay credits={user.credits_remaining || 0} />}
            </div>

            {/* Center Group */}
            <div className="flex-1 flex justify-center items-center">
              <Button asChild size="sm" className={`px-3 gradient-bg-orange-purple ${isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}`}>
                <Link
                  to="/tts-history"
                  title={t('header.virtual_tutor_tooltip')}
                >
                  <RTLButtonIcon>
                    <UserRound className="h-4 w-4" />
                  </RTLButtonIcon>
                  <span dir={isRTL ? 'rtl' : 'ltr'}>{t('header.virtual_tutor')}</span>
                </Link>
              </Button>
            </div>

            {/* Right Group */}
            <div className="flex items-center gap-2">
              <Button
                onClick={onUploadClick}
                variant="outline"
                size="sm"
                className={`px-3 gradient-border-orange-purple ${isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}`}
              >
                <RTLButtonIcon>
                  <Upload className="h-4 w-4 gradient-icon-orange-purple" />
                </RTLButtonIcon>
                <span dir={isRTL ? 'rtl' : 'ltr'}>{t('header.upload')}</span>
              </Button>

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`px-3 gradient-border-orange-purple ${isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}`}
                        disabled={isExportDisabled}
                      >
                        <RTLButtonIcon>
                          <Download className="h-4 w-4 gradient-icon-orange-purple" />
                        </RTLButtonIcon>
                        <span dir={isRTL ? 'rtl' : 'ltr'}>{t('header.export')}</span>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('header.export_tooltip')}</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="min-w-[200px]">
                  <DropdownMenuLabel>{t('header.export_options')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onQRExport} disabled={isQRExporting} className={isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}>
                    <RTLButtonIcon>
                      <QrCode className="h-4 w-4" />
                    </RTLButtonIcon>
                    <span dir={isRTL ? 'rtl' : 'ltr'}>{isQRExporting ? t('header.exporting') : t('header.export_qr_codes')}</span>
                  </DropdownMenuItem>

                  {/* Improved PDF with QR Codes Export */}
                  <div className="flex items-center">
                    <DropdownMenuItem
                      onClick={() => onPDFQRExport(qrCorner)}
                      disabled={isPDFQRExporting}
                      className={`flex-grow ${isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}`}
                    >
                      <RTLButtonIcon>
                        <QrCode className="h-4 w-4" />
                      </RTLButtonIcon>
                      <span dir={isRTL ? 'rtl' : 'ltr'}>{isPDFQRExporting ? t('header.processing') : t('header.download_pdf_qr')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="w-8 h-8 p-0 icon-button-center">
                         <Settings className="h-4 w-4" />
                      </DropdownMenuSubTrigger>
                       <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            <DropdownMenuLabel dir={isRTL ? 'rtl' : 'ltr'}>{t('header.qr_position')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => onQRCornerChange('top-left')} className={isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}>
                              <RTLButtonIcon>
                                <CornerDownLeft className="h-4 w-4" />
                              </RTLButtonIcon>
                              <span dir={isRTL ? 'rtl' : 'ltr'}>{t('header.top_left')}</span>
                              {qrCorner === 'top-left' && <span className="text-xs ml-auto">✓</span>}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onQRCornerChange('top-right')} className={isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}>
                              <RTLButtonIcon>
                                <CornerDownRight className="h-4 w-4" />
                              </RTLButtonIcon>
                              <span dir={isRTL ? 'rtl' : 'ltr'}>{t('header.top_right')}</span>
                              {qrCorner === 'top-right' && <span className="text-xs ml-auto">✓</span>}
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                       </DropdownMenuPortal>
                    </DropdownMenuSub>
                  </div>

                  {user?.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onExport} className={isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}>
                        <RTLButtonIcon>
                          <FileJson className="h-4 w-4" />
                        </RTLButtonIcon>
                        <span dir={isRTL ? 'rtl' : 'ltr'}>{t('header.export_region_data')}</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Theme Toggle Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="icon-button-center"
                  >
                    {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}</p>
                </TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full icon-button-center">
                        <CircleUserRound className="h-6 w-6" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('header.account')}</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <DropdownMenuLabel dir={isRTL ? 'rtl' : 'ltr'}>
                    {user?.full_name || user?.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Language Switcher */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className={isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}>
                      <RTLButtonIcon>
                        <Languages className="h-4 w-4" />
                      </RTLButtonIcon>
                      <span dir={isRTL ? 'rtl' : 'ltr'}>{t('header.language')}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onSelect={() => setLanguage('en')}>
                          <span>{t('header.english')}</span>
                          {language === 'en' && <span className="text-xs ml-auto">✓</span>}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setLanguage('ar')}>
                          <span dir="rtl">{t('header.arabic')}</span>
                          {language === 'ar' && <span className="text-xs ml-auto">✓</span>}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setGeminiDialogOpen(true)} className={isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}>
                    <RTLButtonIcon>
                      <KeyRound className="h-4 w-4" />
                    </RTLButtonIcon>
                    <span dir={isRTL ? 'rtl' : 'ltr'}>{t('header.api_keys')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSignOut} className={isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}>
                    <RTLButtonIcon>
                      <LogOut className="h-4 w-4" />
                    </RTLButtonIcon>
                    <span dir={isRTL ? 'rtl' : 'ltr'}>{t('header.sign_out')}</span>
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
