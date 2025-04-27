
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { Navigate } from 'react-router-dom';
import UserList from '@/components/admin/UserList';
import UserDocuments from '@/components/admin/UserDocuments';
import type { Profile } from '@/types/auth';
import type { Document } from '@/types/documents';
import PdfViewer from '@/components/PdfViewer';

const AdminDashboard = () => {
  const { authState } = useAuth();
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // Redirect non-admin users
  if (!authState.profile?.role || authState.profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      {selectedDocument ? (
        <div>
          <button
            onClick={() => setSelectedDocument(null)}
            className="mb-4 text-primary hover:underline"
          >
            ← Back to documents
          </button>
          <div className="h-[calc(100vh-200px)]">
            <PdfViewer
              file={selectedDocument.file}
              regions={selectedDocument.regions}
              selectedRegionId={null}
              onRegionSelect={() => {}}
              onRegionCreate={() => {}}
              onRegionUpdate={() => {}}
              onRegionDelete={() => {}}
              isSelectionMode={false}
              currentSelectionType={null}
              onCurrentSelectionTypeChange={() => {}}
            />
          </div>
        </div>
      ) : selectedUser ? (
        <div>
          <button
            onClick={() => setSelectedUser(null)}
            className="mb-4 text-primary hover:underline"
          >
            ← Back to users
          </button>
          <h2 className="text-xl font-semibold mb-4">
            Documents for {selectedUser.full_name || selectedUser.email}
          </h2>
          <UserDocuments
            user={selectedUser}
            onDocumentView={setSelectedDocument}
          />
        </div>
      ) : (
        <UserList onUserSelect={setSelectedUser} />
      )}
    </div>
  );
};

export default AdminDashboard;
