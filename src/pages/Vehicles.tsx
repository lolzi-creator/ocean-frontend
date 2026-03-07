import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Car, Edit, Trash2, X, Check, ChevronDown, ChevronUp, FileText, Play, Pause, Loader2, Download, AlertTriangle, Package, CheckCircle2, Clock, ShoppingCart } from 'lucide-react';
import { createPortal } from 'react-dom';
import CreateInvoiceModal from '../components/CreateInvoiceModal';
import NachbestellungModal from '../components/NachbestellungModal';

interface Vehicle {
  id: string;
  vin: string;
  brand?: string;
  model?: string;
  year?: number;
  trim?: string;
  style?: string;
  bodyType?: string;
  engine?: string;
  transmission?: string;
  drive?: string;
  manufacturer?: string;
  origin?: string;
  licensePlate?: string;
  workDescription?: string;
  serviceType?: string;
  serviceTemplateId?: string;
  serviceTemplate?: any;
  selectedParts?: any;
  color?: string;
  mileage?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  status?: string; // on_hold, active, completed
  isActive: boolean;
  createdAt: string;
}

interface SelectedProduct {
  id: string;
  articleNumber: string;
  name: string;
  description: string;
  supplier: string;
  brand: string;
  stock: number;
  totalStock: number;
  price: number | null;
  images: string[];
  category: string;
  categoryName: string;
  salesQuantity: number;
  availabilityType?: string;
  deliveryInfo?: string;
  quantity: number;
  isAutoSelected?: boolean;
}

// Extract numeric price from Derendinger price object or plain number
function getPartPrice(price: any): number {
  if (price == null) return 0;
  if (typeof price === 'number') return price;
  if (typeof price === 'object') {
    return price.net1Price || price.grossPrice || price.oepPrice || 0;
  }
  return Number(price) || 0;
}

