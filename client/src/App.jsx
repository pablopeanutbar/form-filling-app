import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute } from './components/routing/ProtectedRoute.jsx';
import { PublicRoute } from './components/routing/PublicRoute.jsx';
import { AppShell } from './components/layout/AppShell.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { Home } from './pages/Home.jsx';

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Public Auth routes (redirects to /app if already authenticated) */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* Protected App routes (redirects to /login if unauthenticated) */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Home />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Convenience alias for dashboard */}
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
