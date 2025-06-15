
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';
import { AuthProvider } from './contexts/AuthProvider';
import { Toaster } from '@/components/ui/sonner';
import { TextAssignmentProvider } from './contexts/TextAssignmentContext';
import TTSHistory from './pages/TTSHistory';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <TextAssignmentProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/tts-history" element={<ProtectedRoute><TTSHistory /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster richColors position="top-center" />
        </TextAssignmentProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
