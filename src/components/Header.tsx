
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
  Languages,
} from 'lucide-react';
import type { Profile } from '@/types/auth';
import { GeminiApiKeyDialog, getGeminiApiKeys } from './GeminiApiKeyDialog';
import { Link } from 'react-router-dom';
import CreditDisplay from './CreditDisplay';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { t, language, setLanguage, isRTL } = useLanguage();

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
                <h1 className="text-2xl font-bold text-gray-800">{t('header.jooy_studio')}</h1>
              </div>
              {user && <CreditDisplay credits={user.credits_remaining || 0} />}
            </div>

            {/* Center Group */}
            <div className="flex-1 flex justify-center items-center">
              <Button asChild variant="outline" size="sm" className="px-3">
                <Link
                  to="/tts-history"
                  title={t('header.virtual_tutor_tooltip')}
                >
                  <UserRound className="h-4 w-4 icon-start" />
                  {t('header.virtual_tutor')}
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
                <Upload className="h-4 w-4 icon-start" />
                {t('header.upload')}
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
                        <Share className="h-4 w-4 icon-start" />
                        {t('header.export')}
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
                  <DropdownMenuItem onClick={onQRExport} disabled={isQRExporting}>
                    <QrCode className="h-4 w-4 icon-start" />
                    <span dir={isRTL ? 'rtl' : 'ltr'}>{isQRExporting ? t('header.exporting') : t('header.export_qr_codes')}</span>
                  </DropdownMenuItem>

                  {/* Improved PDF with QR Codes Export */}
                  <div className="flex items-center">
                    <DropdownMenuItem
                      onClick={() => onPDFQRExport(qrCorner)}
                      disabled={isPDFQRExporting}
                      className="flex-grow"
                    >
                      <QrCode className="h-4 w-4 icon-start" />
                      <span dir={isRTL ? 'rtl' : 'ltr'}>{isPDFQRExporting ? t('header.processing') : t('header.download_pdf_qr')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="w-8 h-8 p-0 flex items-center justify-center">
                         <Settings className="h-4 w-4" />
                      </DropdownMenuSubTrigger>
                       <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            <DropdownMenuLabel dir={isRTL ? 'rtl' : 'ltr'}>{t('header.qr_position')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => onQRCornerChange('top-left')}>
                              <CornerDownLeft className="h-4 w-4 icon-start" />
                              <span dir={isRTL ? 'rtl' : 'ltr'}>{t('header.top_left')}</span>
                              {qrCorner === 'top-left' && <span className="text-xs ms-auto-rtl">✓</span>}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onQRCornerChange('top-right')}>
                              <CornerDownRight className="h-4 w-4 icon-start" />
                              <span dir={isRTL ? 'rtl' : 'ltr'}>{t('header.top_right')}</span>
                              {qrCorner === 'top-right' && <span className="text-xs ms-auto-rtl">✓</span>}
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                       </DropdownMenuPortal>
                    </DropdownMenuSub>
                  </div>

                  {user?.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onExport}>
                        <FileJson className="h-4 w-4 icon-start" />
                        <span dir={isRTL ? 'rtl' : 'ltr'}>{t('header.export_region_data')}</span>
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
                    <DropdownMenuSubTrigger>
                      <Languages className="h-4 w-4 icon-start" />
                      <span dir={isRTL ? 'rtl' : 'ltr'}>{t('header.language')}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onSelect={() => setLanguage('en')}>
                          <span>{t('header.english')}</span>
                          {language === 'en' && <span className="text-xs ms-auto-rtl">✓</span>}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setLanguage('ar')}>
                          <span dir="rtl">{t('header.arabic')}</span>
                          {language === 'ar' && <span className="text-xs ms-auto-rtl">✓</span>}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setGeminiDialogOpen(true)}>
                    <KeyRound className="h-4 w-4 icon-start" />
                    <span dir={isRTL ? 'rtl' : 'ltr'}>{t('header.api_keys')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSignOut}>
                    <LogOut className="h-4 w-4 icon-start" />
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
