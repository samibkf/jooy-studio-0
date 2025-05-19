
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';
import { AuthProvider } from './contexts/AuthProvider';
import { Toaster } from '@/components/ui/sonner';
import { TextAssignmentProvider } from './contexts/TextAssignmentContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <TextAssignmentProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster richColors position="top-center" />
        </TextAssignmentProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
