import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireFirmLogin?: boolean; // For worker selection page
  requireWorker?: boolean; // For pages that need worker login
  requireAdmin?: boolean; // For admin-only pages
}

export default function ProtectedRoute({ 
  children, 
  requireFirmLogin = false,
  requireWorker = false,
  requireAdmin = false 
}: ProtectedRouteProps) {
  const { user, currentWorker, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // For worker selection, only need firm login
  if (requireFirmLogin) {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  }

  // For regular pages, need both firm login and worker selection
  // Check localStorage as fallback in case state hasn't updated yet
  let hasWorker = currentWorker;
  try {
    const storedWorker = localStorage.getItem('currentWorker');
    if (storedWorker) {
      hasWorker = hasWorker || JSON.parse(storedWorker);
    }
  } catch (e) {
    // Ignore parse errors
  }
  
  if (requireWorker) {
    if (!user || !hasWorker) {
      return <Navigate to="/worker-selection" replace />;
    }
  } else {
    // For pages that need at least firm login
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    // If worker is required but not selected, redirect to worker selection
    if (!hasWorker) {
      return <Navigate to="/worker-selection" replace />;
    }
  }

  // Check admin requirement
  if (requireAdmin) {
    const activeUser = currentWorker || user;
    if (activeUser?.role !== 'admin') {
      return <Navigate to="/check-in" replace />;
    }
  }

  return <>{children}</>;
}



