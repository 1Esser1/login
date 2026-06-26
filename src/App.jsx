import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { LanguageProvider } from './i18n/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LayoutProvider } from './contexts/LayoutContext';
import wsService from './services/websocketService';
import CommandPalette from './components/layout/CommandPalette';
import TaskDetail from './pages/TaskDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Backlog from './pages/Backlog';
import Admin from './pages/Admin';
import Export from './pages/Export';
import Settings from './pages/Settings';
import Scoring from './pages/Scoring';
import Compare from './pages/Compare';
import Workplace from './pages/Workplace';
import WorkplaceDetail from './pages/WorkplaceDetail';
import AuditLog from './pages/AuditLog';
import JiraPage from './pages/Jira';
import DoraPage from './pages/Dora';
import SprintPage from './pages/Sprint';
import WorkloadPage from './pages/Workload';
import SlaPage from './pages/Sla';
import ReportPage from './pages/Report';
import TaskRelations from './pages/TaskRelations';
import CabPage from './pages/Cab';
import TeamsPage from './pages/Teams';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return children;
};

const PrivilegedRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'ADMIN' && user?.role !== 'IT_MANAGER') return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem('token');
      if (token) wsService.connect(token);
    } else {
      wsService.disconnect();
    }
    return () => {};
  }, [isAuthenticated]);

  return (
    <ThemeProvider>
    <LayoutProvider>
    <LanguageProvider>
      <BrowserRouter>
        <CommandPalette />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
          <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />
          <Route path="/backlog" element={<ProtectedRoute><Backlog /></ProtectedRoute>} />
          <Route path="/scoring" element={<ProtectedRoute><Scoring /></ProtectedRoute>} />
          <Route path="/compare" element={<ProtectedRoute><Compare /></ProtectedRoute>} />
          <Route path="/workplace" element={<ProtectedRoute><Workplace /></ProtectedRoute>} />
          <Route path="/workplace/:id" element={<ProtectedRoute><WorkplaceDetail /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Export /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/audit" element={<PrivilegedRoute><AuditLog /></PrivilegedRoute>} />
          <Route path="/jira" element={<ProtectedRoute><JiraPage /></ProtectedRoute>} />
          <Route path="/dora" element={<ProtectedRoute><DoraPage /></ProtectedRoute>} />
          <Route path="/sprint" element={<ProtectedRoute><SprintPage /></ProtectedRoute>} />
          <Route path="/workload" element={<PrivilegedRoute><WorkloadPage /></PrivilegedRoute>} />
          <Route path="/sla" element={<ProtectedRoute><SlaPage /></ProtectedRoute>} />
          <Route path="/report" element={<PrivilegedRoute><ReportPage /></PrivilegedRoute>} />
          <Route path="/task-relations" element={<ProtectedRoute><TaskRelations /></ProtectedRoute>} />
          <Route path="/cab" element={<PrivilegedRoute><CabPage /></PrivilegedRoute>} />
          <Route path="/teams" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
    </LayoutProvider>
    </ThemeProvider>
  );
}

export default App;