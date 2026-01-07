import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { Play, Square, Clock, Car, Plus } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

interface ActiveSession {
  id: string;
  checkIn: string;
  checkOut?: string;
  hours?: number;
}

interface Vehicle {
  id: string;
  vin: string;
  brand?: string;
  model?: string;
  licensePlate?: string;
}

export default function CheckIn() {
  const { user, currentWorker } = useAuth();
  const activeUser = currentWorker || user;
  const navigate = useNavigate();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  
  // Car time logging state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [carHours, setCarHours] = useState<string>('');
  const [carDate, setCarDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [carNotes, setCarNotes] = useState<string>('');
  const [isSubmittingCarTime, setIsSubmittingCarTime] = useState(false);

  useEffect(() => {
    checkActiveSession();
    fetchVehicles();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession && !activeSession.checkOut) {
      interval = setInterval(() => {
        updateElapsedTime();
      }, 1000);
      updateElapsedTime();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession]);

  const fetchVehicles = async () => {
    try {
      const response = await api.get('/vehicles');
      const activeVehicles = response.data.filter((v: any) => v.isActive !== false);
      setVehicles(activeVehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const checkActiveSession = async () => {
    try {
      const response = await api.get('/work-sessions/active');
      if (response.data) {
        setActiveSession(response.data);
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error checking active session:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateElapsedTime = () => {
    if (!activeSession || activeSession.checkOut) return;
    
    const start = new Date(activeSession.checkIn);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    setElapsedTime(
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    );
  };

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const response = await api.post('/work-sessions/check-in');
      setActiveSession(response.data);
      toast.success('Eingecheckt! Arbeit gestartet.', {
        icon: '✅',
        duration: 3000,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Einchecken');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!activeSession) return;

    setIsCheckingOut(true);
    try {
      const response = await api.post('/work-sessions/check-out');
      const hours = response.data.hours || 0;
      
      toast.success(`Ausgecheckt! ${hours.toFixed(2)} Stunden erfasst.`, {
        icon: '✅',
        duration: 4000,
      });

      setActiveSession(null);
      setElapsedTime('00:00:00');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Auschecken');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleSubmitCarTime = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedVehicleId) {
      toast.error('Bitte wählen Sie ein Fahrzeug aus');
      return;
    }

    const hours = parseFloat(carHours);
    if (!hours || hours <= 0) {
      toast.error('Bitte geben Sie eine gültige Anzahl Stunden ein');
      return;
    }

    setIsSubmittingCarTime(true);
    try {
      await api.post('/time-logs', {
        vehicleId: selectedVehicleId,
        hours: hours,
        notes: carNotes || undefined,
      });

      toast.success(`${hours} Stunden für Fahrzeug erfasst!`, {
        icon: '✅',
        duration: 3000,
      });

      // Reset form
      setSelectedVehicleId('');
      setCarHours('');
      setCarDate(format(new Date(), 'yyyy-MM-dd'));
      setCarNotes('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Erfassen der Zeit');
    } finally {
      setIsSubmittingCarTime(false);
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
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
          Check-In
        </h1>
        <p className="text-xl text-gray-600 font-medium">
          {activeUser?.name || activeUser?.email}
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Check-In/Out */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Arbeitszeit (Gehalt)</h2>
          
          {/* Active Session Display */}
          {activeSession && !activeSession.checkOut && (
            <div className="card-elevated border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-blue-50">
              <div className="text-center py-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Arbeit läuft</h3>
                    <p className="text-sm text-gray-600">
                      Eingecheckt um {format(new Date(activeSession.checkIn), 'HH:mm')} Uhr
                    </p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="inline-block bg-white rounded-2xl px-6 py-4 shadow-lg border-2 border-primary-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-primary-600" />
                      <span className="text-sm font-semibold text-gray-600">Laufende Zeit</span>
                    </div>
                    <div className="text-4xl font-bold text-primary-700 font-mono">
                      {elapsedTime}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCheckOut}
                  disabled={isCheckingOut}
                  className="btn btn-danger w-full text-lg py-4 font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCheckingOut ? (
                    <span className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      Wird ausgecheckt...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-3">
                      <Square className="w-5 h-5" />
                      Auschecken
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Check In Form */}
          {(!activeSession || activeSession.checkOut) && (
            <div className="card-elevated">
              <div className="text-center py-6">
                <div className="mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
                    <Clock className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Arbeit starten</h3>
                  <p className="text-gray-600">Checken Sie ein, um Ihre Arbeitszeit zu erfassen</p>
                </div>

                <button
                  onClick={handleCheckIn}
                  disabled={isCheckingIn}
                  className="btn btn-primary w-full text-lg py-4 font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCheckingIn ? (
                    <span className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      Wird eingecheckt...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-3">
                      <Play className="w-5 h-5" />
                      Einchecken
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Car Time Logging */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Fahrzeug-Zeit (Rechnung)</h2>
          
          <div className="card-elevated">
            <form onSubmit={handleSubmitCarTime} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fahrzeug <span className="text-red-500">*</span>
                </label>
                {vehicles.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                    <p className="text-amber-800 font-semibold text-sm">Keine Fahrzeuge verfügbar</p>
                  </div>
                ) : (
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="input"
                    required
                    disabled={isSubmittingCarTime}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Stunden <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={carHours}
                    onChange={(e) => setCarHours(e.target.value)}
                    className="input"
                    placeholder="z.B. 2.5"
                    required
                    disabled={isSubmittingCarTime}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Datum
                  </label>
                  <input
                    type="date"
                    value={carDate}
                    onChange={(e) => setCarDate(e.target.value)}
                    className="input"
                    required
                    disabled={isSubmittingCarTime}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notizen (optional)
                </label>
                <textarea
                  value={carNotes}
                  onChange={(e) => setCarNotes(e.target.value)}
                  className="input"
                  rows={2}
                  placeholder="Was wurde gemacht?"
                  disabled={isSubmittingCarTime}
                />
              </div>

              <button
                type="submit"
                disabled={!selectedVehicleId || !carHours || isSubmittingCarTime}
                className="btn btn-primary w-full py-4 font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmittingCarTime ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    Wird erfasst...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-3">
                    <Plus className="w-5 h-5" />
                    Zeit erfassen
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
