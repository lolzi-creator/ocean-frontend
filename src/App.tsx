import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import Login from './pages/Login';
import Vehicles from './pages/Vehicles';
import VehicleEntry from './pages/VehicleEntry';
import VehicleDetail from './pages/VehicleDetail';
import TimeLogs from './pages/TimeLogs';
import TimeLogsCalendar from './pages/TimeLogsCalendar';
import AppointmentsCalendar from './pages/AppointmentsCalendar';
import CheckIn from './pages/CheckIn';
import CarTimeLogs from './pages/CarTimeLogs';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import Expenses from './pages/Expenses';
import WorkerSelection from './pages/WorkerSelection';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if we've already shown the loading screen in this session
    const hasShownLoading = sessionStorage.getItem('hasShownLoading');
    if (hasShownLoading) {
      setIsLoading(false);
    }
  }, []);

  const handleLoadingComplete = () => {
    sessionStorage.setItem('hasShownLoading', 'true');
    setIsLoading(false);
  };

  if (isLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/worker-selection"
            element={
              <ProtectedRoute requireFirmLogin>
                <WorkerSelection />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Navigate to="/dashboard" replace />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireAdmin>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vehicles"
            element={
              <ProtectedRoute>
                <Layout>
                  <Vehicles />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vehicles/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <VehicleEntry />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vehicles/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <VehicleDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/time-logs"
            element={
              <ProtectedRoute>
                <Layout>
                  <TimeLogs />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/time-logs/calendar"
            element={
              <ProtectedRoute>
                <Layout>
                  <TimeLogsCalendar />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments/calendar"
            element={
              <ProtectedRoute>
                <Layout>
                  <AppointmentsCalendar />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/check-in"
            element={
              <ProtectedRoute>
                <Layout>
                  <CheckIn />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/car-time-logs"
            element={
              <ProtectedRoute>
                <Layout>
                  <CarTimeLogs />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute requireAdmin>
                <Layout>
                  <Invoices />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices/:id"
            element={
              <ProtectedRoute requireAdmin>
                <Layout>
                  <InvoiceDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute requireAdmin>
                <Layout>
                  <Expenses />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 5000,
            style: {
              background: '#fff',
              color: '#333',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              padding: '16px',
              fontSize: '14px',
              maxWidth: '500px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
              duration: 4000,
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
              duration: 6000,
              style: {
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                padding: '16px',
                fontSize: '14px',
                maxWidth: '500px',
              },
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
