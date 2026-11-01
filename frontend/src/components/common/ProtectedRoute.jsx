import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';

const ProtectedRoute = ({ allowedRoles = null, showSidebar = true }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-sage-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-forest-800 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-forest-900">Loading EcoRev AI Platform...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role authorization guard
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    if (user?.role === 'customer' || user?.role === 'user') {
      return <Navigate to="/user" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  if (showSidebar) {
    return (
      <div className="flex min-h-screen bg-[#F8FAF8]">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
