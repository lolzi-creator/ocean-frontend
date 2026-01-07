import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Car, ArrowLeft, Plus, List } from 'lucide-react';
import { format } from 'date-fns';

interface Vehicle {
  id: string;
  vin: string;
  brand?: string;
  model?: string;
  licensePlate?: string;
}

export default function CarTimeLogs() {
  const { user, currentWorker } = useAuth();
  const activeUser = currentWorker || user;
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: '',
    hours: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await api.get('/vehicles');
      const activeVehicles = response.data.filter((v: any) => v.isActive !== false);
      setVehicles(activeVehicles);
    } catch (error) {
      console.error('[CarTimeLogs] Error fetching vehicles:', error);
      toast.error('Fahrzeuge konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vehicleId) {
      toast.error('Bitte wählen Sie ein Fahrzeug aus');
      return;
    }

    const hours = parseFloat(formData.hours);
    if (!hours || hours <= 0) {
      toast.error('Bitte geben Sie eine gültige Anzahl Stunden ein');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/time-logs', {
        vehicleId: formData.vehicleId,
        hours: hours,
        notes: formData.notes || undefined,
      });

      toast.success(`${hours} Stunden erfolgreich erfasst!`, {
        icon: '✅',
        duration: 3000,
      });

      // Reset form
      setFormData({
        vehicleId: '',
        hours: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Erfassen der Zeit');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Clock className="w-6 h-6 text-primary-600 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/check-in')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
            Fahrzeug-Zeiterfassung
          </h1>
          <p className="text-xl text-gray-600 font-medium">
            {activeUser?.name || activeUser?.email}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="card-elevated">
        <div className="py-8">
          <div className="mb-8 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Car className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Zeit erfassen</h2>
            <p className="text-gray-600">Wählen Sie ein Fahrzeug und geben Sie die Arbeitsstunden ein</p>
          </div>

          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
            {/* Vehicle Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Fahrzeug <span className="text-red-500">*</span>
              </label>
              {vehicles.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                  <p className="text-amber-800 font-semibold mb-2">Keine Fahrzeuge verfügbar</p>
                  <p className="text-sm text-amber-700">
                    Bitte erstellen Sie zuerst ein Fahrzeug auf der Fahrzeuge-Seite.
                  </p>
                </div>
              ) : (
                <select
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  className="input text-lg py-4"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Fahrzeug wählen...</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.brand && vehicle.model
                        ? `${vehicle.brand} ${vehicle.model}`
                        : vehicle.vin}
                      {vehicle.licensePlate ? ` - ${vehicle.licensePlate}` : ''}
                    </option>
                  ))}
                </select>
              )}

              {formData.vehicleId && (
                <div className="mt-4 bg-primary-50 rounded-xl p-4 border border-primary-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                      <Car className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      {(() => {
                        const vehicle = vehicles.find(v => v.id === formData.vehicleId);
                        return (
                          <>
                            <p className="font-bold text-gray-900">
                              {vehicle?.brand && vehicle?.model
                                ? `${vehicle.brand} ${vehicle.model}`
                                : vehicle?.vin}
                            </p>
                            {vehicle?.licensePlate && (
                              <p className="text-sm text-gray-600">{vehicle.licensePlate}</p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Hours and Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Stunden <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  className="input text-lg py-4"
                  placeholder="z.B. 2.5"
                  required
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-2">Geben Sie die Anzahl Stunden ein (z.B. 2.5 für 2 Stunden 30 Minuten)</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Datum
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input text-lg py-4"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Notizen (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input"
                rows={3}
                placeholder="Was wurde gemacht? (z.B. Ölwechsel, Inspektion, Reparatur...)"
                disabled={isSubmitting}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={!formData.vehicleId || !formData.hours || isSubmitting}
                className="btn btn-primary w-full text-lg py-6 text-xl font-bold shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    Wird erfasst...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-3">
                    <Plus className="w-6 h-6" />
                    Zeit erfassen
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/time-logs')}
          className="card-hover text-left p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <List className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Fahrzeug-Zeiteinträge</h3>
              <p className="text-sm text-gray-600">Alle Einträge anzeigen</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => navigate('/vehicles')}
          className="card-hover text-left p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Fahrzeuge</h3>
              <p className="text-sm text-gray-600">Fahrzeugliste anzeigen</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
