import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProfileProvider } from './context/ProfileContext.jsx';
import { UnsavedProvider } from './context/UnsavedContext.jsx';
import { ProtectedRoute } from './components/routing/ProtectedRoute.jsx';
import { PublicRoute } from './components/routing/PublicRoute.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { Home } from './pages/Home.jsx';
import { AccountPages } from './pages/AccountPages.jsx';

const AppShell = lazy(() => import('./components/layout/AppShell.jsx').then((module) => ({ default: module.AppShell })));
const MyInformation = lazy(() => import('./pages/MyInformation.jsx').then((module) => ({ default: module.MyInformation })));
const opening = <div className="p-8 text-former-secondary" role="status">Opening your workspace…</div>;
const pageError = <main className="min-h-screen bg-former-canvas flex items-center justify-center p-8"><div className="max-w-sm text-center"><h1 className="text-2xl font-semibold mb-3">We couldn’t open this page</h1><p className="text-former-secondary mb-6">Please reload the page and try again.</p><button className="bg-primary text-white rounded-full px-6 py-3" onClick={() => window.location.reload()}>Reload page</button></div></main>;

// A data router enables blocking unsaved edits, including browser Back navigation.
const router = createBrowserRouter([{
  element: <AuthProvider><Outlet /></AuthProvider>,
  errorElement: pageError,
  children: [
    { path: '/', element: <LandingPage /> },
    { path: '/login', element: <PublicRoute><Login /></PublicRoute> },
    { path: '/register', element: <PublicRoute><Register /></PublicRoute> },
    { path: '/app', element: <ProtectedRoute><ProfileProvider><UnsavedProvider><Suspense fallback={opening}><AppShell /></Suspense></UnsavedProvider></ProfileProvider></ProtectedRoute>, children: [
      { index: true, element: <Home /> },
      { path: 'profile/:section?', element: <Suspense fallback={opening}><MyInformation /></Suspense> },
      { path: 'history', element: <AccountPages page="history" /> },
      { path: 'settings', element: <AccountPages page="settings" /> },
      { path: 'report', element: <AccountPages page="report" /> },
      { path: '*', element: <Navigate to="/app" replace /> }
    ] },
    { path: '/dashboard', element: <Navigate to="/app" replace /> },
    { path: '*', element: <Navigate to="/" replace /> }
  ]
}]);
export const App = () => <RouterProvider router={router} />;
export default App;
