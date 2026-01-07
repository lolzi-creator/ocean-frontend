import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, FileText, Edit, Trash2, X, Download, Send, Clock, Check, FileDown, Car, ChevronDown, ChevronUp } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

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
  createdAt: string;
  vehicle: {
    id: string;
    vin: string;
    brand?: string;
    model?: string;
  };
}

interface Vehicle {
  id: string;
  vin: string;
  brand?: string;
  model?: string;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterVehicle, setFilterVehicle] = useState<string>('all');
  const [groupByVehicle, setGroupByVehicle] = useState<boolean>(true);
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    type: 'estimate',
    vehicleId: '',
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    taxRate: '19',
    notes: '',
    items: [{ description: '', quantity: '1', unitPrice: '0', total: '0' }],
  });

  useEffect(() => {
    fetchInvoices();
    fetchVehicles();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [filterPeriod, filterVehicle]);

  const fetchInvoices = async () => {
    try {
      const params: any = {};
      if (filterVehicle !== 'all') params.vehicleId = filterVehicle;
      
      // Add date filters based on period
      if (filterPeriod !== 'all') {
        const now = new Date();
        let startDate: Date;
        let endDate: Date;
        
        if (filterPeriod === 'week') {
          startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday
          endDate = endOfWeek(now, { weekStartsOn: 1 });
        } else if (filterPeriod === 'month') {
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
        } else if (filterPeriod === 'year') {
          startDate = startOfYear(now);
          endDate = endOfYear(now);
        } else {
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
        }
        
        // Filter invoices by date on client side since backend might not support date filtering
        const response = await api.get('/invoices', { params });
        const allInvoices = response.data;
        
        const filtered = allInvoices.filter((inv: Invoice) => {
          const invDate = new Date(inv.createdAt);
          return invDate >= startDate && invDate <= endDate;
        });
        
        setInvoices(filtered);
      } else {
        const response = await api.get('/invoices', { params });
        setInvoices(response.data);
      }
    } catch (error) {
      toast.error('Rechnungen konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await api.get('/vehicles');
      setVehicles(response.data.filter((v: any) => v.isActive !== false));
    } catch (error) {
      toast.error('Fahrzeuge konnten nicht geladen werden');
    }
  };

  const calculateItemTotal = (quantity: string, unitPrice: string) => {
    return (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0);
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
      total: field === 'quantity' || field === 'unitPrice'
        ? calculateItemTotal(
            field === 'quantity' ? value : newItems[index].quantity,
            field === 'unitPrice' ? value : newItems[index].unitPrice
          ).toString()
        : newItems[index].total,
    };
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: '1', unitPrice: '0', total: '0' }],
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const items = formData.items.map((item) => ({
      description: item.description,
      quantity: parseFloat(item.quantity),
      unitPrice: parseFloat(item.unitPrice),
      total: parseFloat(item.total),
    }));

    try {
      const payload = {
        type: formData.type,
        vehicleId: formData.vehicleId,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail || undefined,
        customerAddress: formData.customerAddress || undefined,
        items,
        taxRate: parseFloat(formData.taxRate),
        notes: formData.notes || undefined,
      };

      if (editingInvoice) {
        await api.patch(`/invoices/${editingInvoice.id}`, payload);
        toast.success('Rechnung erfolgreich aktualisiert');
      } else {
        await api.post('/invoices', payload);
        toast.success('Rechnung erfolgreich erstellt');
      }

      setEditingInvoice(null);
      resetForm();
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Rechnung konnte nicht gespeichert werden');
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      type: invoice.type,
      vehicleId: invoice.vehicle.id,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail || '',
      customerAddress: invoice.customerAddress || '',
      taxRate: invoice.taxRate.toString(),
      notes: invoice.notes || '',
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        total: item.total.toString(),
      })),
    });
    // Note: Full editing should be done via detail page
    // This is kept for status updates only
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

  const resetForm = () => {
    setFormData({
      type: 'estimate',
      vehicleId: '',
      customerName: '',
      customerEmail: '',
      customerAddress: '',
      taxRate: '7.7',
      notes: '',
      items: [{ description: '', quantity: '1', unitPrice: '0', total: '0' }],
    });
    setEditingInvoice(null);
  };

  const subtotal = formData.items.reduce(
    (sum, item) => sum + parseFloat(item.total),
    0
  );
  const taxAmount = subtotal * (parseFloat(formData.taxRate) / 100);
  const total = subtotal + taxAmount;

  const filteredInvoices = invoices.filter((inv) => {
    if (filterType !== 'all' && inv.type !== filterType) return false;
    if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
    return true;
  });

  // Group invoices by vehicle
  const invoicesByVehicle = filteredInvoices.reduce((acc, inv) => {
    const vehicleId = inv.vehicle?.id || 'no-vehicle';
    const vehicleKey = vehicleId === 'no-vehicle' 
      ? 'no-vehicle' 
      : `${inv.vehicle?.brand || ''} ${inv.vehicle?.model || ''} (${inv.vehicle?.vin || ''})`.trim();
    
    if (!acc[vehicleId]) {
      acc[vehicleId] = {
        vehicle: inv.vehicle || null,
        vehicleKey,
        invoices: [],
        total: 0,
      };
    }
    acc[vehicleId].invoices.push(inv);
    acc[vehicleId].total += inv.total;
    return acc;
  }, {} as Record<string, { vehicle: { id: string; vin: string; brand?: string; model?: string } | null; vehicleKey: string; invoices: Invoice[]; total: number }>);

  const toggleVehicleGroup = (vehicleId: string) => {
    setExpandedVehicles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(vehicleId)) {
        newSet.delete(vehicleId);
      } else {
        newSet.add(vehicleId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allVehicleIds = Object.keys(invoicesByVehicle);
    setExpandedVehicles(new Set(allVehicleIds));
  };

  const collapseAll = () => {
    setExpandedVehicles(new Set());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'sent':
        return 'bg-blue-100 text-blue-700';
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);
  const pendingAmount = invoices
    .filter(inv => inv.status === 'sent')
    .reduce((sum, inv) => sum + inv.total, 0);
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Rechnungen & Angebote
          </h1>
          <p className="text-gray-600 font-medium">Rechnungen und Angebote verwalten</p>
        </div>
        <div className="flex items-center gap-3 self-start lg:self-auto">
          <button
            onClick={handleExportCSV}
            className="btn btn-primary flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <FileDown className="w-5 h-5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card border-l-4 border-primary-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Gesamt Rechnungen</p>
              <p className="text-3xl font-bold text-gray-900">{invoices.length}</p>
              <p className="text-xs text-gray-500 mt-1">{filteredInvoices.length} gefiltert</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
        <div className="stat-card border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Einnahmen</p>
              <p className="text-3xl font-bold text-green-600">CHF {totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Bezahlte Rechnungen</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <Check className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
        <div className="stat-card border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Ausstehend</p>
              <p className="text-3xl font-bold text-amber-600">CHF {pendingAmount.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Offene Rechnungen</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
        <div className="stat-card border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Gesamt fakturiert</p>
              <p className="text-3xl font-bold text-blue-600">CHF {totalInvoiced.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Alle Rechnungen</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-elevated">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Typ</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input"
            >
              <option value="all">Alle Typen</option>
              <option value="invoice">Rechnungen</option>
              <option value="estimate">Angebote</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="all">Alle Status</option>
              <option value="draft">Entwurf</option>
              <option value="sent">Gesendet</option>
              <option value="paid">Bezahlt</option>
              <option value="cancelled">Storniert</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Fahrzeug</label>
            <select
              value={filterVehicle}
              onChange={(e) => setFilterVehicle(e.target.value)}
              className="input"
            >
              <option value="all">Alle Fahrzeuge</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.brand && vehicle.model
                    ? `${vehicle.brand} ${vehicle.model}`
                    : vehicle.vin}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterPeriod('week')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                filterPeriod === 'week'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Woche
            </button>
            <button
              onClick={() => setFilterPeriod('month')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                filterPeriod === 'month'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Monat
            </button>
            <button
              onClick={() => setFilterPeriod('year')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                filterPeriod === 'year'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Jahr
            </button>
            <button
              onClick={() => setFilterPeriod('all')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                filterPeriod === 'all'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Gesamt
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={groupByVehicle}
                onChange={(e) => setGroupByVehicle(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-semibold text-gray-700">Nach Fahrzeug gruppieren</span>
            </label>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-600 animate-pulse" />
            </div>
          </div>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="card-elevated text-center py-16">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Keine Rechnungen gefunden</h3>
          <p className="text-gray-600 mb-6">Erstellen Sie Ihre erste Rechnung oder Angebot</p>
            <p className="text-sm text-gray-500">
              Rechnungen und Angebote werden direkt auf der Fahrzeugdetailseite erstellt.
            </p>
        </div>
      ) : groupByVehicle ? (
        // Grouped by vehicle view
        <div className="space-y-4">
          {/* Expand/Collapse All Buttons */}
          {Object.keys(invoicesByVehicle).length > 0 && (
            <div className="flex gap-2 justify-end">
              <button
                onClick={expandAll}
                className="text-sm px-3 py-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors font-medium"
              >
                Alle öffnen
              </button>
              <button
                onClick={collapseAll}
                className="text-sm px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors font-medium"
              >
                Alle schließen
              </button>
            </div>
          )}

          {Object.entries(invoicesByVehicle)
            .sort(([a], [b]) => {
              if (a === 'no-vehicle') return 1;
              if (b === 'no-vehicle') return -1;
              return invoicesByVehicle[a].vehicleKey.localeCompare(invoicesByVehicle[b].vehicleKey);
            })
            .map(([vehicleId, group], groupIndex) => {
              const isExpanded = expandedVehicles.has(vehicleId);
              
              return (
                <div key={vehicleId} className="card-elevated animate-slide-up" style={{ animationDelay: `${groupIndex * 100}ms` }}>
                  {/* Vehicle Header - Clickable */}
                  <button
                    onClick={() => toggleVehicleGroup(vehicleId)}
                    className="w-full text-left border-b border-gray-200 pb-4 mb-0 transition-all duration-200 hover:bg-gray-50 -m-6 p-6 rounded-t-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {group.vehicle ? (
                          <>
                            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                              <Car className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg text-gray-900">
                                {group.vehicle.brand && group.vehicle.model
                                  ? `${group.vehicle.brand} ${group.vehicle.model}`
                                  : group.vehicle.vin}
                              </h3>
                              <p className="text-sm text-gray-600">VIN: {group.vehicle.vin}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {group.invoices.length} {group.invoices.length === 1 ? 'Rechnung' : 'Rechnungen'}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg text-gray-900">Ohne Fahrzeug</h3>
                              <p className="text-xs text-gray-500 mt-1">
                                {group.invoices.length} {group.invoices.length === 1 ? 'Rechnung' : 'Rechnungen'}
                              </p>
                            </div>
                          </>
                        )}
                        {/* Chevron Icon */}
                        <div className="flex-shrink-0 ml-2">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm text-gray-600 mb-1">Gesamt</p>
                        <p className="text-3xl font-bold text-primary-600">
                          CHF {group.total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Invoices List - Collapsible */}
                  {isExpanded && (
                    <div className="pt-4 space-y-3 animate-fade-in">
                      {group.invoices.map((invoice, index) => (
                        <Link
                          key={invoice.id}
                          to={`/invoices/${invoice.id}`}
                          className="block card-hover border border-gray-100"
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4 flex-1">
                              <div className={`w-12 h-12 bg-gradient-to-br ${
                                invoice.type === 'invoice' 
                                  ? 'from-primary-500 to-primary-600' 
                                  : 'from-blue-500 to-blue-600'
                              } rounded-xl flex items-center justify-center shadow-lg`}>
                                <FileText className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-900 mb-1">
                                  {invoice.invoiceNumber}
                                </h4>
                                <div className="flex flex-wrap gap-3 items-center">
                                  <span className={`badge ${
                                    invoice.status === 'paid' ? 'badge-success' :
                                    invoice.status === 'sent' ? 'badge-info' :
                                    invoice.status === 'cancelled' ? 'badge-danger' :
                                    'badge-gray'
                                  }`}>
                                    {invoice.status === 'paid' ? 'Bezahlt' :
                                     invoice.status === 'sent' ? 'Gesendet' :
                                     invoice.status === 'cancelled' ? 'Storniert' :
                                     'Entwurf'}
                                  </span>
                                  <span className="text-sm text-gray-500 capitalize">
                                    {invoice.type === 'invoice' ? 'Rechnung' : 'Angebot'}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {format(new Date(invoice.createdAt), 'dd.MM.yyyy')}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-gray-900">
                                CHF {invoice.total.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((invoice, index) => (
            <div
              key={invoice.id}
              className="card-hover animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <Link
                    to={`/invoices/${invoice.id}`}
                    className="flex items-start gap-4 flex-1 group"
                  >
                    {/* Icon */}
                    <div className="relative flex-shrink-0">
                      <div className="absolute inset-0 bg-primary-500/20 blur-lg rounded-xl" />
                      <div className={`w-16 h-16 bg-gradient-to-br ${
                        invoice.type === 'invoice' 
                          ? 'from-primary-500 to-primary-600' 
                          : 'from-blue-500 to-blue-600'
                      } rounded-xl flex items-center justify-center shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-300`}>
                        <FileText className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-primary-600 transition-colors">
                            {invoice.invoiceNumber}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="capitalize font-medium">{invoice.type === 'invoice' ? 'Rechnung' : 'Angebot'}</span>
                            {' • '}
                            <span className="font-semibold">{invoice.customerName}</span>
                          </p>
                        </div>
                        <span className={`badge ${
                          invoice.status === 'paid' ? 'badge-success' :
                          invoice.status === 'sent' ? 'badge-info' :
                          invoice.status === 'cancelled' ? 'badge-danger' :
                          'badge-gray'
                        }`}>
                          {invoice.status === 'paid' ? 'Bezahlt' :
                           invoice.status === 'sent' ? 'Gesendet' :
                           invoice.status === 'cancelled' ? 'Storniert' :
                           'Entwurf'}
                        </span>
                      </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <span className="text-xs text-gray-500 block mb-1">Fahrzeug</span>
                        <p className="font-semibold text-sm text-gray-900">
                          {invoice.vehicle.brand && invoice.vehicle.model
                            ? `${invoice.vehicle.brand} ${invoice.vehicle.model}`
                            : invoice.vehicle.vin}
                        </p>
                      </div>
                      <div className="bg-primary-50 rounded-xl p-3">
                        <span className="text-xs text-primary-600 block mb-1">Positionen</span>
                        <p className="font-bold text-sm text-primary-900">{invoice.items.length}</p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-3">
                        <span className="text-xs text-green-600 block mb-1">Gesamt</span>
                        <p className="font-bold text-lg text-green-900">CHF {invoice.total.toFixed(2)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <span className="text-xs text-gray-500 block mb-1">Datum</span>
                        <p className="font-semibold text-sm text-gray-900">
                          {format(new Date(invoice.createdAt), 'dd.MM.yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                  </Link>
                
                {/* Actions */}
                <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                  <div className="flex gap-2">
                    <Link
                      to={`/invoices/${invoice.id}`}
                      className="p-2.5 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-110"
                      title="Details anzeigen"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                    </Link>
                    {invoice.status !== 'sent' && invoice.status !== 'paid' && (
                      <button
                        onClick={() => handleStatusUpdate(invoice.id, 'sent')}
                        className="p-2.5 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-110"
                        title="Als gesendet markieren"
                      >
                        <Send className="w-4 h-4 text-blue-600" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(invoice)}
                      className="p-2.5 hover:bg-primary-50 rounded-xl transition-all duration-200 hover:scale-110"
                      title="Bearbeiten"
                    >
                      <Edit className="w-4 h-4 text-primary-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(invoice.id)}
                      className="p-2.5 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-110"
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal - Only for status updates */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold">
                {editingInvoice ? 'Rechnung bearbeiten' : 'Neue Rechnung/Angebot'}
              </h2>
              <button
                onClick={() => {
                  setEditingInvoice(null);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Typ *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input"
                    disabled={!!editingInvoice}
                  >
                    <option value="estimate">Angebot</option>
                    <option value="invoice">Rechnung</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fahrzeug *
                  </label>
                  <select
                    value={formData.vehicleId}
                    onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                    required
                    className="input"
                    disabled={!!editingInvoice}
                  >
                    <option value="">Fahrzeug auswählen</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.brand && vehicle.model
                          ? `${vehicle.brand} ${vehicle.model} - ${vehicle.vin}`
                          : vehicle.vin}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kundenname *
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) =>
                      setFormData({ ...formData, customerName: e.target.value })
                    }
                    required
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kunden-E-Mail
                  </label>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, customerEmail: e.target.value })
                    }
                    className="input"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kundenadresse
                  </label>
                  <textarea
                    value={formData.customerAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, customerAddress: e.target.value })
                    }
                    rows={2}
                    className="input"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">Items *</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    + Position hinzufügen
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-12 md:col-span-5">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Beschreibung"
                          required
                          className="input"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          min="0"
                          step="0.01"
                          placeholder="Menge"
                          required
                          className="input"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                          min="0"
                          step="0.01"
                          placeholder="Preis"
                          required
                          className="input"
                        />
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <input
                          type="text"
                          value={`CHF ${parseFloat(item.total).toFixed(2)}`}
                          disabled
                          className="input bg-gray-50"
                        />
                      </div>
                      <div className="col-span-1">
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-full md:w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Zwischensumme:</span>
                      <span className="font-medium">CHF {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">MwSt. ({formData.taxRate}%):</span>
                      <span className="font-medium">CHF {taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Gesamt:</span>
                      <span>CHF {total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mehrwertsteuer (%)
                </label>
                <input
                  type="number"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                  min="0"
                  max="100"
                  step="0.01"
                  className="input w-32"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="input"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  {editingInvoice ? 'Rechnung aktualisieren' : 'Rechnung erstellen'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingInvoice(null);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

