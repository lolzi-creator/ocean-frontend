import { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { Play, Square, Clock, Plus, Car, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useVehicles } from '../hooks';

interface ActiveSession {
  id: string;
  checkIn: string;
  checkOut?: string;
  hours?: number;
}

export default function CheckIn() {
  const { user, currentWorker } = useAuth();
  const activeUser = currentWorker || user;
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

  const { activeVehicles: vehicles } = useVehicles();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [carHours, setCarHours] = useState<string>('');
  const [carNotes, setCarNotes] = useState<string>('');
  const [isSubmittingCarTime, setIsSubmittingCarTime] = useState(false);

  useEffect(() => {
    checkActiveSession();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeSession && !activeSession.checkOut) {
      interval = setInterval(() => updateElapsedTime(), 1000);
      updateElapsedTime();
    }
    return () => { if (interval) clearInterval(interval); };
  }, [activeSession]);

  const checkActiveSession = async () => {
    try {
      const response = await api.get('/work-sessions/active');
      if (response.data) setActiveSession(response.data);
    } catch (error: any) {
      if (error.response?.status !== 404) console.error('Error:', error);
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
      toast.success('Eingecheckt!');
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
      toast.success(`Ausgecheckt! ${hours.toFixed(2)}h erfasst.`);
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
    if (!selectedVehicleId) { toast.error('Bitte Fahrzeug wählen'); return; }
    const hours = parseFloat(carHours);
    if (!hours || hours <= 0) { toast.error('Bitte gültige Stunden eingeben'); return; }

    setIsSubmittingCarTime(true);
    try {
      await api.post('/time-logs', {
        vehicleId: selectedVehicleId,
        hours: hours,
        notes: carNotes || undefined,
      });
      toast.success(`${hours}h erfasst!`);
      setSelectedVehicleId('');
      setCarHours('');
      setCarNotes('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler');
    } finally {
      setIsSubmittingCarTime(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  const isActive = activeSession && !activeSession.checkOut;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-neutral-900">Check-In</h1>
        <p className="text-sm text-neutral-500 mt-0.5">{activeUser?.name || activeUser?.email}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Work Session Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-neutral-900">Arbeitszeit</h2>
            <span className={`badge ${isActive ? 'badge-success' : 'badge-gray'}`}>
              {isActive ? 'Aktiv' : 'Inaktiv'}
            </span>
          </div>

          {/* Timer */}
          <div className="text-center py-8">
            <div className={`text-5xl font-mono font-bold tracking-wider ${
              isActive ? 'text-success-600' : 'text-neutral-300'
            }`}>
              {elapsedTime}
            </div>
            {isActive && (
              <p className="text-xs text-neutral-500 mt-2">
                Seit {format(new Date(activeSession.checkIn), 'HH:mm')} Uhr
              </p>
            )}
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            {isActive ? (
              <button
                onClick={handleCheckOut}
                disabled={isCheckingOut}
                className="w-24 h-24 rounded-xl bg-danger-600 hover:bg-danger-700 
                         text-white flex flex-col items-center justify-center gap-1
                         transition-all duration-200 active:scale-95
                         disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isCheckingOut ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <>
                    <Square className="w-8 h-8" />
                    <span className="text-xs font-semibold">STOP</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleCheckIn}
                disabled={isCheckingIn}
                className="w-24 h-24 rounded-xl bg-success-600 hover:bg-success-700 
                         text-white flex flex-col items-center justify-center gap-1
                         transition-all duration-200 active:scale-95
                         disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isCheckingIn ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <>
                    <Play className="w-8 h-8 ml-1" />
                    <span className="text-xs font-semibold">START</span>
                  </>
                )}
              </button>
            )}
          </div>

          <p className="text-xs text-neutral-400 text-center mt-6">
            Arbeitszeit für Gehaltsberechnung
          </p>
        </div>

        {/* Car Time Card */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-5 h-5 text-primary-600" />
            <h2 className="text-base font-semibold text-neutral-900">Fahrzeug-Zeit</h2>
          </div>

          <form onSubmit={handleSubmitCarTime} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Fahrzeug
              </label>
              {vehicles.length === 0 ? (
                <div className="bg-warning-50 border border-warning-200 rounded-lg p-3 text-sm text-warning-700">
                  Keine Fahrzeuge verfügbar
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
                      {vehicle.licensePlate ? ` • ${vehicle.licensePlate}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Stunden
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
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Notizen
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
              className="btn btn-primary w-full"
            >
              {isSubmittingCarTime ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Zeit erfassen
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-neutral-400 text-center mt-4">
            Zeit für Kundenrechnung
          </p>
        </div>
      </div>
    </div>
  );
}
