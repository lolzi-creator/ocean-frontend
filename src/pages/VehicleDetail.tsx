import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Car,
  Clock,
  FileText,
  Edit,
  Image as ImageIcon,
  User,
  DollarSign,
  Package,
  Receipt,
  FileCheck,
  ExternalLink,
  FileImage,
  X,
  Download,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import CreateInvoiceModal from '../components/CreateInvoiceModal';

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
  status?: string;
  color?: string;
  mileage?: number;
  photoUrl?: string;
  documentPhotoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

interface TimeLog {
  id: string;
  hours: number;
  notes?: string;
  createdAt: string;
  user: {
    id: string;
    name?: string;
    email: string;
  };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: string;
  status: string;
  total: number;
  createdAt: string;
  customerName: string;
  pdfUrl?: string;
}

interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
}

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'timelogs' | 'invoices' | 'expenses'>('overview');
  const [invoiceModalType, setInvoiceModalType] = useState<'estimate' | 'invoice' | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchVehicleDetails();
      fetchTimeLogs();
      fetchInvoices();
      fetchExpenses();
    }
  }, [id]);

  const fetchVehicleDetails = async () => {
    try {
      const response = await api.get(`/vehicles/${id}`);
      setVehicle(response.data);
    } catch (error) {
      toast.error('Fahrzeug konnte nicht geladen werden');
      navigate('/vehicles');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTimeLogs = async () => {
    try {
      const response = await api.get(`/time-logs?vehicleId=${id}`);
      setTimeLogs(response.data);
    } catch (error) {
      console.error('Failed to load time logs');
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await api.get(`/invoices?vehicleId=${id}`);
      setInvoices(response.data);
    } catch (error) {
      console.error('Failed to load invoices');
    }
  };

  const fetchExpenses = async () => {
    try {
      const response = await api.get(`/expenses?vehicleId=${id}`);
      setExpenses(response.data);
    } catch (error) {
      console.error('Failed to load expenses');
    }
  };

  const totalHours = timeLogs.reduce((sum, log) => sum + log.hours, 0);
  const totalRevenue = invoices
    .filter((inv) => inv.type === 'invoice' && inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const vehicleProfit = totalRevenue - totalExpenses;

  // Group time logs by user
  const timeLogsByUser = timeLogs.reduce((acc, log) => {
    const userId = log.user.id;
    if (!acc[userId]) {
      acc[userId] = {
        user: log.user,
        totalHours: 0,
        logs: [],
      };
    }
    acc[userId].totalHours += log.hours;
    acc[userId].logs.push(log);
    return acc;
  }, {} as Record<string, { user: TimeLog['user']; totalHours: number; logs: TimeLog[] }>);

  const getServiceTypeLabel = () => {
    if (vehicle?.serviceTemplate?.name) return vehicle.serviceTemplate.name;
    if (vehicle?.serviceType) return vehicle.serviceType;
    return 'Nicht angegeben';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Car className="w-8 h-8 text-primary-600 animate-pulse" />
      </div>
    );
  }

  if (!vehicle) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/vehicles')}
          className="mb-3 flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </button>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <Car className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                {vehicle.brand && vehicle.model ? `${vehicle.brand} ${vehicle.model}` : 'Fahrzeug'}
              </h1>
              <p className="text-sm text-neutral-500">
                <code className="bg-neutral-100 px-1.5 py-0.5 rounded">{vehicle.vin}</code>
              </p>
            </div>
          </div>
          <Link to={`/vehicles?edit=${vehicle.id}`} className="btn btn-secondary">
            <Edit className="w-4 h-4" />
            Bearbeiten
          </Link>
        </div>
      </div>

      {/* Photos Section */}
      {(vehicle.photoUrl || vehicle.documentPhotoUrl) && (
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Fotos
          </h2>
          <div className="space-y-6">
            {/* Car Photos Category */}
            {vehicle.photoUrl && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Fahrzeugfotos
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedImage(vehicle.photoUrl!)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileImage className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
                      <span className="text-sm font-medium text-gray-700">
                        {vehicle.photoUrl.split('/').pop() || 'Fahrzeugfoto.jpg'}
                      </span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary-600" />
                  </button>
                </div>
              </div>
            )}

            {/* Document Photos Category */}
            {vehicle.documentPhotoUrl && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Fahrzeugausweis
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedImage(vehicle.documentPhotoUrl!)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileImage className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
                      <span className="text-sm font-medium text-gray-700">
                        {vehicle.documentPhotoUrl.split('/').pop() || 'Fahrzeugausweis.jpg'}
                      </span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2 z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedImage}
              alt="Full size"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{totalHours.toFixed(1)}h</p>
              <p className="text-xs text-neutral-500">Stunden</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">CHF {totalRevenue.toFixed(0)}</p>
              <p className="text-xs text-neutral-500">Einnahmen</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-danger-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-danger-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">CHF {totalExpenses.toFixed(0)}</p>
              <p className="text-xs text-neutral-500">Ausgaben</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              vehicleProfit >= 0 ? 'bg-success-100' : 'bg-danger-100'
            }`}>
              <TrendingUp className={`w-5 h-5 ${vehicleProfit >= 0 ? 'text-success-600' : 'text-danger-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${vehicleProfit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                CHF {vehicleProfit.toFixed(0)}
              </p>
              <p className="text-xs text-neutral-500">Gewinn</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{invoices.length}</p>
              <p className="text-xs text-neutral-500">Dokumente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Invoices + Create Buttons */}
      {(() => {
        const existingInvoices = invoices.filter((i) => i.type === 'invoice');
        const existingEstimates = invoices.filter((i) => i.type === 'estimate');
        const invoiceCount = existingInvoices.length;
        const estimateCount = existingEstimates.length;

        return (
          <div className="mb-6 space-y-3">
            {/* Existing documents */}
            {invoices.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <Link
                      to={`/invoices/${inv.id}`}
                      state={{ fromVehicle: true, vehicleId: id }}
                      className="font-medium text-gray-700 hover:text-primary-600 transition-colors"
                    >
                      {inv.invoiceNumber}
                    </Link>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      inv.type === 'estimate'
                        ? 'bg-purple-50 text-purple-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}>
                      {inv.type === 'estimate' ? 'Angebot' : 'Rechnung'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      inv.status === 'paid'
                        ? 'bg-green-50 text-green-600'
                        : inv.status === 'sent'
                        ? 'bg-blue-50 text-blue-600'
                        : inv.status === 'cancelled'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-gray-50 text-gray-500'
                    }`}>
                      {inv.status === 'paid' ? 'Bezahlt' : inv.status === 'sent' ? 'Gesendet' : inv.status === 'cancelled' ? 'Storniert' : 'Entwurf'}
                    </span>
                    {inv.pdfUrl && (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-primary-600"
                        title="PDF herunterladen"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Create buttons - conditional on vehicle status */}
            <div className="flex gap-3 justify-end">
              {/* Estimate button: only for on_hold (draft) vehicles with a template */}
              {(vehicle?.status === 'on_hold') && (vehicle?.serviceTemplateId || vehicle?.serviceType) && (
                <button
                  onClick={() => setInvoiceModalType('estimate')}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <FileCheck className="w-5 h-5" />
                  {estimateCount > 0 ? `${estimateCount + 1}. ` : ''}Angebot erstellen
                </button>
              )}
              {/* Invoice button: only for active vehicles */}
              {(vehicle?.status === 'active') && (
                <button
                  onClick={() => setInvoiceModalType('invoice')}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Receipt className="w-5 h-5" />
                  {invoiceCount > 0 ? `${invoiceCount + 1}. ` : ''}Rechnung erstellen
                </button>
              )}
              {/* Completed vehicles: both buttons available */}
              {(vehicle?.status === 'completed') && (
                <>
                  {(vehicle?.serviceTemplateId || vehicle?.serviceType) && (
                    <button
                      onClick={() => setInvoiceModalType('estimate')}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <FileCheck className="w-5 h-5" />
                      Angebot erstellen
                    </button>
                  )}
                  <button
                    onClick={() => setInvoiceModalType('invoice')}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Receipt className="w-5 h-5" />
                    Rechnung erstellen
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex -mb-px space-x-8">
            {[
              { id: 'overview', label: 'Übersicht', icon: Car },
              { id: 'expenses', label: 'Ausgaben', icon: Package },
              { id: 'timelogs', label: 'Zeiterfassung', icon: Clock },
              { id: 'invoices', label: 'Rechnungen', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Grundinformationen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicle.brand && (
                  <div>
                    <p className="text-sm text-gray-500">Marke</p>
                    <p className="font-medium">{vehicle.brand}</p>
                  </div>
                )}
                {vehicle.model && (
                  <div>
                    <p className="text-sm text-gray-500">Modell</p>
                    <p className="font-medium">{vehicle.model}</p>
                  </div>
                )}
                {vehicle.year && (
                  <div>
                    <p className="text-sm text-gray-500">Jahr</p>
                    <p className="font-medium">{vehicle.year}</p>
                  </div>
                )}
                {vehicle.trim && (
                  <div>
                    <p className="text-sm text-gray-500">Ausstattung</p>
                    <p className="font-medium">{vehicle.trim}</p>
                  </div>
                )}
                {vehicle.color && (
                  <div>
                    <p className="text-sm text-gray-500">Farbe</p>
                    <p className="font-medium">{vehicle.color}</p>
                  </div>
                )}
                {vehicle.licensePlate && (
                  <div>
                    <p className="text-sm text-gray-500">Kennzeichen</p>
                    <p className="font-medium">{vehicle.licensePlate}</p>
                  </div>
                )}
                {vehicle.mileage && (
                  <div>
                    <p className="text-sm text-gray-500">Kilometerstand</p>
                    <p className="font-medium">{vehicle.mileage.toLocaleString('de-CH')} km</p>
                  </div>
                )}
                {(vehicle.serviceTemplate || vehicle.serviceType) && (
                  <div>
                    <p className="text-sm text-gray-500">Service-Vorlage</p>
                    <p className="font-medium">{getServiceTypeLabel()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Technical Details */}
            {(vehicle.engine || vehicle.transmission || vehicle.drive || vehicle.bodyType) && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Technische Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vehicle.engine && (
                    <div>
                      <p className="text-sm text-gray-500">Motor</p>
                      <p className="font-medium">{vehicle.engine}</p>
                    </div>
                  )}
                  {vehicle.transmission && (
                    <div>
                      <p className="text-sm text-gray-500">Getriebe</p>
                      <p className="font-medium">{vehicle.transmission}</p>
                    </div>
                  )}
                  {vehicle.drive && (
                    <div>
                      <p className="text-sm text-gray-500">Antrieb</p>
                      <p className="font-medium">{vehicle.drive}</p>
                    </div>
                  )}
                  {vehicle.bodyType && (
                    <div>
                      <p className="text-sm text-gray-500">Karosserietyp</p>
                      <p className="font-medium">{vehicle.bodyType}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Work Description */}
            {vehicle.workDescription && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Arbeitsbeschreibung</h3>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{vehicle.workDescription}</p>
              </div>
            )}

            {/* Additional Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Zusätzliche Informationen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicle.manufacturer && (
                  <div>
                    <p className="text-sm text-gray-500">Hersteller</p>
                    <p className="font-medium">{vehicle.manufacturer}</p>
                  </div>
                )}
                {vehicle.origin && (
                  <div>
                    <p className="text-sm text-gray-500">Herkunft</p>
                    <p className="font-medium">{vehicle.origin}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Erstellt am</p>
                  <p className="font-medium">
                    {format(new Date(vehicle.createdAt), 'dd.MM.yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      vehicle.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : vehicle.status === 'on_hold'
                        ? 'bg-amber-100 text-amber-700'
                        : vehicle.status === 'completed'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {vehicle.status === 'active' ? 'Aktiv' : vehicle.status === 'on_hold' ? 'Wartend' : vehicle.status === 'completed' ? 'Abgeschlossen' : 'Inaktiv'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Time Logs Tab */}
        {activeTab === 'timelogs' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Zeiterfassung</h3>
              <Link
                to={`/time-logs?vehicleId=${id}`}
                className="btn btn-primary text-sm"
              >
                Zeit erfassen
              </Link>
            </div>
            {timeLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Keine Zeiteinträge vorhanden</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Datum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Mitarbeiter
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Stunden
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Notizen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {timeLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(log.createdAt), 'dd.MM.yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.user.name || log.user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {log.hours}h
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {log.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Ausgaben</h3>
              <div className="text-sm text-gray-600">
                Gesamt: <span className="font-bold text-gray-900">CHF {totalExpenses.toFixed(2)}</span>
              </div>
            </div>
            {expenses.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Keine Ausgaben vorhanden</p>
                <p className="text-sm mt-2">Ausgaben werden automatisch erstellt, wenn ein Service-Typ gewählt wird.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Package className="w-5 h-5 text-orange-600" />
                          <h4 className="font-semibold text-gray-900">{expense.description}</h4>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              expense.category === 'parts'
                                ? 'bg-blue-100 text-blue-700'
                                : expense.category === 'supplies'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {expense.category === 'parts'
                              ? 'Teile'
                              : expense.category === 'supplies'
                              ? 'Material'
                              : expense.category}
                          </span>
                        </div>
                        {expense.notes && (
                          <p className="text-sm text-gray-600 mb-2">{expense.notes}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {format(new Date(expense.date), 'dd.MM.yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          CHF {expense.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Worker Hours Summary */}
            {Object.keys(timeLogsByUser).length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Arbeitsstunden pro Mitarbeiter</h3>
                <div className="space-y-3">
                  {Object.values(timeLogsByUser).map((entry) => (
                    <div
                      key={entry.user.id}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {entry.user.name || entry.user.email}
                            </p>
                            <p className="text-sm text-gray-600">
                              {entry.logs.length} {entry.logs.length === 1 ? 'Eintrag' : 'Einträge'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary-600">
                            {entry.totalHours.toFixed(2)}h
                          </p>
                          <p className="text-sm text-gray-600">
                            CHF {(entry.totalHours * 120).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Rechnungen & Angebote</h3>
            </div>
            {invoices.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Keine Rechnungen vorhanden</p>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    to={`/invoices/${invoice.id}`}
                    state={{ fromVehicle: true, vehicleId: id }}
                    className="block border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:border-primary-300 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="w-5 h-5 text-primary-600" />
                          <h4 className="font-semibold text-gray-900 hover:text-primary-600 transition-colors">
                            {invoice.invoiceNumber}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              invoice.status === 'paid'
                                ? 'bg-green-100 text-green-700'
                                : invoice.status === 'sent'
                                ? 'bg-blue-100 text-blue-700'
                                : invoice.status === 'cancelled'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {invoice.status === 'draft'
                              ? 'Entwurf'
                              : invoice.status === 'sent'
                              ? 'Gesendet'
                              : invoice.status === 'paid'
                              ? 'Bezahlt'
                              : 'Storniert'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {invoice.customerName} • {format(new Date(invoice.createdAt), 'dd.MM.yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          CHF {invoice.total.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{invoice.type}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Invoice/Estimate Modal */}
      {invoiceModalType && vehicle && (
        <CreateInvoiceModal
          isOpen={!!invoiceModalType}
          vehicle={vehicle}
          type={invoiceModalType}
          ordinal={
            (invoiceModalType === 'invoice'
              ? invoices.filter((i) => i.type === 'invoice').length
              : invoices.filter((i) => i.type === 'estimate').length) + 1
          }
          onClose={() => setInvoiceModalType(null)}
          onCreated={() => {
            fetchInvoices();
            setInvoiceModalType(null);
          }}
        />
      )}
    </div>
  );
}



