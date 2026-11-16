import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Spinner } from '../common/Spinner.jsx';

export const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-former-canvas">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    // If the user arrived here from a protected page, navigate back there; otherwise go to authenticated app
    const origin = location.state?.from?.pathname || '/app';
    return <Navigate to={origin} replace />;
  }

  return children;
};
