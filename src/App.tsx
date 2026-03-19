import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserMap from './pages/user/UserMap';
import MapSelection from './pages/user/MapSelection';

const PrivateRoute: React.FC<{ children: React.ReactNode; requiredRole?: 'admin' | 'user' }> = ({ children, requiredRole }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!user || !profile) return <Navigate to="/login" />;

  if (requiredRole && profile.role !== requiredRole) {
    return <Navigate to={profile.role === 'admin' ? '/admin/dashboard' : '/map-selection'} />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/admin/dashboard" 
            element={
              <PrivateRoute requiredRole="admin">
                <AdminDashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/map-selection" 
            element={
              <PrivateRoute requiredRole="user">
                <MapSelection />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/map/:mapName" 
            element={
              <PrivateRoute requiredRole="user">
                <UserMap />
              </PrivateRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
