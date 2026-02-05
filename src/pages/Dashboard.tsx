import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  TrendingUp,
  FileText,
  Clock,
  Car,
  CheckCircle,
  Play,
  DollarSign,
  ArrowRight,
  Calendar,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, startOfYear } from 'date-fns';
import { de } from 'date-fns/locale';

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: string;
  status: string;
  total: number;
  createdAt: string;
}

interface TimeLog {
  id: string;
  hours: number;
  createdAt: string;
}

interface Vehicle {
  id: string;
  isActive: boolean;
  brand?: string;
  model?: string;
}

interface Expense {
  id: string;
  amount: number;
  createdAt: string;
}

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [invoicesRes, timeLogsRes, vehiclesRes, expensesRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/time-logs'),
        api.get('/vehicles'),
        api.get('/expenses'),
      ]);
      setInvoices(invoicesRes.data);
      setTimeLogs(timeLogsRes.data);
      setVehicles(vehiclesRes.data);
      setExpenses(expensesRes.data);
    } catch (error) {
      toast.error('Daten konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredData = () => {
    const now = new Date();
    let startDate: Date;

    switch (selectedPeriod) {
      case 'week': startDate = startOfWeek(now, { weekStartsOn: 1 }); break;
      case 'month': startDate = startOfMonth(now); break;
      case 'year': startDate = startOfYear(now); break;
      default: startDate = new Date(0);
    }

    return {
      filteredInvoices: invoices.filter((inv) => new Date(inv.createdAt) >= startDate),
      filteredTimeLogs: timeLogs.filter((log) => new Date(log.createdAt) >= startDate),
      filteredExpenses: expenses.filter((exp) => new Date(exp.createdAt) >= startDate),
    };
  };

  const { filteredInvoices, filteredTimeLogs, filteredExpenses } = getFilteredData();

  // Calculations
  const totalRevenue = invoices.filter((inv) => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0);
  const pendingRevenue = invoices.filter((inv) => inv.status === 'sent').reduce((sum, inv) => sum + inv.total, 0);
  const totalExpensesAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = totalRevenue - totalExpensesAmount;
  const paidInvoices = invoices.filter((inv) => inv.status === 'paid').length;
  const unpaidInvoices = invoices.filter((inv) => inv.status === 'sent').length;
  const totalHours = filteredTimeLogs.reduce((sum, log) => sum + log.hours, 0);
  const activeVehicles = vehicles.filter((v) => v.isActive).length;

  // Revenue by month
  const getRevenueByMonth = () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthRevenue = invoices
        .filter((inv) => {
          const invDate = new Date(inv.createdAt);
          return inv.status === 'paid' && invDate >= monthStart && invDate <= monthEnd;
        })
        .reduce((sum, inv) => sum + inv.total, 0);
      months.push({ month: format(monthDate, 'MMM', { locale: de }), revenue: monthRevenue });
    }
    return months;
  };

  const revenueByMonth = getRevenueByMonth();
  const maxRevenue = Math.max(...revenueByMonth.map((m) => m.revenue), 1);

  const formatCurrency = (value: number) => 
    value.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {format(new Date(), 'EEEE, d. MMMM yyyy', { locale: de })}
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex bg-neutral-100 p-1 rounded-lg">
          {(['week', 'month', 'year', 'all'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                selectedPeriod === period
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {period === 'week' ? 'Woche' : period === 'month' ? 'Monat' : period === 'year' ? 'Jahr' : 'Gesamt'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Einnahmen</span>
            <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-success-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-neutral-900">CHF {formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-neutral-500 mt-1">{paidInvoices} bezahlt</p>
        </div>

        {/* Pending */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Ausstehend</span>
            <div className="w-8 h-8 bg-warning-100 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-warning-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-neutral-900">CHF {formatCurrency(pendingRevenue)}</p>
          <p className="text-xs text-neutral-500 mt-1">{unpaidInvoices} offen</p>
        </div>

        {/* Expenses */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Ausgaben</span>
            <div className="w-8 h-8 bg-danger-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-danger-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-neutral-900">CHF {formatCurrency(totalExpensesAmount)}</p>
          <p className="text-xs text-neutral-500 mt-1">{filteredExpenses.length} Einträge</p>
        </div>

        {/* Profit */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Gewinn</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              netProfit >= 0 ? 'bg-success-100' : 'bg-danger-100'
            }`}>
              <TrendingUp className={`w-4 h-4 ${netProfit >= 0 ? 'text-success-600' : 'text-danger-600'}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            CHF {formatCurrency(netProfit)}
          </p>
          <p className="text-xs text-neutral-500 mt-1">Netto</p>
        </div>
      </div>

      {/* Charts and Data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Einnahmen</h2>
              <p className="text-xs text-neutral-500">Letzte 6 Monate</p>
            </div>
            <Link to="/invoices" className="text-xs text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1">
              Alle Rechnungen <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="flex items-end gap-2 h-40">
            {revenueByMonth.map((month, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-neutral-100 rounded overflow-hidden relative" style={{ height: '120px' }}>
                  <div
                    className="absolute bottom-0 w-full bg-primary-500 rounded transition-all duration-500"
                    style={{ height: `${Math.max((month.revenue / maxRevenue) * 100, 2)}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-neutral-500 uppercase">{month.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          {/* Vehicles */}
          <div className="card-hover" onClick={() => window.location.href = '/vehicles'}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Car className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">{activeVehicles}</p>
                  <p className="text-xs text-neutral-500">Aktive Fahrzeuge</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-400" />
            </div>
          </div>

          {/* Time */}
          <div className="card-hover" onClick={() => window.location.href = '/time-logs'}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">{totalHours.toFixed(1)}h</p>
                  <p className="text-xs text-neutral-500">Arbeitsstunden</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-400" />
            </div>
          </div>

          {/* Invoice Status */}
          <div className="card">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Rechnungsstatus</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success-500" />
                  <span className="text-sm text-neutral-600">Bezahlt</span>
                </div>
                <span className="text-sm font-semibold text-neutral-900">{paidInvoices}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning-500" />
                  <span className="text-sm text-neutral-600">Offen</span>
                </div>
                <span className="text-sm font-semibold text-neutral-900">{unpaidInvoices}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Invoices */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-neutral-900">Letzte Rechnungen</h3>
            <Link to="/invoices" className="text-xs text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1">
              Alle <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="space-y-1">
            {filteredInvoices.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between py-2.5 border-b border-neutral-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-neutral-100 rounded flex items-center justify-center">
                    <FileText className="w-4 h-4 text-neutral-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-neutral-500">{format(new Date(invoice.createdAt), 'd. MMM', { locale: de })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${
                    invoice.status === 'paid' ? 'badge-success' : 
                    invoice.status === 'sent' ? 'badge-warning' : 'badge-gray'
                  }`}>
                    {invoice.status === 'paid' ? 'Bezahlt' : invoice.status === 'sent' ? 'Offen' : 'Entwurf'}
                  </span>
                  <span className="text-sm font-semibold text-neutral-900 tabular-nums">
                    CHF {formatCurrency(invoice.total)}
                  </span>
                </div>
              </div>
            ))}
            {filteredInvoices.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-8">Keine Rechnungen</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-base font-semibold text-neutral-900 mb-4">Schnellaktionen</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: '/check-in', icon: Play, label: 'Check-In', color: 'bg-success-100 text-success-600' },
              { to: '/vehicles/new', icon: Car, label: 'Neues Fahrzeug', color: 'bg-primary-100 text-primary-600' },
              { to: '/invoices', icon: FileText, label: 'Neue Rechnung', color: 'bg-neutral-100 text-neutral-600' },
              { to: '/appointments/calendar', icon: Calendar, label: 'Termine', color: 'bg-warning-100 text-warning-600' },
            ].map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200
                         hover:border-neutral-300 hover:bg-neutral-50 transition-all duration-200"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${action.color}`}>
                  <action.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-neutral-700">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
