
import React, { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PdfViewer from '@/components/PdfViewer';
import Toolbar from '@/components/ToolBar';
import { Region, RegionMapping } from '@/types/regions';
import { exportRegionMapping } from '@/utils/exportUtils';
import { toast } from 'sonner';

const Index = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [currentSelectionType, setCurrentSelectionType] = useState<'area' | 'polygon' | 'circle' | null>(null);
  
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
      id: uuidv4(),
    };
    
    setRegions(prev => [...prev, newRegion]);
    setSelectedRegionId(newRegion.id);
    toast.success('Region created');
    
    // Reset selection mode after creating a region
    setCurrentSelectionType(null);
  };
  
  const handleRegionUpdate = (updatedRegion: Region) => {
    setRegions(prev => 
      prev.map(region => 
        region.id === updatedRegion.id ? updatedRegion : region
      )
    );
  };
  
  const handleRegionDelete = (regionId: string) => {
    setRegions(prev => prev.filter(region => region.id !== regionId));
    if (selectedRegionId === regionId) {
      setSelectedRegionId(null);
    }
  };
  
  const handleRegionSelect = (regionId: string | null) => {
    setSelectedRegionId(regionId);
  };
  
  const handleToggleSelectionMode = (mode: 'area' | 'polygon' | 'circle' | null) => {
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
      documentId: uuidv4(), // Generate a unique ID for the document
      regions: regions,
    };
    
    exportRegionMapping(mapping);
    toast.success('Data exported successfully');
  };
  
  const selectedRegion = regions.find(r => r.id === selectedRegionId) || null;
  
  return (
    <div className="flex flex-col h-screen">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf"
        className="hidden"
      />
      
      <Header
        onUploadClick={handleFileUpload}
        onExport={handleExport}
        hasDocument={!!pdfFile}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <div className="w-16 border-r border-gray-200">
          <Toolbar
            isSelectionMode={!!currentSelectionType}
            onToggleSelectionMode={handleToggleSelectionMode}
            currentSelectionType={currentSelectionType}
          />
        </div>
        
        <div className="flex-1">
          <PdfViewer
            file={pdfFile}
            regions={regions}
            onRegionCreate={handleRegionCreate}
            onRegionUpdate={handleRegionUpdate}
            selectedRegionId={selectedRegionId}
            onRegionSelect={handleRegionSelect}
            isSelectionMode={!!currentSelectionType}
            currentSelectionType={currentSelectionType}
          />
        </div>
        
        <Sidebar
          selectedRegion={selectedRegion}
          regions={regions}
          onRegionUpdate={handleRegionUpdate}
          onRegionDelete={handleRegionDelete}
          onRegionSelect={handleRegionSelect}
        />
      </div>
    </div>
  );
};

export default Index;
