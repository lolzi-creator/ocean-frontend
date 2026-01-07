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
  Calendar,
  Wrench,
  Image as ImageIcon,
  User,
  DollarSign,
  Package,
  Plus,
  Receipt,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

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
  color?: string;
  mileage?: number;
  photoUrl?: string;
  documentPhotoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    customerName: '',
    customerEmail: '',
    customerAddress: '',
  });
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isCreatingEstimate, setIsCreatingEstimate] = useState(false);
  const [servicePackage, setServicePackage] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchVehicleDetails();
      fetchTimeLogs();
      fetchInvoices();
      fetchExpenses();
    }
  }, [id]);

  useEffect(() => {
    if (vehicle?.serviceType) {
      // Service package info (matches backend service-packages.ts)
      const packages: Record<string, any> = {
        small_service: { estimatedHours: 1.5, name: 'Kleine Wartung', description: 'Ölwechsel, Filter, Inspektion' },
        big_service: { estimatedHours: 4.0, name: 'Grosse Wartung', description: 'Vollständige Wartung mit allen Checks' },
        tire_change: { estimatedHours: 1.0, name: 'Reifenwechsel', description: 'Reifen wechseln und auswuchten' },
        brake_service: { estimatedHours: 2.5, name: 'Bremsenservice', description: 'Bremsbeläge und Bremsflüssigkeit' },
        repair: { estimatedHours: 3.0, name: 'Reparatur', description: 'Defekte beheben' },
        inspection: { estimatedHours: 1.0, name: 'Inspektion', description: 'Nur Überprüfung' },
      };
      setServicePackage(packages[vehicle.serviceType] || null);
    } else {
      setServicePackage(null);
    }
  }, [vehicle?.serviceType]);

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

  const handleCreateEstimate = async () => {
    if (!invoiceForm.customerName.trim()) {
      toast.error('Bitte geben Sie einen Kundennamen ein');
      return;
    }

    if (!vehicle?.serviceType) {
      toast.error('Bitte wählen Sie zuerst einen Service-Typ für das Fahrzeug');
      return;
    }

    setIsCreatingEstimate(true);
    try {
      const response = await api.post(`/vehicles/${id}/create-estimate`, invoiceForm);
      toast.success('Angebot erfolgreich erstellt!');
      setShowEstimateModal(false);
      setInvoiceForm({ customerName: '', customerEmail: '', customerAddress: '' });
      fetchInvoices();
      navigate(`/invoices/${response.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Erstellen des Angebots');
    } finally {
      setIsCreatingEstimate(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!invoiceForm.customerName.trim()) {
      toast.error('Bitte geben Sie einen Kundennamen ein');
      return;
    }

    if (totalHours === 0) {
      toast.error('Es wurden noch keine Arbeitsstunden erfasst');
      return;
    }

    setIsCreatingInvoice(true);
    try {
      const response = await api.post(`/vehicles/${id}/create-invoice`, {
        ...invoiceForm,
        confirmedHours: totalHours,
      });
      toast.success('Rechnung erfolgreich erstellt!');
      setShowInvoiceModal(false);
      setInvoiceForm({ customerName: '', customerEmail: '', customerAddress: '' });
      fetchInvoices();
      navigate(`/invoices/${response.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Erstellen der Rechnung');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const totalHours = timeLogs.reduce((sum, log) => sum + log.hours, 0);
  const totalRevenue = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

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

  const getServiceTypeLabel = (type?: string) => {
    switch (type) {
      case 'small_service':
        return 'Kleine Wartung';
      case 'big_service':
        return 'Grosse Wartung';
      case 'tire_change':
        return 'Reifenwechsel';
      case 'brake_service':
        return 'Bremsenservice';
      case 'repair':
        return 'Reparatur';
      case 'inspection':
        return 'Inspektion';
      default:
        return type || 'Nicht angegeben';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!vehicle) {
    return null;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/vehicles')}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          Zurück zu Fahrzeugen
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {vehicle.brand && vehicle.model
                ? `${vehicle.brand} ${vehicle.model}`
                : 'Fahrzeug'}
            </h1>
            <p className="text-gray-600 mt-1">VIN: {vehicle.vin}</p>
          </div>
          <Link
            to={`/vehicles?edit=${vehicle.id}`}
            className="btn btn-primary flex items-center gap-2"
          >
            <Edit className="w-5 h-5" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicle.photoUrl && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Fahrzeugfoto</p>
                <img
                  src={vehicle.photoUrl}
                  alt="Vehicle"
                  className="w-full h-64 object-cover rounded-lg border border-gray-200"
                />
              </div>
            )}
            {vehicle.documentPhotoUrl && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Fahrzeugausweis</p>
                <img
                  src={vehicle.documentPhotoUrl}
                  alt="Document"
                  className="w-full h-64 object-cover rounded-lg border border-gray-200"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Gesamtstunden</p>
              <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}h</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Zeiteinträge</p>
              <p className="text-2xl font-bold text-gray-900">{timeLogs.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Rechnungen</p>
              <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Umsatz</p>
              <p className="text-2xl font-bold text-gray-900">CHF {totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Ausgaben</p>
              <p className="text-2xl font-bold text-gray-900">CHF {totalExpenses.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Estimate/Invoice Buttons */}
      <div className="mb-6 flex gap-3 justify-end">
        {vehicle?.serviceType && (
          <button
            onClick={() => setShowEstimateModal(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <FileCheck className="w-5 h-5" />
            Angebot erstellen
          </button>
        )}
        {totalHours > 0 && (
          <button
            onClick={() => setShowInvoiceModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Receipt className="w-5 h-5" />
            Rechnung erstellen
          </button>
        )}
      </div>

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
                {vehicle.serviceType && (
                  <div>
                    <p className="text-sm text-gray-500">Service-Typ</p>
                    <p className="font-medium">{getServiceTypeLabel(vehicle.serviceType)}</p>
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
                      vehicle.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {vehicle.isActive ? 'Aktiv' : 'Inaktiv'}
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

      {/* Create Estimate Modal */}
      {showEstimateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Angebot erstellen</h2>
            {servicePackage && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  Service: {servicePackage.name}
                </p>
                <p className="text-sm text-blue-700">
                  Geschätzte Arbeitszeit: <strong>{servicePackage.estimatedHours}h</strong>
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  Das Angebot enthält automatisch alle Ausgaben für diesen Service sowie die geschätzten Arbeitsstunden.
                </p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kundename <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={invoiceForm.customerName}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, customerName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Max Mustermann"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail (optional)
                </label>
                <input
                  type="email"
                  value={invoiceForm.customerEmail}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, customerEmail: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="max@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse (optional)
                </label>
                <textarea
                  value={invoiceForm.customerAddress}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, customerAddress: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="Musterstrasse 1, 8000 Zürich"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEstimateModal(false);
                  setInvoiceForm({ customerName: '', customerEmail: '', customerAddress: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={isCreatingEstimate}
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateEstimate}
                className="btn btn-primary"
                disabled={isCreatingEstimate}
              >
                {isCreatingEstimate ? 'Erstelle...' : 'Angebot erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Rechnung erstellen</h2>
            
            {/* Confirmation Warning */}
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-900 mb-1">
                  Bestätigung erforderlich
                </p>
                <p className="text-sm text-yellow-700 mb-2">
                  Sind Sie sicher, dass die Arbeit abgeschlossen ist?
                </p>
                <div className="text-sm text-yellow-700 space-y-1">
                  <p><strong>Erfasste Arbeitsstunden:</strong> {totalHours.toFixed(2)}h</p>
                  <p><strong>Ausgaben:</strong> CHF {totalExpenses.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Die Rechnung wird automatisch aus den Ausgaben und erfassten Arbeitsstunden erstellt.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kundename <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={invoiceForm.customerName}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, customerName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Max Mustermann"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail (optional)
                </label>
                <input
                  type="email"
                  value={invoiceForm.customerEmail}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, customerEmail: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="max@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse (optional)
                </label>
                <textarea
                  value={invoiceForm.customerAddress}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, customerAddress: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="Musterstrasse 1, 8000 Zürich"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setInvoiceForm({ customerName: '', customerEmail: '', customerAddress: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={isCreatingInvoice}
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateInvoice}
                className="btn btn-primary"
                disabled={isCreatingInvoice}
              >
                {isCreatingInvoice ? 'Erstelle...' : 'Rechnung erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



