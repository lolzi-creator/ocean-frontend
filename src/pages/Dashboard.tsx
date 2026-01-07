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
  Clock as ClockIcon,
  Play,
  DollarSign,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';

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
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'year':
        startDate = startOfYear(now);
        break;
      default:
        startDate = new Date(0);
    }

    const filteredInvoices = invoices.filter((inv) => {
      const invDate = new Date(inv.createdAt);
      return invDate >= startDate;
    });

    const filteredTimeLogs = timeLogs.filter((log) => {
      const logDate = new Date(log.createdAt);
      return logDate >= startDate;
    });

    const filteredExpenses = expenses.filter((exp) => {
      const expDate = new Date(exp.createdAt);
      return expDate >= startDate;
    });

    return { filteredInvoices, filteredTimeLogs, filteredExpenses };
  };

  const { filteredInvoices, filteredTimeLogs, filteredExpenses } = getFilteredData();

  // Financial Calculations
  // Always show ALL paid invoices for total revenue (not filtered by period)
  const totalRevenue = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);

  const pendingRevenue = invoices
    .filter((inv) => inv.status === 'sent')
    .reduce((sum, inv) => sum + inv.total, 0);

  // For filtered period revenue (shown in tooltip/subtitle)
  const filteredPeriodRevenue = filteredInvoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);

  const totalInvoiced = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);

  // Count all paid invoices (not filtered by period)
  const paidInvoices = invoices.filter((inv) => inv.status === 'paid').length;
  const unpaidInvoices = invoices.filter((inv) => inv.status === 'sent').length;
  const draftInvoices = invoices.filter((inv) => inv.status === 'draft').length;

  // Time Tracking
  const totalHours = filteredTimeLogs.reduce((sum, log) => sum + log.hours, 0);
  const totalTimeEntries = filteredTimeLogs.length;

  // Vehicles
  const activeVehicles = vehicles.filter((v) => v.isActive).length;
  const totalVehicles = vehicles.length;

  // Expenses
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Revenue by month (last 6 months)
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

      months.push({
        month: format(monthDate, 'MMM'),
        revenue: monthRevenue,
      });
    }
    return months;
  };

  const revenueByMonth = getRevenueByMonth();
  const maxRevenue = Math.max(...revenueByMonth.map((m) => m.revenue), 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary-600 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600 font-medium">Übersicht über Ihre Garage</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
              selectedPeriod === 'week'
                ? 'bg-primary-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Woche
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
              selectedPeriod === 'month'
                ? 'bg-primary-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Monat
          </button>
          <button
            onClick={() => setSelectedPeriod('year')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
              selectedPeriod === 'year'
                ? 'bg-primary-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Jahr
          </button>
          <button
            onClick={() => setSelectedPeriod('all')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
              selectedPeriod === 'all'
                ? 'bg-primary-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Gesamt
          </button>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Einnahmen</p>
              <p className="text-3xl font-bold text-green-600">CHF {totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {paidInvoices} bezahlte Rechnungen
                {selectedPeriod !== 'all' && filteredPeriodRevenue !== totalRevenue && (
                  <span className="block mt-0.5 text-gray-400">
                    ({filteredPeriodRevenue.toFixed(2)} CHF im {selectedPeriod === 'week' ? 'Zeitraum' : selectedPeriod === 'month' ? 'Monat' : 'Jahr'})
                  </span>
                )}
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Ausstehend</p>
              <p className="text-3xl font-bold text-amber-600">CHF {pendingRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">{unpaidInvoices} offene Rechnungen</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <ClockIcon className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Gesamt fakturiert</p>
              <p className="text-3xl font-bold text-blue-600">CHF {totalInvoiced.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">{filteredInvoices.length} Rechnungen</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Ausgaben</p>
              <p className="text-3xl font-bold text-red-600">CHF {totalExpenses.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">{filteredExpenses.length} Einträge</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Gewinn</p>
              <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                CHF {netProfit.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Einnahmen - Ausgaben</p>
            </div>
            <div className={`w-14 h-14 bg-gradient-to-br ${netProfit >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'} rounded-xl flex items-center justify-center shadow-lg`}>
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="card-elevated">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Einnahmen Verlauf</h2>
            <p className="text-sm text-gray-600">Letzte 6 Monate</p>
          </div>
          <Link to="/invoices" className="btn btn-secondary text-sm">
            Alle Rechnungen
          </Link>
        </div>
        <div className="space-y-4">
          {revenueByMonth.map((month, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="w-16 text-sm font-semibold text-gray-600">{month.month}</div>
              <div className="flex-1 relative">
                <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ width: `${(month.revenue / maxRevenue) * 100}%` }}
                  >
                    {month.revenue > 0 && (
                      <span className="text-xs font-bold text-white">
                        CHF {month.revenue.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Invoice Status */}
        <div className="card-elevated">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Rechnungsstatus</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-gray-900">Bezahlt</span>
              </div>
              <span className="font-bold text-green-600">{paidInvoices}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-3">
                <ClockIcon className="w-5 h-5 text-amber-600" />
                <span className="font-semibold text-gray-900">Ausstehend</span>
              </div>
              <span className="font-bold text-amber-600">{unpaidInvoices}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-900">Entwurf</span>
              </div>
              <span className="font-bold text-gray-600">{draftInvoices}</span>
            </div>
          </div>
        </div>

        {/* Vehicles Overview */}
        <div className="card-elevated">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Fahrzeuge</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Aktive Fahrzeuge</span>
                <span className="text-2xl font-bold text-primary-600">{activeVehicles}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                  style={{ width: `${(activeVehicles / totalVehicles) * 100}%` }}
                />
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Gesamt</span>
                <span className="text-lg font-bold text-gray-900">{totalVehicles}</span>
              </div>
            </div>
          </div>
          <Link
            to="/vehicles"
            className="mt-4 btn btn-secondary w-full text-sm flex items-center justify-center gap-2"
          >
            <Car className="w-4 h-4" />
            Alle Fahrzeuge anzeigen
          </Link>
        </div>

        {/* Time Tracking */}
        <div className="card-elevated">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Zeiterfassung</h3>
          <div className="space-y-4">
            <div className="bg-primary-50 rounded-xl p-4 border border-primary-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-primary-700">Gesamtstunden</span>
                <span className="text-2xl font-bold text-primary-900">{totalHours.toFixed(1)}</span>
              </div>
              <p className="text-xs text-primary-600">{totalTimeEntries} Einträge</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Durchschnitt</span>
                <span className="text-lg font-bold text-gray-900">
                  {totalTimeEntries > 0 ? (totalHours / totalTimeEntries).toFixed(1) : '0.0'}h
                </span>
              </div>
            </div>
          </div>
          <Link
            to="/time-logs"
            className="mt-4 btn btn-secondary w-full text-sm flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Alle Zeiteinträge
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Invoices */}
        <div className="card-elevated">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Letzte Rechnungen</h3>
            <Link to="/invoices" className="text-sm text-primary-600 font-semibold hover:text-primary-700">
              Alle anzeigen →
            </Link>
          </div>
          <div className="space-y-3">
            {filteredInvoices.slice(0, 5).map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-semibold text-gray-900">{invoice.invoiceNumber}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(invoice.createdAt), 'dd.MM.yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">CHF {invoice.total.toFixed(2)}</p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      invoice.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : invoice.status === 'sent'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {invoice.status === 'paid'
                      ? 'Bezahlt'
                      : invoice.status === 'sent'
                      ? 'Ausstehend'
                      : 'Entwurf'}
                  </span>
                </div>
              </div>
            ))}
            {filteredInvoices.length === 0 && (
              <p className="text-center text-gray-500 py-8">Keine Rechnungen gefunden</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card-elevated">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Schnellaktionen</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/check-in"
              className="card-hover p-4 text-center"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Play className="w-6 h-6 text-white" />
              </div>
              <p className="font-semibold text-sm text-gray-900">Check-In</p>
            </Link>
            <Link
              to="/invoices"
              className="card-hover p-4 text-center"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <p className="font-semibold text-sm text-gray-900">Rechnung</p>
            </Link>
            <Link
              to="/vehicles/new"
              className="card-hover p-4 text-center"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Car className="w-6 h-6 text-white" />
              </div>
              <p className="font-semibold text-sm text-gray-900">Fahrzeug</p>
            </Link>
            <Link
              to="/time-logs"
              className="card-hover p-4 text-center"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <p className="font-semibold text-sm text-gray-900">Zeit</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

