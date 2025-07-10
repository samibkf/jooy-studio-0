import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist';
import { Region } from '@/types/regions';
import RegionOverlay from './RegionOverlay';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, MousePointer, Copy, Eye, EyeOff, Lock } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthProvider';
import { decryptData } from '@/utils/crypto';
import { pdfCacheService } from '@/services/pdfCacheService';
import { Separator } from '@/components/ui/separator';
import CompactPageNavigation from './CompactPageNavigation';
import { useLanguage } from '@/contexts/LanguageContext';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfViewerProps {
  documentId: string | null;
  regions: Region[];
  onRegionCreate: (region: Omit<Region, 'id'>) => void;
  onRegionUpdate: (region: Region) => void;
  selectedRegionId: string | null;
  onRegionSelect: (regionId: string | null) => void;
  onRegionDelete: (regionId: string) => void;
  isSelectionMode: boolean;
  currentSelectionType: 'area' | null;
  onCurrentSelectionTypeChange: (type: 'area' | null) => void;
  onPageChange?: (page: number) => void;
  isPrivate: boolean;
  onVisibilityChange: () => void;
  onDrmSettingsClick: () => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({
  documentId,
  regions,
  onRegionCreate,
  onRegionUpdate,
  selectedRegionId,
  onRegionSelect,
  onRegionDelete,
  isSelectionMode,
  currentSelectionType,
  onCurrentSelectionTypeChange,
  onPageChange,
  isPrivate,
  onVisibilityChange,
  onDrmSettingsClick,
}) => {
  const { authState } = useAuth();
  const { t, isRTL, language } = useLanguage();
  
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({
    x: 0,
    y: 0
  });
  const [selectionRect, setSelectionRect] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });
  const [selectionPoint, setSelectionPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isDoubleClickMode, setIsDoubleClickMode] = useState(false);
  const [preventCreateRegion, setPreventCreateRegion] = useState(false);
  const [isTemporarilyBlocked, setIsTemporarilyBlocked] = useState(false);
  const [creationTimeoutId, setCreationTimeoutId] = useState<number | null>(null);
  const [isCopyingPage, setIsCopyingPage] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageInputValue, setPageInputValue] = useState('');
  
  // Enhanced loading and error states
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const getNextRegionNumber = (pageNumber: number): number => {
    const pageRegions = regions.filter(region => region.page === pageNumber);
    if (pageRegions.length === 0) {
      return 1;
    }
    const regionNumbers = pageRegions.map(region => {
      const parts = region.name.split('_');
      return parts.length > 1 ? parseInt(parts[1], 10) : 0;
    }).filter(num => !isNaN(num));
    return Math.max(...regionNumbers, 0) + 1;
  };

  // Enhanced PDF loading with decryption and caching
  useEffect(() => {
    if (!documentId || !authState.user) return;
    
    setLoading(true);
    setLoadError(null);
    setDebugInfo('');
    
    const fetchAndLoadPdf = async () => {
      try {
        const cachedPdf = await pdfCacheService.getCachedPDF(documentId);
        let pdfData: ArrayBuffer;

        if (cachedPdf) {
          console.log(`[PDF VIEWER] ✅ Loaded PDF from cache: ${documentId}`);
          setDebugInfo(`Loaded from cache.\nSize: ${cachedPdf.byteLength} bytes`);
          pdfData = cachedPdf;
        } else {
          console.log(`[PDF VIEWER]  cache miss for: ${documentId}, fetching from server`);
          const functionUrl = `https://bohxienpthilrfwktokd.supabase.co/functions/v1/stream-pdf?document_id=${documentId}&user_id=${authState.user.id}`;
          const headers = {
            'Cache-Control': 'no-store',
            'Accept': 'application/pdf,application/octet-stream,*/*',
            'Authorization': `Bearer ${authState.session?.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHhpZW5wdGhpbHJmd2t0b2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2OTc3OTcsImV4cCI6MjA2MTI3Mzc5N30.4UO_pFmDauRz6Km5wTr3VHM95_GwyWKc1-pxGO1mImg'
          };

          console.log(`[PDF VIEWER] 🔍 Starting PDF fetch for document: ${documentId}`);
          setDebugInfo(`User: ${authState.user.id}\nDocument: ${documentId}\nFetching from: ${functionUrl}`);
          
          const res = await fetch(functionUrl, { headers });
          
          if (!res.ok) {
            const errorText = await res.text();
            console.error(`[PDF VIEWER] ❌ HTTP Error ${res.status}:`, errorText);
            const detailedError = `HTTP Error ${res.status}. The server said: "${errorText.substring(0, 300)}"`;
            setLoadError(detailedError);
            setDebugInfo(prev => prev + `\n\nERROR\nStatus: ${res.status}\nResponse: ${errorText}`);
            setLoading(false);
            return;
          }

          const encryptedData = await res.arrayBuffer();
          const keyB64 = res.headers.get('X-Encryption-Key');
          const ivB64 = res.headers.get('X-Encryption-IV');

          if (!keyB64 || !ivB64) {
            throw new Error('Encryption key or IV not found in response headers.');
          }

          setDebugInfo(prev => prev + `\nDecrypting data...`);
          const decryptedData = await decryptData(encryptedData, keyB64, ivB64);
          
          console.log(`[PDF VIEWER] 📊 Decrypted ArrayBuffer received: ${decryptedData.byteLength} bytes`);
          setDebugInfo(prev => prev + `\nDecrypted ArrayBuffer Size: ${decryptedData.byteLength} bytes`);
          
          await pdfCacheService.cachePDF(documentId, decryptedData);
          console.log(`[PDF VIEWER] 💾 Cached decrypted PDF for document: ${documentId}`);
          pdfData = decryptedData;
        }

        // Validate PDF header after decryption/retrieval
        const uint8Array = new Uint8Array(pdfData.slice(0, 8));
        const pdfHeader = Array.from(uint8Array).map(b => String.fromCharCode(b)).join('');
        console.log(`[PDF VIEWER] 🔍 PDF Header check: "${pdfHeader}"`);
        
        if (!pdfHeader.startsWith('%PDF-')) {
          console.error('[PDF VIEWER] ❌ Invalid PDF header:', pdfHeader);
          const errorMsg = `Invalid or corrupted PDF file. Expected "%PDF-" but got "${pdfHeader}"`;
          setLoadError(errorMsg);
          setDebugInfo(prev => prev + `\n\nERROR\n${errorMsg}`);
          setLoading(false);
          return;
        }

        console.log(`[PDF VIEWER] 📖 Attempting to load with PDF.js...`);
        setDebugInfo(prev => prev + `\nLoading with PDF.js...`);
        
        const loadingTask = pdfjsLib.getDocument({ 
          data: pdfData,
          verbosity: 1
        });
        
        const pdfDocument = await loadingTask.promise;
        
        console.log(`[PDF VIEWER] ✅ PDF loaded successfully: ${pdfDocument.numPages} pages`);
        setDebugInfo(prev => prev + `\nSuccess: ${pdfDocument.numPages} pages loaded.`);
        
        setPdf(pdfDocument);
        setTotalPages(pdfDocument.numPages);
        setCurrentPage(1);
        toast.success(`PDF loaded with ${pdfDocument.numPages} pages`);
        
      } catch (error) {
        console.error('[PDF VIEWER] ❌ PDF loading error:', error);
        
        let errorMessage = 'Unknown error';
        let debugDetails = '';
        
        if (error instanceof Error) {
          errorMessage = error.message;
          debugDetails = `${error.name}: ${error.message}`;
          if (error.stack) {
            debugDetails += `\n${error.stack.substring(0, 500)}`;
          }
        }
        
        setLoadError(`Failed to load PDF: ${errorMessage}`);
        setDebugInfo(prev => prev + `\n\nFATAL ERROR\n${debugDetails}`);
        toast.error(`Failed to load PDF: ${errorMessage}`);
        setPdf(null);
      }
      
      setLoading(false);
    };

    fetchAndLoadPdf();
  }, [documentId, authState.user, authState.session]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    const renderPage = async () => {
      try {
        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({
          scale
        });
        const canvas = canvasRef.current!;
        const canvasContext = canvas.getContext('2d');
        if (!canvasContext) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({
          canvasContext,
          viewport
        }).promise;
      } catch (error) {
        console.error('Error rendering page:', error);
        toast.error('Failed to render page');
      }
    };
    renderPage();
  }, [pdf, currentPage, scale]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRegionId && document.activeElement instanceof HTMLElement && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        onRegionDelete(selectedRegionId);
        toast.success(t('sidebar.region_deleted'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRegionId, onRegionDelete, t]);
  
  useEffect(() => {
    return () => {
      if (creationTimeoutId !== null) {
        window.clearTimeout(creationTimeoutId);
      }
    };
  }, [creationTimeoutId]);
  
  const createRegion = (rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    if (rect.width > 10 && rect.height > 10) {
      const nextNumber = getNextRegionNumber(currentPage);
      const regionName = `${currentPage}_${nextNumber}`;
      const newRegion: Omit<Region, 'id'> = {
        page: currentPage,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        type: 'area',
        name: regionName,
        description: ''
      };
      
      onRegionCreate(newRegion);
      
      setIsTemporarilyBlocked(true);
      const timeoutId = window.setTimeout(() => {
        setIsTemporarilyBlocked(false);
      }, 500);
      setCreationTimeoutId(timeoutId);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSelectionMode && !isDoubleClickMode || !containerRef.current || isTemporarilyBlocked) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    if (selectionPoint) {
      const currentRect = {
        x: selectionRect.x,
        y: selectionRect.y,
        width: selectionRect.width,
        height: selectionRect.height
      };
      
      setSelectionRect({
        x: 0,
        y: 0,
        width: 0,
        height: 0
      });
      setSelectionPoint(null);
      setIsSelecting(false);
      setIsDoubleClickMode(false);
      
      createRegion(currentRect);
    } else {
      setSelectionPoint({
        x,
        y
      });
      setSelectionRect({
        x,
        y,
        width: 0,
        height: 0
      });
      setIsSelecting(true);
    }
  };
  
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!containerRef.current || isTemporarilyBlocked) return;
    if (isSelectionMode) {
      setIsDoubleClickMode(false);
      setSelectionPoint(null);
      setSelectionRect({
        x: 0,
        y: 0,
        width: 0,
        height: 0
      });
      setIsSelecting(false);
      onCurrentSelectionTypeChange(null);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setIsDoubleClickMode(true);
    setSelectionPoint({
      x,
      y
    });
    setSelectionRect({
      x,
      y,
      width: 0,
      height: 0
    });
    setIsSelecting(true);
    onCurrentSelectionTypeChange('area');
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !containerRef.current || !selectionPoint) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setSelectionRect({
      x: Math.min(x, selectionPoint.x),
      y: Math.min(y, selectionPoint.y),
      width: Math.abs(x - selectionPoint.x),
      height: Math.abs(y - selectionPoint.y)
    });
  };
  
  const handleMouseUp = () => {
    return;
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage);
      window.getSelection()?.removeAllRanges();
      setSelectionPoint(null);
      setSelectionRect({
        x: 0,
        y: 0,
        width: 0,
        height: 0
      });
      setIsSelecting(false);
      setPreventCreateRegion(false);
      setIsDoubleClickMode(false);
    }
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage);
      window.getSelection()?.removeAllRanges();
      setSelectionPoint(null);
      setSelectionRect({
        x: 0,
        y: 0,
        width: 0,
        height: 0
      });
      setIsSelecting(false);
      setPreventCreateRegion(false);
      setIsDoubleClickMode(false);
    }
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    onPageChange?.(page);
    window.getSelection()?.removeAllRanges();
    setSelectionPoint(null);
    setSelectionRect({
      x: 0,
      y: 0,
      width: 0,
      height: 0
    });
    setIsSelecting(false);
    setPreventCreateRegion(false);
    setIsDoubleClickMode(false);
  };
  
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3.0));
  };
  
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };
  
  const handleEscKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && selectionPoint) {
      setSelectionPoint(null);
      setSelectionRect({
        x: 0,
        y: 0,
        width: 0,
        height: 0
      });
      setIsSelecting(false);
    }
  };
  
  const copyPageToClipboard = async () => {
    if (!canvasRef.current) {
      toast.error(t('pdf.canvas_not_available'));
      return;
    }
    
    try {
      setIsCopyingPage(true);
      
      const canvas = canvasRef.current;
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else toast.error(t('pdf.failed_create_blob'));
        }, 'image/png');
      });
      
      const clipboardItem = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([clipboardItem]);
      
      toast.success(t('pdf.page_copied'));
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error(t('pdf.copy_failed') + ': ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsCopyingPage(false);
    }
  };
  
  useEffect(() => {
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [selectionPoint]);
  
  const pageRegions = regions.filter(region => region.page === currentPage);
  
  useEffect(() => {
    setPreventCreateRegion(false);
  }, [currentPage]);
  
  const handleGoToPage = () => {
    const pageNum = parseInt(pageInputValue);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      onPageChange?.(pageNum);
      setPageInputValue('');
      setSelectionPoint(null);
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
      setIsSelecting(false);
      setPreventCreateRegion(false);
      setIsDoubleClickMode(false);
    } else {
      toast.error(`${t('pdf.page_number_error')} ${totalPages}`);
    }
  };

  const handlePageInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGoToPage();
    }
  };

  if (!documentId) {
    return <div className="flex flex-col items-center justify-center h-[calc(100vh-72px)] bg-muted">
        <div className="text-center p-10 w-full min-h-fit overflow-visible">
          <h2 
            key={`welcome-${language}`}
            className={`font-bold mb-2 text-3xl md:text-4xl ${isRTL ? 'gradient-text-orange-purple-rtl' : 'gradient-text-orange-purple-ltr'} leading-tight break-words`} 
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {t('pdf.welcome_title')}
          </h2>
        </div>
      </div>;
  }
  
  if (!authState.user) {
    return <div className="flex flex-col items-center justify-center h-[calc(100vh-72px)]">
      <span className="text-muted-foreground">{t('pdf.login_required')}</span>
    </div>;
  }
  
  if (loading) {
    return <div className="flex flex-col items-center justify-center h-[calc(100vh-72px)]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      <span className="mt-3">{t('pdf.loading_pdf')}</span>
      {debugInfo && (
        <div className="mt-4 text-sm text-muted-foreground max-w-md text-center">
          <details>
            <summary className="cursor-pointer">{t('pdf.debug_info')}</summary>
            <pre className="whitespace-pre-wrap text-xs mt-2 p-2 bg-muted rounded">
              {debugInfo}
            </pre>
          </details>
        </div>
      )}
    </div>
  }
  
  if (loadError) {
    return <div className="flex flex-col items-center justify-center h-[calc(100vh-72px)]">
      <span className="text-destructive mb-4">{loadError}</span>
      {debugInfo && (
        <div className="text-sm text-muted-foreground max-w-md">
          <details>
            <summary className="cursor-pointer">{t('pdf.debug_info')}</summary>
            <pre className="whitespace-pre-wrap text-xs mt-2 p-2 bg-muted rounded">
              {debugInfo}
            </pre>
          </details>
        </div>
      )}
      <Button 
        onClick={() => window.location.reload()} 
        variant="outline" 
        className="mt-4"
      >
        {t('pdf.retry')}
      </Button>
    </div>
  }

  return <div className="flex flex-col h-full w-full">
      <div className="bg-background border-b border-border p-2 w-full sticky top-0 z-10">
        <div className="flex items-center justify-center max-w-[1200px] mx-auto">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle 
                    pressed={currentSelectionType === 'area'} 
                    onPressedChange={() => onCurrentSelectionTypeChange(currentSelectionType === 'area' ? null : 'area')} 
                    aria-label="Toggle area selection tool" 
                    className={`h-9 w-9 icon-button-center gradient-border-orange-purple ${currentSelectionType === 'area' ? 'bg-blue-100 ring-2 ring-primary' : ''}`}
                  >
                    <MousePointer className="h-4 w-4" />
                    <span className="sr-only">{t('pdf.area_selection')}</span>
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('pdf.area_selection_tooltip')}</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={copyPageToClipboard} 
                    disabled={isCopyingPage || !canvasRef.current}
                    className="h-9 w-9 icon-button-center gradient-border-orange-purple"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">{t('pdf.copy_page')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('pdf.copy_page_tooltip')}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <Separator orientation="vertical" className="h-6" />

            <CompactPageNavigation
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />

            <Separator orientation="vertical" className="h-6" />
            
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleZoomOut} 
                    disabled={scale <= 0.5}
                    className="gradient-border-orange-purple"
                  >
                    -
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('pdf.zoom_out')}</p>
                </TooltipContent>
              </Tooltip>
              <span className="text-sm w-16 text-center">
                {Math.round(scale * 100)}%
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleZoomIn} 
                    disabled={scale >= 3}
                    className="gradient-border-orange-purple"
                  >
                    +
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('pdf.zoom_in')}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <Separator orientation="vertical" className="h-6" />
            
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onVisibilityChange}
                    className="h-9 w-9 icon-button-center gradient-border-orange-purple"
                  >
                    {isPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isPrivate ? t('pdf.make_public') : t('pdf.make_private')}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onDrmSettingsClick}
                    className="h-9 w-9 icon-button-center gradient-border-orange-purple"
                  >
                    <Lock className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('pdf.drm_settings')}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
      
      <ScrollArea className="flex-1 w-full h-[calc(100%-72px)] pdf-container">
        <div className="flex justify-center p-4">
          <div ref={containerRef} className={`pdf-page relative ${currentSelectionType === 'area' || isDoubleClickMode ? 'cursor-crosshair' : ''}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onDoubleClick={handleDoubleClick}>
            <canvas ref={canvasRef} style={{
            display: 'block'
          }} />
            
            {pageRegions.map(region => 
              <RegionOverlay 
                key={region.id} 
                region={region} 
                isSelected={region.id === selectedRegionId} 
                onSelect={() => onRegionSelect(region.id)} 
                onUpdate={onRegionUpdate} 
                scale={scale} 
                documentId={documentId || ''}
              />
            )}
            
            {isSelecting && <div className="region-selection" style={{
            left: selectionRect.x * scale,
            top: selectionRect.y * scale,
            width: selectionRect.width * scale,
            height: selectionRect.height * scale,
            position: 'absolute',
            border: '2px solid #2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            pointerEvents: 'none'
          }} />}
          </div>
        </div>
      </ScrollArea>
    </div>;
};

export default PdfViewer;
