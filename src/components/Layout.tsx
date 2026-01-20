import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DerendingerStatus from './DerendingerStatus';
import {
  Car,
  Clock,
  FileText,
  LogOut,
  User,
  Calendar,
  Play,
  TrendingUp,
  DollarSign,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, currentWorker, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Use currentWorker if available, otherwise fall back to user
  const activeUser = currentWorker || user;
  const userRole = activeUser?.role || 'worker';

  const handleLogout = () => {
    // Clear current worker but keep firm login
    localStorage.removeItem('currentWorker');
    localStorage.removeItem('workerToken');
    // Navigate to worker selection instead of full logout
    navigate('/worker-selection');
  };

  // Navigation items based on role
  const allNavItems = [
    { path: '/dashboard', icon: TrendingUp, label: 'Dashboard', adminOnly: true },
    { path: '/check-in', icon: Play, label: 'Check-In', adminOnly: false },
    { path: '/vehicles', icon: Car, label: 'Fahrzeuge', adminOnly: false },
    { path: '/time-logs', icon: Clock, label: 'Zeiterfassung', adminOnly: false },
    { path: '/appointments/calendar', icon: Calendar, label: 'Termine', adminOnly: false },
    { path: '/invoices', icon: FileText, label: 'Rechnungen', adminOnly: true },
    { path: '/expenses', icon: DollarSign, label: 'Ausgaben', adminOnly: true },
  ];

  // Filter nav items based on role
  const navItems = allNavItems.filter(item => 
    userRole === 'admin' || !item.adminOnly
  );

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-24">
      {/* Top Header - Desktop only */}
      <header className="hidden md:block sticky top-0 z-30 glass border-b border-gray-200/50 shadow-sm backdrop-blur-md">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500/20 blur-xl rounded-full" />
              <img
                src="/logo.webp"
                alt="Ocean Garage"
                className="w-12 h-12 object-contain relative z-10 drop-shadow-lg"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                Ocean Garage
              </h1>
              <p className="text-xs text-gray-500 font-medium">Verwaltungssystem</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Derendinger Connection Status */}
            <DerendingerStatus />
            
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-100">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-md">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900 text-sm">{activeUser?.name || activeUser?.email}</p>
                <p className="text-xs text-gray-500 capitalize font-medium">{userRole}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 font-medium text-sm hover:shadow-md"
            >
              <LogOut className="w-4 h-4" />
              <span>Abmelden</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Top Bar - Simple */}
      <header className="md:hidden sticky top-0 z-30 glass border-b border-gray-200/50 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img
              src="/logo.webp"
              alt="Ocean Garage"
              className="w-10 h-10 object-contain drop-shadow-md"
            />
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              Ocean Garage
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Derendinger Status - Compact on mobile */}
            <DerendingerStatus compact />
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-md">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-in">{children}</main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-gray-200/50 shadow-2xl z-40 md:z-30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-around md:justify-center md:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path === '/vehicles' && location.pathname.startsWith('/vehicles')) ||
                (item.path === '/time-logs' && location.pathname.startsWith('/time-logs')) ||
                (item.path === '/appointments/calendar' && location.pathname.startsWith('/appointments'));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex flex-col items-center justify-center gap-1 px-4 py-3 md:px-6 md:py-3 rounded-2xl transition-all duration-300 min-w-[70px] md:min-w-[100px] relative ${
                    isActive
                      ? 'text-primary-600 bg-gradient-to-br from-primary-50 to-blue-50 shadow-lg scale-105'
                      : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50/50'
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-blue-500/10 rounded-2xl blur-sm" />
                  )}
                  <div className="relative z-10">
                    <Icon className={`w-5 h-5 md:w-6 md:h-6 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  </div>
                  <span className={`text-xs md:text-sm font-semibold relative z-10 transition-all duration-300 ${isActive ? 'text-primary-700' : 'text-gray-600 group-hover:text-primary-600'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-600 rounded-full" />
                  )}
                </Link>
              );
            })}
            
            {/* Logout button on mobile */}
            <button
              onClick={handleLogout}
              className="md:hidden flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-2xl text-gray-600 hover:text-red-600 hover:bg-red-50/50 transition-all duration-300 min-w-[70px] group"
            >
              <LogOut className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-xs font-semibold">Abmelden</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
