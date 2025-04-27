
import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download, File, LogOut, Users } from 'lucide-react';
import type { Profile } from '@/types/auth';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onUploadClick: () => void;
  onExport: () => void;
  hasDocument: boolean;
  user: Profile | null;
  onSignOut: () => Promise<void>;
}

const Header = ({ onUploadClick, onExport, hasDocument, user, onSignOut }: HeaderProps) => {
  const isAdmin = user?.role === 'admin';

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <File className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-gray-800">PDF Region Mapper</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm text-muted-foreground">
              {user.full_name || user.email}
            </span>
          )}
          
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <Button
                variant="outline"
                className="flex items-center gap-2"
                asChild
              >
                <Link to="/admin">
                  <Users className="h-4 w-4" />
                  Admin Dashboard
                </Link>
              </Button>
            ) : (
              <Button 
                onClick={onUploadClick} 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload PDF
              </Button>
            )}
            
            {!isAdmin && (
              <Button 
                onClick={onExport} 
                disabled={!hasDocument}
                className="flex items-center gap-2"
                title={!hasDocument ? "Select a document to export" : "Export region mappings"}
              >
                <Download className="h-4 w-4" />
                Export Data
              </Button>
            )}

            <Button
              onClick={onSignOut}
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
