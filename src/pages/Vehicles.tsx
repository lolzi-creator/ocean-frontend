import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Car, Edit, Trash2, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
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
  color?: string;
  mileage?: number;
  isActive: boolean;
  createdAt: string;
}

export default function Vehicles() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vinInput, setVinInput] = useState('');
  const [vinData, setVinData] = useState<any>(null);
  const [vehicleImage, setVehicleImage] = useState<string | null>(null);
  const [showFullVinData, setShowFullVinData] = useState(false);
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

  const handleDelete = async (id: string) => {
    if (!confirm('Sind Sie sicher, dass Sie dieses Fahrzeug löschen möchten?')) return;

    try {
      await api.delete(`/vehicles/${id}`);
      toast.success('Fahrzeug erfolgreich gelöscht');
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

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.vin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeVehicles = vehicles.filter(v => v.isActive).length;
  const totalVehicles = vehicles.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Fahrzeuge
          </h1>
          <p className="text-gray-600 font-medium">Verwalten Sie Ihre Garage-Fahrzeuge</p>
        </div>
        <Link
          to="/vehicles/new"
          className="btn btn-primary flex items-center gap-2 self-start lg:self-auto shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          <span>Fahrzeug hinzufügen</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Gesamt Fahrzeuge</p>
              <p className="text-3xl font-bold text-gray-900">{totalVehicles}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <Car className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Aktive Fahrzeuge</p>
              <p className="text-3xl font-bold text-green-600">{activeVehicles}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <Check className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Inaktive Fahrzeuge</p>
              <p className="text-3xl font-bold text-gray-600">{totalVehicles - activeVehicles}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-lg">
              <X className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card-elevated">
        <div className="relative">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Suche nach VIN, Marke, Modell oder Kennzeichen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-12 text-base"
          />
        </div>
      </div>

      {/* Vehicles List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Car className="w-6 h-6 text-primary-600 animate-pulse" />
            </div>
          </div>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="card-elevated text-center py-16">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Car className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Keine Fahrzeuge gefunden</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {searchTerm ? 'Versuchen Sie einen anderen Suchbegriff' : 'Beginnen Sie mit dem Hinzufügen Ihres ersten Fahrzeugs'}
          </p>
          {!searchTerm && (
            <Link to="/vehicles/new" className="btn btn-primary inline-flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Erstes Fahrzeug hinzufügen
            </Link>
          )}
        </div>
      ) : (
        <div className="card-elevated">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fahrzeug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    VIN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jahr
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kennzeichen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Erstellt
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVehicles.map((vehicle, index) => (
                  <tr
                    key={vehicle.id}
                    onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors animate-slide-up ${
                      !vehicle.isActive ? 'opacity-75' : ''
                    }`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-gradient-to-br ${
                          vehicle.isActive 
                            ? 'from-primary-500 to-primary-600' 
                            : 'from-gray-400 to-gray-500'
                        } rounded-lg flex items-center justify-center shadow-md flex-shrink-0`}>
                          <Car className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">
                            {vehicle.brand && vehicle.model
                              ? `${vehicle.brand} ${vehicle.model}`
                              : 'Unbekanntes Fahrzeug'}
                          </div>
                          {vehicle.color && (
                            <div className="text-xs text-gray-500">{vehicle.color}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900">{vehicle.vin}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{vehicle.year || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{vehicle.licensePlate || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        vehicle.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {vehicle.isActive ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(vehicle.createdAt), 'dd.MM.yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEdit(vehicle)}
                          className="p-2 hover:bg-primary-50 rounded-lg transition-all duration-200 hover:scale-110"
                          title="Bearbeiten"
                        >
                          <Edit className="w-4 h-4 text-primary-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(vehicle.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}

