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
  LayoutDashboard,
  DollarSign,
  Settings,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, currentWorker } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const activeUser = currentWorker || user;
  const userRole = activeUser?.role || 'worker';

  const handleLogout = () => {
    localStorage.removeItem('currentWorker');
    localStorage.removeItem('workerToken');
    navigate('/worker-selection');
  };

  const allNavItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', adminOnly: true },
    { path: '/check-in', icon: Play, label: 'Check-In', adminOnly: false },
    { path: '/vehicles', icon: Car, label: 'Fahrzeuge', adminOnly: false },
    { path: '/time-logs', icon: Clock, label: 'Zeiten', adminOnly: false },
    { path: '/appointments/calendar', icon: Calendar, label: 'Termine', adminOnly: false },
    { path: '/invoices', icon: FileText, label: 'Rechnungen', adminOnly: true },
    { path: '/expenses', icon: DollarSign, label: 'Ausgaben', adminOnly: true },
    { path: '/service-templates', icon: Settings, label: 'Services', adminOnly: true },
  ];

  const navItems = allNavItems.filter(item => 
    userRole === 'admin' || !item.adminOnly
  );

  const isActivePath = (path: string) => {
    if (path === '/vehicles') return location.pathname.startsWith('/vehicles');
    if (path === '/time-logs') return location.pathname.startsWith('/time-logs');
    if (path === '/appointments/calendar') return location.pathname.startsWith('/appointments');
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 pb-20 md:pb-20">
      {/* Desktop Header */}
      <header className="hidden md:block sticky top-0 z-30 glass">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <span className="text-lg font-bold text-neutral-900">Ocean Garage</span>
            </div>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <DerendingerStatus />
            
            <div className="h-8 w-px bg-neutral-200" />
            
            {/* User */}
            <div className="flex items-center gap-2 pl-2">
              <div className="w-8 h-8 bg-neutral-200 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-neutral-600" />
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-sm font-semibold text-neutral-900 leading-tight">
                  {activeUser?.name || activeUser?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-neutral-500 capitalize">{userRole}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 
                       rounded-lg transition-colors"
              title="Abmelden"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-30 glass">
        <div className="flex items-center justify-between h-14 px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Car className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <span className="text-base font-bold text-neutral-900">Ocean Garage</span>
          </Link>
          <div className="flex items-center gap-2">
            <DerendingerStatus compact />
            <div className="w-8 h-8 bg-neutral-200 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-neutral-600" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:px-6 animate-fade-in">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-2">
          <div className="flex items-center justify-around md:justify-center md:gap-1 h-16">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center gap-0.5
                            px-3 py-1.5 rounded-lg min-w-[60px] md:min-w-[80px]
                            transition-colors duration-200 ${
                    isActive
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  <span className={`text-[10px] md:text-xs font-medium ${
                    isActive ? 'text-primary-600' : 'text-neutral-500'
                  }`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
            
            {/* Mobile logout */}
            <button
              onClick={handleLogout}
              className="md:hidden flex flex-col items-center justify-center gap-0.5
                       px-3 py-1.5 rounded-lg min-w-[60px]
                       text-neutral-400 hover:text-danger-600 hover:bg-danger-50
                       transition-colors duration-200"
            >
              <LogOut className="w-5 h-5" strokeWidth={2} />
              <span className="text-[10px] font-medium text-neutral-500">Logout</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
