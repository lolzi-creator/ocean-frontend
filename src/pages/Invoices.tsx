import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { FileText, Trash2, X, Send, Clock, Check, FileDown, ChevronUp, ChevronDown, TrendingUp, Receipt, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useDateFilter, useVehicles } from '../hooks';

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: string;
  status: string;
  customerName: string;
  customerEmail?: string;
  customerAddress?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
  paymentMethod: 'cash' | 'qr_invoice';
  paymentReference?: string;
  paidAt?: string;
  createdAt: string;
  vehicle: {
    id: string;
    vin: string;
    brand?: string;
    model?: string;
  };
}

type SortField = 'date' | 'number' | 'customer' | 'vehicle' | 'total' | 'status';
type SortDir = 'asc' | 'desc';

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterVehicle, setFilterVehicle] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { filterPeriod, setFilterPeriod, filterByDate } = useDateFilter('all');
  const { activeVehicles: vehicles } = useVehicles();

  useEffect(() => {
    fetchInvoices();
  }, [filterPeriod, filterVehicle]);

  const fetchInvoices = async () => {
    try {
      const params: Record<string, string> = {};
      if (filterVehicle !== 'all') params.vehicleId = filterVehicle;

      const response = await api.get('/invoices', { params });
      const allInvoices: Invoice[] = response.data;
      const filtered = filterByDate(allInvoices, (inv) => new Date(inv.createdAt));
      setInvoices(filtered);
    } catch (error) {
      toast.error('Rechnungen konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sind Sie sicher, dass Sie diese Rechnung löschen möchten?')) return;
    try {
      await api.delete(`/invoices/${id}`);
      toast.success('Rechnung erfolgreich gelöscht');
      fetchInvoices();
    } catch (error) {
      toast.error('Rechnung konnte nicht gelöscht werden');
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.patch(`/invoices/${id}`, { status });
      toast.success('Status erfolgreich aktualisiert');
      fetchInvoices();
    } catch (error) {
      toast.error('Status konnte nicht aktualisiert werden');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Rechnungsnummer', 'Typ', 'Status', 'Kunde', 'Fahrzeug', 'Gesamtbetrag', 'Datum'];
    const rows = filteredInvoices.map((inv) => [
      inv.invoiceNumber,
      inv.type === 'invoice' ? 'Rechnung' : 'Angebot',
      inv.status === 'paid' ? 'Bezahlt' : inv.status === 'sent' ? 'Gesendet' : inv.status === 'cancelled' ? 'Storniert' : 'Entwurf',
      inv.customerName,
      inv.vehicle.brand && inv.vehicle.model ? `${inv.vehicle.brand} ${inv.vehicle.model}` : inv.vehicle.vin,
      inv.total.toFixed(2),
      format(new Date(inv.createdAt), 'dd.MM.yyyy'),
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => row.join(';')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rechnungen_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV erfolgreich exportiert');
  };

  // Deduplicate: keep only the latest invoice per vehicle (by type)
  const latestInvoices = (() => {
    const map = new Map<string, Invoice>();
    // invoices are already sorted desc by createdAt from the API
    for (const inv of invoices) {
      const key = `${inv.vehicle.id}_${inv.type}`;
      if (!map.has(key)) {
        map.set(key, inv);
      }
    }
    return Array.from(map.values());
  })();

  // Filtering
  const filteredInvoices = latestInvoices.filter((inv) => {
    if (filterType !== 'all' && inv.type !== filterType) return false;
    if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
    return true;
  });

  // Sorting
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'date':
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'number':
        cmp = a.invoiceNumber.localeCompare(b.invoiceNumber);
        break;
      case 'customer':
        cmp = a.customerName.localeCompare(b.customerName);
        break;
      case 'vehicle': {
        const va = a.vehicle.brand && a.vehicle.model ? `${a.vehicle.brand} ${a.vehicle.model}` : a.vehicle.vin;
        const vb = b.vehicle.brand && b.vehicle.model ? `${b.vehicle.brand} ${b.vehicle.model}` : b.vehicle.vin;
        cmp = va.localeCompare(vb);
        break;
      }
      case 'total':
        cmp = a.total - b.total;
        break;
      case 'status':
        cmp = a.status.localeCompare(b.status);
        break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Stats
  const actualInvoices = invoices.filter(inv => inv.type === 'invoice');
  const estimates = invoices.filter(inv => inv.type === 'estimate');

  const totalRevenue = actualInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);
  const pendingAmount = actualInvoices
    .filter(inv => inv.status === 'sent')
    .reduce((sum, inv) => sum + inv.total, 0);
  const totalInvoiced = actualInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const estimatesTotal = estimates.reduce((sum, inv) => sum + inv.total, 0);
  const estimatesAccepted = estimates.filter(e => e.status === 'paid').length;
  const estimateConversionRate = estimates.length > 0
    ? Math.round((estimatesAccepted / estimates.length) * 100)
    : 0;

  // Overdue detection
  const OVERDUE_DAYS = 30;
  const isOverdue = (inv: Invoice) => {
    if (inv.status !== 'sent' || inv.type !== 'invoice') return false;
    const daysSinceSent = Math.floor((Date.now() - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceSent > OVERDUE_DAYS;
  };
  const overdueInvoices = actualInvoices.filter(isOverdue);
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.total, 0);

  const statusLabel = (s: string) => {
    switch (s) {
      case 'paid': return 'Bezahlt';
      case 'sent': return 'Gesendet';
      case 'cancelled': return 'Storniert';
      default: return 'Entwurf';
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'paid': return 'badge-success';
      case 'sent': return 'badge-info';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-gray';
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-3.5 h-3.5 text-neutral-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-primary-600" />
      : <ChevronDown className="w-3.5 h-3.5 text-primary-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Buchhaltung</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {actualInvoices.length} Rechnungen &middot; {estimates.length} Angebote
          </p>
        </div>
        <button onClick={handleExportCSV} className="btn btn-secondary">
          <FileDown className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl w-fit">
        {[
          { value: 'all', label: 'Alle', count: invoices.length },
          { value: 'invoice', label: 'Rechnungen', count: actualInvoices.length },
          { value: 'estimate', label: 'Angebote', count: estimates.length },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterType(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterType === tab.value
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs ${
              filterType === tab.value ? 'text-neutral-500' : 'text-neutral-400'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Adaptive Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {filterType === 'estimate' ? (
          <>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">{estimates.length}</p>
                  <p className="text-xs text-neutral-500">Angebote</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">CHF {estimatesTotal.toFixed(0)}</p>
                  <p className="text-xs text-neutral-500">Angebotssumme</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                  <Check className="w-5 h-5 text-success-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">{estimatesAccepted}</p>
                  <p className="text-xs text-neutral-500">Akzeptiert</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">{estimateConversionRate}%</p>
                  <p className="text-xs text-neutral-500">Konversionsrate</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">
                    {filterType === 'all' ? invoices.length : actualInvoices.length}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {filterType === 'all' ? 'Dokumente' : 'Rechnungen'}
                  </p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                  <Check className="w-5 h-5 text-success-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">CHF {totalRevenue.toFixed(0)}</p>
                  <p className="text-xs text-neutral-500">Bezahlt</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">CHF {pendingAmount.toFixed(0)}</p>
                  <p className="text-xs text-neutral-500">Offen</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-neutral-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">CHF {totalInvoiced.toFixed(0)}</p>
                  <p className="text-xs text-neutral-500">Fakturiert</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Overdue Warning */}
      {overdueInvoices.length > 0 && filterType !== 'estimate' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              {overdueInvoices.length} überfällige {overdueInvoices.length === 1 ? 'Rechnung' : 'Rechnungen'}
            </p>
            <p className="text-xs text-red-600">
              CHF {overdueAmount.toFixed(2)} offen seit über {OVERDUE_DAYS} Tagen
            </p>
          </div>
          <button
            onClick={() => { setFilterStatus('sent'); setFilterType('invoice'); }}
            className="text-xs font-medium text-red-700 hover:text-red-800 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            Anzeigen
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-32">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input text-sm"
            >
              <option value="all">Alle Status</option>
              <option value="draft">Entwurf</option>
              <option value="sent">Gesendet</option>
              <option value="paid">Bezahlt</option>
              <option value="cancelled">Storniert</option>
            </select>
          </div>
          <div className="w-40">
            <select
              value={filterVehicle}
              onChange={(e) => setFilterVehicle(e.target.value)}
              className="input text-sm"
            >
              <option value="all">Alle Fahrzeuge</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.brand && vehicle.model ? `${vehicle.brand} ${vehicle.model}` : vehicle.vin}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg">
            {['week', 'month', 'year', 'all'].map((period) => (
              <button
                key={period}
                onClick={() => setFilterPeriod(period as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filterPeriod === period
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {period === 'week' ? 'Woche' : period === 'month' ? 'Monat' : period === 'year' ? 'Jahr' : 'Alle'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : sortedInvoices.length === 0 ? (
        <div className="card text-center py-16">
          <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-700 mb-1">Keine Einträge gefunden</h3>
          <p className="text-sm text-neutral-500">Rechnungen und Angebote werden auf der Fahrzeugdetailseite erstellt.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/50">
                  {([
                    ['number', 'Nr.'],
                    ['date', 'Datum'],
                    ['customer', 'Kunde'],
                    ['vehicle', 'Fahrzeug'],
                    ['status', 'Status'],
                    ['total', 'Betrag'],
                  ] as [SortField, string][]).map(([field, label]) => (
                    <th
                      key={field}
                      onClick={() => toggleSort(field)}
                      className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-neutral-700 select-none"
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        <SortIcon field={field} />
                      </span>
                    </th>
                  ))}
                  <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sortedInvoices.map((invoice) => {
                  const overdue = isOverdue(invoice);
                  return (
                    <tr
                      key={invoice.id}
                      className={`group hover:bg-neutral-50 transition-colors ${overdue ? 'bg-red-50/40' : ''}`}
                    >
                      {/* Nr. */}
                      <td className="px-4 py-3">
                        <Link to={`/invoices/${invoice.id}`} className="hover:text-primary-600 transition-colors">
                          <span className="font-semibold text-sm text-neutral-900">{invoice.invoiceNumber}</span>
                          <span className="block text-xs text-neutral-400">
                            {invoice.type === 'invoice' ? 'Rechnung' : 'Angebot'}
                          </span>
                        </Link>
                      </td>
                      {/* Datum */}
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {format(new Date(invoice.createdAt), 'dd.MM.yyyy')}
                      </td>
                      {/* Kunde */}
                      <td className="px-4 py-3 text-sm text-neutral-900 font-medium">
                        {invoice.customerName}
                      </td>
                      {/* Fahrzeug */}
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {invoice.vehicle.brand && invoice.vehicle.model
                          ? `${invoice.vehicle.brand} ${invoice.vehicle.model}`
                          : invoice.vehicle.vin}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`badge ${statusBadge(invoice.status)}`}>
                            {statusLabel(invoice.status)}
                          </span>
                          {overdue && (
                            <span className="badge badge-danger text-[10px] flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              Überfällig
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Betrag */}
                      <td className="px-4 py-3 text-sm font-bold text-neutral-900 tabular-nums">
                        CHF {invoice.total.toFixed(2)}
                      </td>
                      {/* Aktionen */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {invoice.status === 'draft' && (
                            <button
                              onClick={() => handleStatusUpdate(invoice.id, 'sent')}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Als gesendet markieren"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          {(invoice.status === 'draft' || invoice.status === 'sent') && (
                            <button
                              onClick={() => handleStatusUpdate(invoice.id, 'paid')}
                              className={`p-1.5 rounded-lg transition-colors ${
                                overdue ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                              }`}
                              title="Als bezahlt markieren"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(invoice.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table footer with totals */}
          <div className="border-t border-neutral-200 bg-neutral-50/50 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-neutral-500">
              {sortedInvoices.length} {sortedInvoices.length === 1 ? 'Eintrag' : 'Einträge'}
            </span>
            <span className="text-sm font-bold text-neutral-900">
              Total: CHF {sortedInvoices.reduce((s, i) => s + i.total, 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
