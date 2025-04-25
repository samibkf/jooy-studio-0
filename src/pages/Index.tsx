import React, { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PdfViewer from '@/components/PdfViewer';
import { Region, RegionMapping } from '@/types/regions';
import { exportRegionMapping } from '@/utils/exportUtils';
import { toast } from 'sonner';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';
const Index = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [currentSelectionType, setCurrentSelectionType] = useState<'area' | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }
    setPdfFile(file);
    setRegions([]);
    setSelectedRegionId(null);
  };
  const handleRegionCreate = (regionData: Omit<Region, 'id'>) => {
    const newRegion: Region = {
      ...regionData,
      id: uuidv4()
    };
    setRegions(prev => [...prev, newRegion]);
    setSelectedRegionId(newRegion.id);
    toast.success('Region created');
  };
  const handleRegionUpdate = (updatedRegion: Region) => {
    setRegions(prev => prev.map(region => region.id === updatedRegion.id ? updatedRegion : region));
  };
  const handleRegionDelete = (regionId: string) => {
    setRegions(prev => prev.filter(region => region.id !== regionId));
    if (selectedRegionId === regionId) {
      setSelectedRegionId(null);
    }
    toast.success('Region deleted');
  };
  const handleRegionSelect = (regionId: string | null) => {
    setSelectedRegionId(regionId);
  };
  const handleToggleSelectionMode = (mode: 'area' | null) => {
    setCurrentSelectionType(mode);
  };
  const handleExport = () => {
    if (!pdfFile) {
      toast.error('No PDF document loaded');
      return;
    }
    if (regions.length === 0) {
      toast.error('No regions defined');
      return;
    }
    const mapping: RegionMapping = {
      documentName: pdfFile.name,
      documentId: uuidv4(),
      // Generate a unique ID for the document
      regions: regions
    };
    exportRegionMapping(mapping);
    toast.success('Data exported successfully');
  };
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const selectedRegion = regions.find(r => r.id === selectedRegionId) || null;
  return <div className="flex flex-col h-screen">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
      
      <Header onUploadClick={handleFileUpload} onExport={handleExport} hasDocument={!!pdfFile} />
      
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full relative">
          <ResizablePanel defaultSize={75} minSize={30}>
            <PdfViewer file={pdfFile} regions={regions} onRegionCreate={handleRegionCreate} onRegionUpdate={handleRegionUpdate} selectedRegionId={selectedRegionId} onRegionSelect={handleRegionSelect} onRegionDelete={handleRegionDelete} isSelectionMode={!!currentSelectionType} currentSelectionType={currentSelectionType} onCurrentSelectionTypeChange={handleToggleSelectionMode} />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {!isSidebarCollapsed && <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="relative">
              <Button variant="ghost" size="icon" onClick={toggleSidebar} className="absolute -left-6 top-2 z-10 rounded-full bg-background shadow-md border px-0 mx-[240px] text-left">
                <ChevronRight />
              </Button>
              <Sidebar selectedRegion={selectedRegion} regions={regions} onRegionUpdate={handleRegionUpdate} onRegionDelete={handleRegionDelete} onRegionSelect={handleRegionSelect} />
            </ResizablePanel>}
          
          {isSidebarCollapsed && <Button variant="ghost" size="icon" className="absolute right-2 top-2 z-10 rounded-full bg-background shadow-md border" onClick={toggleSidebar}>
              <ChevronLeft />
            </Button>}
        </ResizablePanelGroup>
      </div>
    </div>;
};
export default Index;