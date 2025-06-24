
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
import { TooltipProvider } from '@/components/ui/tooltip';
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <TooltipProvider>
        <AuthProvider>
          <TextAssignmentProvider>
            <Router>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                <Route path="/tts-history" element={<ProtectedRoute><TTSHistory /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster richColors position="top-center" />
            </Router>
          </TextAssignmentProvider>
        </AuthProvider>
      </TooltipProvider>
    </LanguageProvider>
  );
}

export default App;
