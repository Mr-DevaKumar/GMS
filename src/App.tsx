import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';

// Auth
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import Games from './pages/admin/Games';
import Coordinators from './pages/admin/Coordinators';
import Anbiyams from './pages/admin/Anbiyams';
import Winners from './pages/admin/Winners';
import Prizes from './pages/admin/Prizes';
import Settings from './pages/admin/Settings';

// Coordinator Pages
import CoordinatorHome from './pages/coordinator/Home';
import GameEntry from './pages/coordinator/GameEntry';

// Shared / Display
import Display from './pages/Display';

function RootRedirect() {
  const { profile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[var(--bg)]">
        <div className="label animate-pulse">Loading Contest Hub…</div>
      </div>
    );
  }
  
  if (!profile) return <Navigate to="/login" replace />;
  
  return <Navigate to={profile.role === 'admin' ? '/admin' : '/c'} replace />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public & Root */}
            <Route path="/" element={<RootRedirect />} />
            
            {/* Login Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/login/admin" element={<AdminLogin />} />

            {/* Display Mode (Kiosk Projector) */}
            <Route 
              path="/display" 
              element={
                <ProtectedRoute role="admin">
                  <Display />
                </ProtectedRoute>
              } 
            />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute role="admin"><Dashboard /></ProtectedRoute>} />
            <Route path="/admin/games" element={<ProtectedRoute role="admin"><Games /></ProtectedRoute>} />
            <Route path="/admin/coordinators" element={<ProtectedRoute role="admin"><Coordinators /></ProtectedRoute>} />
            <Route path="/admin/anbiyams" element={<ProtectedRoute role="admin"><Anbiyams /></ProtectedRoute>} />
            <Route path="/admin/winners" element={<ProtectedRoute role="admin"><Winners /></ProtectedRoute>} />
            <Route path="/admin/prizes" element={<ProtectedRoute role="admin"><Prizes /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute role="admin"><Settings /></ProtectedRoute>} />

            {/* Coordinator Routes - Notice the /* to handle trailing slashes */}
            <Route path="/c/*" element={<ProtectedRoute role="coordinator"><CoordinatorHome /></ProtectedRoute>} />
            <Route path="/c/game/:id" element={<ProtectedRoute role="coordinator"><GameEntry /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}