import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist';
// pdfjs worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

import { Region } from '@/types/regions';
import RegionOverlay from './RegionOverlay';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PdfViewerProps {
  file: File | null;
  regions: Region[];
  onRegionCreate: (region: Omit<Region, "id">) => void;
  onRegionUpdate: (region: Region) => void;
  selectedRegionId: string | null;
  onRegionSelect: (regionId: string | null) => void;
  isSelectionMode: boolean;
  currentSelectionType: 'text' | 'image' | 'area' | null;
}

const PdfViewer: React.FC<PdfViewerProps> = ({
  file,
  regions,
  onRegionCreate,
  onRegionUpdate,
  selectedRegionId,
  onRegionSelect,
  isSelectionMode,
  currentSelectionType,
}) => {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionRect, setSelectionRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [debugMode, setDebugMode] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const selectionTimeoutRef = useRef<number | null>(null);

  // ---- PDF loading ----
  useEffect(() => {
    if (!file) return;
    const loadPdf = async () => {
      try {
        const fileArrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: fileArrayBuffer });
        const pdfDocument = await loadingTask.promise;
        setPdf(pdfDocument);
        setTotalPages(pdfDocument.numPages);
        setCurrentPage(0);
        toast.success(`PDF loaded with ${pdfDocument.numPages} pages`);
      } catch (error) {
        console.error('Error loading PDF:', error);
        toast.error('Failed to load PDF');
      }
    };
    loadPdf();
  }, [file]);

  // ---- Render current page ----
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    const renderPage = async () => {
      try {
        const page = await pdf.getPage(currentPage + 1);
        const viewport = page.getViewport({ scale });

        // --- Canvas ---
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // --- Text layer cleanup ---
        if (textLayerRef.current) {
          textLayerRef.current.innerHTML = '';
          textLayerRef.current.style.width = `${viewport.width}px`;
          textLayerRef.current.style.height = `${viewport.height}px`;
        }

        // --- Render PDF page to canvas ---
        await page.render({ canvasContext: ctx, viewport }).promise;

        // --- Text layer rendering using pdf.js logic ---
        if (textLayerRef.current) {
          const textContent = await page.getTextContent();
          // This array holds references to the actual DOM nodes, for selection
          const textDivs: HTMLSpanElement[] = [];

          // Borrow logic from pdf.js TextLayerBuilder for correct positioning
          for (let i = 0; i < textContent.items.length; i++) {
            // @ts-ignore
            const item = textContent.items[i];
            // Transform item matrix into canvas coordinates
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);

            // Font size and transforms: see pdf.js's Web/TextLayerBuilder.js
            const [a, b, c, d, e, f] = tx;
            const left = e;
            // Top adjustment: subtract font size (for vertical text alignment)
            const fontSize = Math.sqrt(a * a + b * b);
            const top = f - fontSize;

            const textSpan = document.createElement('span');
            textSpan.textContent = item.str;
            textSpan.style.position = 'absolute';
            textSpan.style.left = `${left}px`;
            textSpan.style.top = `${top}px`;
            textSpan.style.fontSize = `${fontSize}px`;
            textSpan.style.fontFamily = 'sans-serif';
            textSpan.style.whiteSpace = 'pre';
            textSpan.style.transform = `matrix(${a / fontSize}, ${b / fontSize}, ${c / fontSize}, ${d / fontSize}, 0, 0)`;
            textSpan.style.userSelect = 'text';
            textSpan.className = 'text-item';
            textLayerRef.current.appendChild(textSpan);
            textDivs.push(textSpan);
          }
        }
        // Enable selection mode
        toggleTextSelectionMode(currentSelectionType === 'text');
      } catch (error) {
        console.error('Error rendering page:', error);
        toast.error('Failed to render page');
      }
    };
    renderPage();
    // eslint-disable-next-line
  }, [pdf, currentPage, scale, debugMode, currentSelectionType]);

  // ---- Selection mode toggling ----
  const toggleTextSelectionMode = useCallback((enabled: boolean) => {
    if (!textLayerRef.current) return;
    if (enabled) {
      textLayerRef.current.classList.add('text-selection-enabled');
      textLayerRef.current.classList.remove('text-selection-disabled');
      document.addEventListener('mouseup', handleTextSelection);
    } else {
      textLayerRef.current.classList.remove('text-selection-enabled');
      textLayerRef.current.classList.add('text-selection-disabled');
      document.removeEventListener('mouseup', handleTextSelection);
      window.getSelection()?.removeAllRanges();
    }
  }, [handleTextSelection]);

  // Keep in sync with selection type
  useEffect(() => {
    toggleTextSelectionMode(currentSelectionType === 'text');
    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
    };
  }, [currentSelectionType, toggleTextSelectionMode]);

  // ---- Process browser selection into region ----
  const handleTextSelection = useCallback((e: MouseEvent) => {
    if (selectionTimeoutRef.current) {
      window.clearTimeout(selectionTimeoutRef.current);
    }
    selectionTimeoutRef.current = window.setTimeout(() => {
      if (currentSelectionType !== 'text' || !containerRef.current || !textLayerRef.current) return;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
      try {
        const range = selection.getRangeAt(0);
        if (!textLayerRef.current.contains(range.commonAncestorContainer)) return;
        const rects = range.getClientRects();
        if (rects.length === 0) return;
        const selectedText = selection.toString().trim();
        if (!selectedText) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
        Array.from(rects).forEach(rect => {
          minX = Math.min(minX, rect.left);
          minY = Math.min(minY, rect.top);
          maxX = Math.max(maxX, rect.right);
          maxY = Math.max(maxY, rect.bottom);
        });
        const x = minX - containerRect.left;
        const y = minY - containerRect.top;
        const width = maxX - minX;
        const height = maxY - minY;
        if (width > 5 && height > 5 && selectedText) {
          const newRegion: Omit<Region, "id"> = {
            page: currentPage,
            x,
            y,
            width,
            height,
            type: 'text',
            name: selectedText.length > 20 ? `${selectedText.substring(0, 20)}...` : selectedText,
            audioPath: '',
            description: selectedText
          };
          onRegionCreate(newRegion);
          toast.success('Text region created');
          window.getSelection()?.removeAllRanges();
        }
      } catch (error) {
        console.error('Error processing text selection:', error);
      }
    }, 100);
  }, [currentPage, currentSelectionType, onRegionCreate, containerRef]);

  // ---- Area selection handlers ----
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSelectionMode || !containerRef.current || currentSelectionType !== 'area') return;
    setIsSelecting(true);
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSelectionStart({ x, y });
    setSelectionRect({ x, y, width: 0, height: 0 });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSelectionRect({
      x: Math.min(x, selectionStart.x),
      y: Math.min(y, selectionStart.y),
      width: Math.abs(x - selectionStart.x),
      height: Math.abs(y - selectionStart.y)
    });
  };
  const handleMouseUp = () => {
    if (!isSelecting) return;
    setIsSelecting(false);
    if (selectionRect.width > 10 && selectionRect.height > 10 && currentSelectionType === 'area') {
      const newRegion: Omit<Region, "id"> = {
        page: currentPage,
        x: selectionRect.x,
        y: selectionRect.y,
        width: selectionRect.width,
        height: selectionRect.height,
        type: 'area',
        name: `Area ${regions.length + 1}`,
        audioPath: '',
        description: ''
      };
      onRegionCreate(newRegion);
      toast.success('Area region created');
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
    }
  };

  // ---- Image selection ----
  const handleImageClick = (e: React.MouseEvent) => {
    if (currentSelectionType !== 'image' || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const DEFAULT_IMAGE_SIZE = 100;
    const newRegion: Omit<Region, "id"> = {
      page: currentPage,
      x, y,
      width: DEFAULT_IMAGE_SIZE,
      height: DEFAULT_IMAGE_SIZE,
      type: 'image',
      name: `Image ${regions.length + 1}`,
      audioPath: '',
      description: 'Image selection'
    };
    onRegionCreate(newRegion);
    toast.info('Image region created. Resize it to fit the image precisely.');
  };

  // ---- Debug toggle ----
  const toggleDebugMode = () => setDebugMode(!debugMode);

  // Navigation controls
  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
      window.getSelection()?.removeAllRanges();
    }
  };
  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      window.getSelection()?.removeAllRanges();
    }
  };
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 3.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));

  const pageRegions = regions.filter(region => region.page === currentPage);

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-lg font-bold">No PDF Document Loaded</h1>
        <p className="text-muted-foreground">Please upload a PDF document to get started</p>
      </div>
    );
  }

  return (
    <div
      className="pdf-container"
      ref={containerRef}
      style={{ position: "relative", width: 'fit-content', margin: "0 auto" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleImageClick}
    >
      <div className="flex flex-row items-center gap-2 p-2 bg-muted">
        <Button onClick={handlePrevPage} disabled={currentPage === 0}>Previous</Button>
        <span>Page {currentPage + 1} of {totalPages}</span>
        <Button onClick={handleNextPage} disabled={currentPage === totalPages - 1}>Next</Button>
        <Button onClick={handleZoomOut} disabled={scale <= 0.5}>-</Button>
        <span>{Math.round(scale * 100)}%</span>
        <Button onClick={handleZoomIn} disabled={scale >= 3}>+</Button>
        {process.env.NODE_ENV === 'development' && (
          <Button onClick={toggleDebugMode} variant={debugMode ? "destructive" : "outline"}>
            {debugMode ? 'Debug: ON' : 'Debug: OFF'}
          </Button>
        )}
      </div>
      <div className="pdf-page" style={{ position: 'relative' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />
        <div
          className={`text-layer ${currentSelectionType === 'text' ? 'text-selection-enabled' : 'text-selection-disabled'} ${debugMode ? 'debug' : ''}`}
          ref={textLayerRef}
        />
        {/* Render region overlays */}
        {pageRegions.map((region) => (
          <RegionOverlay
            key={region.id}
            region={region}
            selected={region.id === selectedRegionId}
            onSelect={() => onRegionSelect(region.id)}
            onUpdate={onRegionUpdate}
            scale={scale}
          />
        ))}
        {/* Draw area selection rectangle */}
        {isSelecting && (
          <div style={{
            position: 'absolute',
            left: selectionRect.x,
            top: selectionRect.y,
            width: selectionRect.width,
            height: selectionRect.height,
            border: '2px dashed #2563eb',
            background: 'rgba(37, 99, 235, 0.2)',
            pointerEvents: 'none',
            zIndex: 10,
          }} />
        )}
      </div>
    </div>
  );
};

export default PdfViewer;