export default function Vehicles() {
  const navigate = useNavigate();
  const { user, currentWorker } = useAuth();
  const isAdmin = (currentWorker?.role || user?.role) === 'admin';
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vinInput, setVinInput] = useState('');
  const [vinData, setVinData] = useState<any>(null);
  const [vehicleImage, setVehicleImage] = useState<string | null>(null);
  const [showFullVinData, setShowFullVinData] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [invoiceType, setInvoiceType] = useState<'estimate' | 'invoice'>('estimate');
  
  // Activation modal state
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activatingVehicle, setActivatingVehicle] = useState<Vehicle | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [isActivating, setIsActivating] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownInvoices, setDropdownInvoices] = useState<any[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_hold' | 'active' | 'completed'>('all');

  // Nachbestellung modal state
  const [showNachbestellungModal, setShowNachbestellungModal] = useState(false);
  const [nachbestellungVehicle, setNachbestellungVehicle] = useState<Vehicle | null>(null);

  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completingVehicle, setCompletingVehicle] = useState<Vehicle | null>(null);
  const [completionData, setCompletionData] = useState<{
    invoice: any | null;
    invoicePaid: boolean;
    revenue: number;
    expensesTotal: number;
    laborCost: number;
    laborHours: number;
    profit: number;
    workers: Array<{ name: string; hours: number; rate: number; cost: number }>;
  } | null>(null);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  const [formData, setFormData] = useState({
    vin: '',
    brand: '',
    model: '',
    year: '',
    trim: '',
    style: '',
    bodyType: '',
    engine: '',
    transmission: '',
    drive: '',
    manufacturer: '',
    origin: '',
    licensePlate: '',
    workDescription: '',
    color: '',
    mileage: '',
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdownId) return;
    const close = () => setOpenDropdownId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openDropdownId]);

  const fetchVehicles = async () => {
    try {
      const response = await api.get('/vehicles');
      setVehicles(response.data || []);
    } catch (error) {
      console.error('[Vehicles] Error:', error);
      toast.error('Fahrzeuge konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  };

  const decodeVin = async () => {
    if (!vinInput || vinInput.length !== 17) {
      toast.error('VIN muss 17 Zeichen lang sein');
      return;
    }

    try {
      const response = await api.get(`/vehicles/decode/${vinInput}`);
      const data = response.data;
      setVinData(data);
      
      // Extract vehicle data directly from API response
      const year = data.vehicle?.year || data.year;
      const make = data.vehicle?.make || data.make;
      const model = data.vehicle?.model || data.model;
      
      setFormData((prev) => ({
        ...prev,
        vin: vinInput,
        brand: make || prev.brand,
        model: model || prev.model,
        year: year ? year.toString() : prev.year,
        trim: data.trim || prev.trim,
        style: data.style || prev.style,
        bodyType: data.body || data.bodyType || prev.bodyType,
        engine: data.engine || prev.engine,
        transmission: data.transmission || prev.transmission,
        drive: data.drive || prev.drive,
        manufacturer: data.vehicle?.manufacturer || data.manufacturer || prev.manufacturer,
        origin: data.origin || prev.origin,
      }));
      
      // Handle images if available - check multiple possible locations
      if (data.images && Array.isArray(data.images) && data.images.length > 0) {
        setVehicleImage(data.images[0]); // Use first image
      } else if (data.image) {
        setVehicleImage(data.image);
      } else if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
        setVehicleImage(data.photos[0]);
      } else if (data.media?.images?.[0]) {
        setVehicleImage(data.media.images[0]);
      } else {
        setVehicleImage(null);
      }
      
      toast.success('VIN erfolgreich dekodiert');
    } catch (error) {
      toast.error('VIN konnte nicht dekodiert werden');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        year: formData.year ? parseInt(formData.year) : undefined,
        mileage: formData.mileage ? parseInt(formData.mileage) : undefined,
        // Remove empty strings and convert to undefined
        trim: formData.trim || undefined,
        style: formData.style || undefined,
        bodyType: formData.bodyType || undefined,
        engine: formData.engine || undefined,
        transmission: formData.transmission || undefined,
        drive: formData.drive || undefined,
        manufacturer: formData.manufacturer || undefined,
        origin: formData.origin || undefined,
        color: formData.color || undefined,
      };

      if (editingVehicle) {
        await api.patch(`/vehicles/${editingVehicle.id}`, payload);
        toast.success('Fahrzeug erfolgreich aktualisiert');
      } else {
        await api.post('/vehicles', payload);
        toast.success('Fahrzeug erfolgreich erstellt');
      }

      setShowModal(false);
      resetForm();
      fetchVehicles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fahrzeug konnte nicht gespeichert werden');
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      vin: vehicle.vin,
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      year: vehicle.year?.toString() || '',
      trim: vehicle.trim || '',
      style: vehicle.style || '',
      bodyType: vehicle.bodyType || '',
      engine: vehicle.engine || '',
      transmission: vehicle.transmission || '',
      drive: vehicle.drive || '',
      manufacturer: vehicle.manufacturer || '',
      origin: vehicle.origin || '',
      licensePlate: vehicle.licensePlate || '',
      workDescription: vehicle.workDescription || '',
      color: vehicle.color || '',
      mileage: vehicle.mileage?.toString() || '',
    });
    setShowModal(true);
  };

  const openDeleteModal = (vehicle: Vehicle) => {
    setDeleteTarget(vehicle);
    setDeleteConfirmText('');
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirmText !== 'DELETE') return;

    try {
      await api.delete(`/vehicles/${deleteTarget.id}`);
      toast.success('Fahrzeug und alle zugehörigen Daten gelöscht');
      setDeleteTarget(null);
      setDeleteConfirmText('');
      fetchVehicles();
    } catch (error) {
      toast.error('Fahrzeug konnte nicht gelöscht werden');
    }
  };

  const resetForm = () => {
    setFormData({
      vin: '',
      brand: '',
      model: '',
      year: '',
      trim: '',
      style: '',
      bodyType: '',
      engine: '',
      transmission: '',
      drive: '',
      manufacturer: '',
      origin: '',
      licensePlate: '',
      workDescription: '',
      color: '',
      mileage: '',
    });
    setEditingVehicle(null);
    setVinInput('');
    setVinData(null);
    setVehicleImage(null);
    setShowFullVinData(false);
  };

  const filteredVehicles = vehicles.filter((v) => {
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'on_hold' && v.status !== 'on_hold') return false;
      if (statusFilter === 'active' && v.status !== 'active') return false;
      if (statusFilter === 'completed' && v.status !== 'completed') return false;
    }
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        v.vin.toLowerCase().includes(term) ||
        v.brand?.toLowerCase().includes(term) ||
        v.model?.toLowerCase().includes(term) ||
        v.licensePlate?.toLowerCase().includes(term) ||
        v.customerName?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const totalVehicles = vehicles.length;
  const draftCount = vehicles.filter(v => v.status === 'on_hold').length;
  const activeCount = vehicles.filter(v => v.status === 'active').length;
  const completedCount = vehicles.filter(v => v.status === 'completed').length;

  const handleOpenCompletion = async (vehicle: Vehicle) => {
    setCompletingVehicle(vehicle);
    setShowCompletionModal(true);
    setCompletionLoading(true);
    setCompletionData(null);

    try {
      const [invoicesRes, expensesRes, timeLogsRes] = await Promise.all([
        api.get('/invoices', { params: { vehicleId: vehicle.id } }),
        api.get('/expenses/total', { params: { vehicleId: vehicle.id } }),
        api.get('/time-logs', { params: { vehicleId: vehicle.id } }),
      ]);

      // Latest invoice for this vehicle
      const invoices = invoicesRes.data || [];
      const latestInvoice = invoices.find((i: any) => i.type === 'invoice') || null;
      const revenue = latestInvoice?.total || 0;
      const invoicePaid = latestInvoice?.status === 'paid';

      // Expenses total
      const expensesTotal = expensesRes.data?.totalAmount || 0;

      // Worker costs from time logs
      const timeLogs = timeLogsRes.data || [];
      const workerMap = new Map<string, { name: string; hours: number; rate: number }>();
      for (const log of timeLogs) {
        const userId = log.user?.id || log.userId;
        const name = log.user?.name || 'Unbekannt';
        const rate = log.user?.hourlyRate || 35;
        const existing = workerMap.get(userId);
        if (existing) {
          existing.hours += log.hours || 0;
        } else {
          workerMap.set(userId, { name, hours: log.hours || 0, rate });
        }
      }
      const workers = Array.from(workerMap.values()).map((w) => ({
        ...w,
        cost: Math.round(w.hours * w.rate * 100) / 100,
      }));
      const laborCost = workers.reduce((sum, w) => sum + w.cost, 0);
      const laborHours = workers.reduce((sum, w) => sum + w.hours, 0);

      const profit = revenue - expensesTotal - laborCost;

      setCompletionData({
        invoice: latestInvoice,
        invoicePaid,
        revenue,
        expensesTotal,
        laborCost,
        laborHours,
        profit,
        workers,
      });
    } catch {
      toast.error('Daten konnten nicht geladen werden');
      setShowCompletionModal(false);
    } finally {
      setCompletionLoading(false);
    }
  };

  const handleConfirmCompletion = async () => {
    if (!completingVehicle) return;
    setIsCompleting(true);
    try {
      await api.patch(`/vehicles/${completingVehicle.id}`, {
        status: 'completed',
        isActive: false,
      });
      toast.success('Fahrzeug abgeschlossen');
      setShowCompletionModal(false);
      setCompletingVehicle(null);
      setCompletionData(null);
      fetchVehicles();
    } catch {
      toast.error('Status konnte nicht aktualisiert werden');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleQuickInvoice = (vehicle: Vehicle, type: 'estimate' | 'invoice') => {
    setSelectedVehicle(vehicle);
    setInvoiceType(type);
    setOpenDropdownId(null);
    setShowInvoiceModal(true);
  };

  const handleOpenDropdown = async (vehicleId: string) => {
    if (openDropdownId === vehicleId) {
      setOpenDropdownId(null);
      return;
    }
    setOpenDropdownId(vehicleId);
    setDropdownLoading(true);
    setDropdownInvoices([]);
    try {
      const res = await api.get(`/invoices?vehicleId=${vehicleId}`);
      setDropdownInvoices(res.data);
    } catch {
      setDropdownInvoices([]);
    } finally {
      setDropdownLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Fahrzeuge</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {totalVehicles} Fahrzeuge • {activeCount} aktiv
          </p>
        </div>
        <Link to="/vehicles/new" className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Neues Fahrzeug
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl w-fit">
        {([
          { value: 'all', label: 'Alle', count: totalVehicles },
          { value: 'on_hold', label: 'Wartend', count: draftCount },
          { value: 'active', label: 'Aktiv', count: activeCount },
          { value: 'completed', label: 'Fertig', count: completedCount },
        ] as const).map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === tab.value
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs ${
              statusFilter === tab.value ? 'text-neutral-500' : 'text-neutral-400'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{totalVehicles}</p>
              <p className="text-xs text-neutral-500">Gesamt</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{draftCount}</p>
              <p className="text-xs text-neutral-500">Wartend</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{activeCount}</p>
              <p className="text-xs text-neutral-500">Aktiv</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{completedCount}</p>
              <p className="text-xs text-neutral-500">Fertig</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          placeholder="Suche nach VIN, Marke, Modell..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Vehicles List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="card text-center py-12">
          <Car className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-1">Keine Fahrzeuge</h3>
          <p className="text-sm text-neutral-500 mb-4">
            {searchTerm ? 'Keine Ergebnisse für Ihre Suche' : 'Fügen Sie Ihr erstes Fahrzeug hinzu'}
          </p>
          {!searchTerm && (
            <Link to="/vehicles/new" className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Fahrzeug hinzufügen
            </Link>
          )}
        </div>
      ) : (
        <div className="card p-0 overflow-visible">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Fahrzeug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide hidden md:table-cell">VIN</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide hidden lg:table-cell">Kennzeichen</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredVehicles.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                  className="hover:bg-neutral-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        vehicle.isActive ? 'bg-primary-100' : 'bg-neutral-100'
                      }`}>
                        <Car className={`w-4 h-4 ${vehicle.isActive ? 'text-primary-600' : 'text-neutral-400'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900 text-sm">
                          {vehicle.brand && vehicle.model ? `${vehicle.brand} ${vehicle.model}` : 'Unbekannt'}
                        </p>
                        <p className="text-xs text-neutral-500">{vehicle.year || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <code className="text-xs text-neutral-600 bg-neutral-100 px-2 py-1 rounded">{vehicle.vin}</code>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-neutral-700">{vehicle.licensePlate || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${
                      vehicle.status === 'active' || (vehicle.isActive && vehicle.status !== 'on_hold')
                        ? 'badge-success' 
                        : vehicle.status === 'on_hold'
                        ? 'badge-warning'
                        : vehicle.status === 'completed'
                        ? 'badge-info'
                        : 'badge-gray'
                    }`}>
                      {vehicle.status === 'active' ? 'Aktiv' : 
                       vehicle.status === 'on_hold' ? 'Wartend' :
                       vehicle.status === 'completed' ? 'Fertig' :
                       vehicle.isActive ? 'Aktiv' : 'Neu'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {(vehicle.status === 'on_hold' || (!vehicle.status && !vehicle.isActive)) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivatingVehicle(vehicle);
                            if (vehicle.selectedParts && Array.isArray(vehicle.selectedParts)) {
                              setSelectedProducts(vehicle.selectedParts);
                            } else {
                              setSelectedProducts([]);
                            }
                            setShowActivationModal(true);
                          }}
                          className="btn btn-sm bg-success-50 text-success-700 hover:bg-success-100"
                        >
                          <Play className="w-3 h-3" />
                          <span className="hidden sm:inline">Start</span>
                        </button>
                      )}
                      {vehicle.status === 'active' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCompletion(vehicle);
                            }}
                            className="btn btn-sm bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span className="hidden sm:inline">Fertig</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setNachbestellungVehicle(vehicle);
                              setShowNachbestellungModal(true);
                            }}
                            className="btn btn-sm bg-orange-50 text-orange-700 hover:bg-orange-100"
                            title="Nachbestellung"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            <span className="hidden sm:inline">Nachbestellen</span>
                          </button>
                        </>
                      )}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDropdown(vehicle.id);
                          }}
                          className="flex items-center gap-0.5 p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
                          title="Angebot / Rechnung"
                        >
                          <FileText className="w-4 h-4 text-neutral-500" />
                          <ChevronDown className="w-3 h-3 text-neutral-400" />
                        </button>
                        {openDropdownId === vehicle.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-neutral-200 py-1 z-50 min-w-[240px]">
                            {/* Existing invoices */}
                            {dropdownLoading ? (
                              <div className="px-3 py-2 flex items-center gap-2 text-xs text-neutral-400">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Laden...
                              </div>
                            ) : dropdownInvoices.length > 0 ? (
                              <>
                                {dropdownInvoices.map((inv: any) => (
                                  <div
                                    key={inv.id}
                                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-50 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenDropdownId(null);
                                        navigate(`/invoices/${inv.id}`);
                                      }}
                                      className="flex-1 text-left text-xs text-neutral-600 hover:text-primary-600 truncate"
                                    >
                                      {inv.invoiceNumber}
                                    </button>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${
                                      inv.type === 'estimate'
                                        ? 'bg-purple-50 text-purple-600'
                                        : 'bg-blue-50 text-blue-600'
                                    }`}>
                                      {inv.type === 'estimate' ? 'Angebot' : 'Rechnung'}
                                    </span>
                                    {inv.pdfUrl && (
                                      <a
                                        href={inv.pdfUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-0.5 hover:bg-neutral-100 rounded text-neutral-400 hover:text-primary-600 transition-colors flex-shrink-0"
                                        title="PDF herunterladen"
                                      >
                                        <Download className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                ))}
                                <div className="border-t border-neutral-100 my-1" />
                              </>
                            ) : null}

                            {/* Create actions — status-based */}
                            {(() => {
                              const estCount = dropdownInvoices.filter((i: any) => i.type === 'estimate').length;
                              const invCount = dropdownInvoices.filter((i: any) => i.type === 'invoice').length;
                              const status = vehicle.status;
                              const showEstimate = status === 'on_hold' || status === 'completed' || !status;
                              const showInvoice = status === 'active' || status === 'completed';
                              return (
                                <>
                                  {showEstimate && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickInvoice(vehicle, 'estimate');
                                      }}
                                      className="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                                    >
                                      {estCount > 0 ? `${estCount + 1}. ` : ''}Angebot erstellen
                                    </button>
                                  )}
                                  {showInvoice && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickInvoice(vehicle, 'invoice');
                                      }}
                                      className="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                                    >
                                      {invCount > 0 ? `${invCount + 1}. ` : ''}Rechnung erstellen
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(vehicle); }}
                        className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
                        title="Bearbeiten"
                      >
                        <Edit className="w-4 h-4 text-neutral-500" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openDeleteModal(vehicle); }}
                          className="p-1.5 hover:bg-danger-50 rounded-lg transition-colors"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4 text-danger-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-3xl z-10">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {editingVehicle ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug hinzufügen'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {editingVehicle ? 'Aktualisieren Sie die Fahrzeuginformationen' : 'Fügen Sie ein neues Fahrzeug zur Garage hinzu'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingVehicle && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    VIN (Fahrzeugidentifikationsnummer)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={vinInput}
                      onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                      maxLength={17}
                      placeholder="17-stellige VIN eingeben"
                      className="input flex-1"
                    />
                    <button
                      type="button"
                      onClick={decodeVin}
                      className="btn btn-secondary whitespace-nowrap"
                    >
                      VIN dekodieren
                    </button>
                  </div>
                  {vinData && (
                    <div className="mt-2 space-y-2">
                      <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700">
                        <Check className="w-4 h-4 inline mr-2" />
                        VIN erfolgreich dekodiert
                      </div>
                      {vehicleImage && (
                        <div className="mt-2">
                          <img
                            src={vehicleImage}
                            alt="Vehicle"
                            className="w-full h-48 object-cover rounded-lg border border-gray-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      {/* Quick summary */}
                      {(vinData.trim || vinData.engine || vinData.bodyType || vinData.transmission) && (
                        <div className="p-2 bg-gray-50 rounded text-xs text-gray-600">
                          {vinData.trim && <><strong>Trim:</strong> {vinData.trim}</>}
                          {vinData.engine && <> • <strong>Engine:</strong> {vinData.engine}</>}
                          {vinData.bodyType && <> • <strong>Body:</strong> {vinData.bodyType}</>}
                          {vinData.transmission && <> • <strong>Transmission:</strong> {vinData.transmission}</>}
                        </div>
                      )}
                      {/* Expandable full data */}
                      <button
                        type="button"
                        onClick={() => setShowFullVinData(!showFullVinData)}
                        className="w-full flex items-center justify-between p-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm text-blue-700 transition-colors"
                      >
                        <span className="font-medium">
                          {showFullVinData ? 'Ausblenden' : 'Anzeigen'} Vollständige VIN-Daten
                        </span>
                        {showFullVinData ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {showFullVinData && (
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                            {JSON.stringify(vinData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {/* Basic Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Grundinformationen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        VIN *
                      </label>
                      <input
                        type="text"
                        value={formData.vin}
                        onChange={(e) =>
                          setFormData({ ...formData, vin: e.target.value.toUpperCase() })
                        }
                        required
                        maxLength={17}
                        className="input"
                        disabled={!!editingVehicle}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Marke/Hersteller
                      </label>
                      <input
                        type="text"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Model
                      </label>
                      <input
                        type="text"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Year
                      </label>
                      <input
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ausstattung
                      </label>
                      <input
                        type="text"
                        value={formData.trim}
                        onChange={(e) => setFormData({ ...formData, trim: e.target.value })}
                        className="input"
                        placeholder="e.g., XLE Auto (Natl)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stil
                      </label>
                      <input
                        type="text"
                        value={formData.style}
                        onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                        className="input"
                        placeholder="e.g., 2.5, 4 Cylinder Engine"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Karosserietyp
                      </label>
                      <input
                        type="text"
                        value={formData.bodyType}
                        onChange={(e) => setFormData({ ...formData, bodyType: e.target.value })}
                        className="input"
                        placeholder="e.g., Sedan/Saloon"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Farbe
                      </label>
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                {/* Technical Details */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Technische Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Motor
                      </label>
                      <input
                        type="text"
                        value={formData.engine}
                        onChange={(e) => setFormData({ ...formData, engine: e.target.value })}
                        className="input"
                        placeholder="e.g., 2.5, 4 Cylinder Engine"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Getriebe
                      </label>
                      <input
                        type="text"
                        value={formData.transmission}
                        onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                        className="input"
                        placeholder="e.g., Automatic"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Antrieb
                      </label>
                      <input
                        type="text"
                        value={formData.drive}
                        onChange={(e) => setFormData({ ...formData, drive: e.target.value })}
                        className="input"
                        placeholder="e.g., Front Wheel Drive"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kilometerstand
                      </label>
                      <input
                        type="number"
                        value={formData.mileage}
                        onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                        min="0"
                        className="input"
                        placeholder="Aktueller Kilometerstand"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Zusätzliche Informationen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hersteller
                      </label>
                      <input
                        type="text"
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                        className="input"
                        placeholder="Vollständiger Herstellername"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Herkunft
                      </label>
                      <input
                        type="text"
                        value={formData.origin}
                        onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                        className="input"
                        placeholder="e.g., United States"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kennzeichen
                      </label>
                      <input
                        type="text"
                        value={formData.licensePlate}
                        onChange={(e) =>
                          setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })
                        }
                        className="input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arbeitsbeschreibung
                </label>
                <textarea
                  value={formData.workDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, workDescription: e.target.value })
                  }
                  rows={3}
                  className="input"
                    placeholder="Beschreiben Sie die benötigte Arbeit..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  {editingVehicle ? 'Fahrzeug aktualisieren' : 'Fahrzeug erstellen'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
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

      {/* Quick Invoice/Quote Modal */}
      {showInvoiceModal && selectedVehicle && (
        <CreateInvoiceModal
          isOpen={showInvoiceModal}
          vehicle={selectedVehicle}
          type={invoiceType}
          ordinal={
            (invoiceType === 'invoice'
              ? dropdownInvoices.filter((i: any) => i.type === 'invoice').length
              : dropdownInvoices.filter((i: any) => i.type === 'estimate').length) + 1
          }
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedVehicle(null);
          }}
          onCreated={() => {
            setShowInvoiceModal(false);
            setSelectedVehicle(null);
            fetchVehicles();
          }}
        />
      )}

      {/* Vehicle Activation Modal - For activating on_hold vehicles */}
      {showActivationModal && activatingVehicle && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-3xl z-10">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Fahrzeug aktivieren
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {activatingVehicle.brand} {activatingVehicle.model} • {activatingVehicle.vin}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowActivationModal(false);
                  setActivatingVehicle(null);
                  setSelectedProducts([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Info about activation */}
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Play className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Fahrzeug aktivieren</p>
                    <p className="text-sm text-green-700 mt-1">
                      Wählen Sie die Ersatzteile aus, die für diesen Auftrag benötigt werden. 
                      Nach der Aktivierung können die Arbeiten beginnen.
                    </p>
                  </div>
                </div>
              </div>

              {/* Service template info */}
              {activatingVehicle.serviceTemplate && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                  <span className="font-medium">Service-Vorlage:</span>{' '}
                  {activatingVehicle.serviceTemplate.name}
                </div>
              )}

              {/* Saved parts from draft phase */}
              {selectedProducts.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Gespeicherte Ersatzteile aus Angebot</h3>
                  <div className="space-y-2">
                    {selectedProducts.map((product, idx) => (
                      <div key={product.id || idx} className="flex items-center justify-between p-3 bg-primary-50 border border-primary-200 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {product.name || `${product.supplier} ${product.articleNumber}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {product.supplier} • {product.articleNumber}
                            {product.categoryName && ` • ${product.categoryName}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                if (product.quantity <= 1) {
                                  setSelectedProducts(selectedProducts.filter((_, i) => i !== idx));
                                } else {
                                  setSelectedProducts(selectedProducts.map((p, i) => i === idx ? { ...p, quantity: p.quantity - 1 } : p));
                                }
                              }}
                              className="w-7 h-7 rounded-full bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center text-sm font-bold"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-medium text-sm">{product.quantity}</span>
                            <button
                              onClick={() => {
                                setSelectedProducts(selectedProducts.map((p, i) => i === idx ? { ...p, quantity: p.quantity + 1 } : p));
                              }}
                              className="w-7 h-7 rounded-full bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center text-sm font-bold"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 w-20 text-right">
                            {getPartPrice(product.price) > 0
                              ? `CHF ${(getPartPrice(product.price) * product.quantity).toFixed(2)}`
                              : 'Kein Preis'}
                          </span>
                          <button
                            onClick={() => setSelectedProducts(selectedProducts.filter((_, i) => i !== idx))}
                            className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-2 text-sm">
                      <span className="font-semibold text-gray-900">
                        Total: CHF {selectedProducts.reduce((sum, p) => sum + getPartPrice(p.price) * (p.quantity || 1), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {selectedProducts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Keine Ersatzteile gespeichert</p>
                  <p className="text-sm mt-1">Das Fahrzeug wird ohne Teile-Ausgaben aktiviert</p>
                </div>
              )}
            </div>

            {/* Footer with action buttons */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-3xl">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowActivationModal(false);
                    setActivatingVehicle(null);
                    setSelectedProducts([]);
                  }}
                  className="btn btn-secondary"
                  disabled={isActivating}
                >
                  Abbrechen
                </button>
                <button
                  onClick={async () => {
                    setIsActivating(true);
                    try {
                      // Create expenses for selected products
                      if (selectedProducts.length > 0) {
                        let created = 0;
                        for (const product of selectedProducts) {
                          const price = getPartPrice(product.price);
                          const qty = Number(product.quantity) || 1;
                          const amount = Math.round(price * qty * 100) / 100;
                          if (amount <= 0) continue;
                          await api.post('/expenses', {
                            vehicleId: activatingVehicle.id,
                            description: `${qty}x ${product.name || product.articleNumber} (${product.supplier})`,
                            category: 'parts',
                            amount,
                            date: new Date().toISOString(),
                            notes: product.articleNumber ? `Derendinger: ${product.supplier} ${product.articleNumber}` : undefined,
                          });
                          created++;
                        }
                        if (created > 0) {
                          toast.success(`${created} Ersatzteile als Ausgaben erfasst!`);
                        }

                        // Place actual Derendinger order (cart/add → order/place)
                        const productsWithRaw = selectedProducts.filter((p: any) => p._rawArticle && p._rawCategory);
                        if (productsWithRaw.length > 0) {
                          try {
                            for (const product of productsWithRaw) {
                              await api.post('/derendinger/cart/add', {
                                rawArticle: (product as any)._rawArticle,
                                rawCategory: (product as any)._rawCategory,
                                rawVehicle: (product as any)._rawVehicle,
                                quantity: Number(product.quantity) || 1,
                              });
                            }
                            const orderRes = await api.post('/derendinger/order/place', {
                              reference: `${activatingVehicle.licensePlate || activatingVehicle.vin}`,
                            });
                            if (orderRes.data.success) {
                              toast.success(`Derendinger-Bestellung erfolgreich! ${orderRes.data.orderNumber ? `Nr: ${orderRes.data.orderNumber}` : ''}`);
                            }
                          } catch (orderErr: any) {
                            console.error('Derendinger order error:', orderErr);
                            toast.error('Teile konnten nicht bei Derendinger bestellt werden: ' + (orderErr.response?.data?.message || orderErr.message));
                          }
                        }
                      }

                      // Update vehicle status to active and clear savedParts
                      await api.patch(`/vehicles/${activatingVehicle.id}`, {
                        status: 'active',
                        isActive: true,
                        selectedParts: null,
                      });
                      
                      toast.success('Fahrzeug aktiviert - Arbeiten können beginnen!');
                      setShowActivationModal(false);
                      setActivatingVehicle(null);
                      setSelectedProducts([]);
                      fetchVehicles();
                    } catch (error: any) {
                      toast.error(error.response?.data?.message || 'Fehler beim Aktivieren');
                    } finally {
                      setIsActivating(false);
                    }
                  }}
                  disabled={isActivating}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isActivating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Aktiviere...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      {selectedProducts.length > 0 
                        ? `Aktivieren & ${selectedProducts.length} Teile bestellen`
                        : 'Ohne Teile aktivieren'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Completion Summary Modal */}
      {showCompletionModal && completingVehicle && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Auftrag abschliessen</h2>
                  <p className="text-blue-200 text-sm mt-0.5">
                    {completingVehicle.brand} {completingVehicle.model} {completingVehicle.licensePlate ? `· ${completingVehicle.licensePlate}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCompletionModal(false);
                    setCompletingVehicle(null);
                    setCompletionData(null);
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {completionLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : completionData ? (
              <div className="p-6 space-y-5">
                {/* Invoice status warning */}
                {!completionData.invoice ? (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">Keine Rechnung erstellt</p>
                      <p className="text-xs text-amber-700 mt-0.5">Für dieses Fahrzeug wurde noch keine Rechnung erstellt.</p>
                    </div>
                  </div>
                ) : !completionData.invoicePaid ? (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900">Rechnung nicht bezahlt</p>
                      <p className="text-xs text-red-700 mt-0.5">
                        {completionData.invoice.invoiceNumber} — Status: {completionData.invoice.status === 'sent' ? 'Gesendet' : 'Entwurf'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Rechnung bezahlt</p>
                      <p className="text-xs text-green-700 mt-0.5">{completionData.invoice.invoiceNumber}</p>
                    </div>
                  </div>
                )}

                {/* Revenue */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Einnahmen (Rechnung)</span>
                    <span className="text-sm font-bold text-gray-900">CHF {completionData.revenue.toFixed(2)}</span>
                  </div>

                  <div className="border-t border-gray-200 pt-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kosten</p>

                    {/* Expenses */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Teile & Ausgaben</span>
                      <span className="text-sm font-medium text-red-600">- CHF {completionData.expensesTotal.toFixed(2)}</span>
                    </div>

                    {/* Worker costs */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Lohnkosten ({completionData.laborHours.toFixed(1)}h)
                      </span>
                      <span className="text-sm font-medium text-red-600">- CHF {completionData.laborCost.toFixed(2)}</span>
                    </div>

                    {/* Worker breakdown */}
                    {completionData.workers.length > 0 && (
                      <div className="ml-4 space-y-1">
                        {completionData.workers.map((w, i) => (
                          <div key={i} className="flex items-center justify-between text-xs text-gray-500">
                            <span>{w.name} — {w.hours.toFixed(1)}h × CHF {w.rate.toFixed(0)}</span>
                            <span>CHF {w.cost.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Profit */}
                  <div className="border-t-2 border-gray-300 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-gray-900">Gewinn</span>
                      <span className={`text-xl font-bold ${completionData.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        CHF {completionData.profit.toFixed(2)}
                      </span>
                    </div>
                    {completionData.revenue > 0 && (
                      <div className="flex justify-end mt-0.5">
                        <span className={`text-xs font-medium ${completionData.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {((completionData.profit / completionData.revenue) * 100).toFixed(1)}% Marge
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Footer */}
            {!completionLoading && completionData && (
              <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
                <button
                  onClick={() => {
                    setShowCompletionModal(false);
                    setCompletingVehicle(null);
                    setCompletionData(null);
                  }}
                  className="btn btn-secondary"
                  disabled={isCompleting}
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleConfirmCompletion}
                  disabled={isCompleting}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isCompleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Wird abgeschlossen...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Auftrag abschliessen
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Fahrzeug endgültig löschen?</h3>
              <p className="text-sm text-gray-600 text-center mb-4">
                <span className="font-semibold">{deleteTarget.brand} {deleteTarget.model}</span>
                {' '}({deleteTarget.vin})
              </p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
                <p className="text-xs text-red-800 font-medium mb-1">Folgende Daten werden unwiderruflich gelöscht:</p>
                <ul className="text-xs text-red-700 space-y-0.5 list-disc list-inside">
                  <li>Alle Rechnungen und Angebote</li>
                  <li>Alle Ausgaben</li>
                  <li>Alle Zeiterfassungen</li>
                  <li>Alle Termine</li>
                  <li>Gespeicherte PDFs</li>
                </ul>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tippen Sie <span className="font-mono font-bold text-red-600">DELETE</span> um zu bestätigen
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="input w-full mb-4 font-mono text-center text-lg tracking-widest"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setDeleteTarget(null); setDeleteConfirmText(''); }}
                  className="btn btn-secondary flex-1"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirmText !== 'DELETE'}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    deleteConfirmText === 'DELETE'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Endgültig löschen
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Nachbestellung Modal */}
      {showNachbestellungModal && nachbestellungVehicle && (
        <NachbestellungModal
          vehicle={nachbestellungVehicle}
          onClose={() => {
            setShowNachbestellungModal(false);
            setNachbestellungVehicle(null);
          }}
          onOrderComplete={() => {
            setShowNachbestellungModal(false);
            setNachbestellungVehicle(null);
            fetchVehicles();
          }}
        />
      )}
    </div>
  );
}

