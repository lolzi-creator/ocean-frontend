import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { User, Lock, LogOut } from 'lucide-react';

interface Worker {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function WorkerSelection() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(true);
  const navigate = useNavigate();
  const { setCurrentWorker } = useAuth();

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const response = await api.post('/auth/workers');
      setWorkers(response.data || []);
    } catch (error) {
      toast.error('Mitarbeiter konnten nicht geladen werden');
      console.error('Error fetching workers:', error);
    } finally {
      setIsLoadingWorkers(false);
    }
  };

  const handleWorkerSelect = (worker: Worker) => {
    setSelectedWorker(worker);
    setPin('');
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pin || pin.length !== 4) {
      toast.error('Bitte geben Sie einen 4-stelligen PIN ein');
      return;
    }

    setIsLoading(true);
    try {
      // Send both PIN and userId to ensure we verify the correct worker
      const response = await api.post('/auth/verify-pin', { 
        pin,
        userId: selectedWorker?.id 
      });
      const verifiedUser = response.data.user;

      // Verify that the PIN matches the selected worker
      if (selectedWorker && verifiedUser.id !== selectedWorker.id) {
        toast.error('PIN stimmt nicht mit dem ausgewählten Mitarbeiter überein');
        setPin('');
        return;
      }

      // Set the current worker in context (this also saves to localStorage immediately)
      setCurrentWorker(verifiedUser);
      
      // Double-check that localStorage is set
      localStorage.setItem('currentWorker', JSON.stringify(verifiedUser));
      
      // Also set the worker ID as a token for API calls (since workers don't have Supabase tokens)
      // The backend will accept this as an alternative authentication method
      localStorage.setItem('workerToken', verifiedUser.id);

      // Small delay to ensure React state is updated and localStorage is synced
      // This prevents race conditions with ProtectedRoute checking the state
      await new Promise(resolve => setTimeout(resolve, 200));

      // Navigate based on role - use window.location for more reliable navigation
      if (verifiedUser.role === 'admin') {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/check-in';
      }
      
      // Don't show toast here as we're navigating away
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Ungültiger PIN';
      toast.error(errorMessage);
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFullLogout = () => {
    // Full logout - clear everything and go to firm login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentWorker');
    localStorage.removeItem('workerToken');
    navigate('/login');
  };

  if (isLoadingWorkers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Mitarbeiter...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-2xl">
        <div className="card-elevated p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Mitarbeiter auswählen</h1>
              <p className="text-gray-600">Wählen Sie einen Mitarbeiter und geben Sie den PIN ein</p>
            </div>
            <button
              onClick={handleFullLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Vollständig abmelden"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Abmelden</span>
            </button>
          </div>

          {/* Worker Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Mitarbeiter
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {workers.map((worker) => (
                <button
                  key={worker.id}
                  onClick={() => handleWorkerSelect(worker)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    selectedWorker?.id === worker.id
                      ? 'border-primary-500 bg-primary-50 shadow-md'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedWorker?.id === worker.id
                        ? 'bg-primary-500'
                        : 'bg-gray-200'
                    }`}>
                      <User className={`w-6 h-6 ${
                        selectedWorker?.id === worker.id ? 'text-white' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{worker.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{worker.role}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* PIN Input */}
          {selectedWorker && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PIN für {selectedWorker.name}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-center text-2xl font-mono tracking-widest"
                    autoFocus
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || pin.length !== 4}
                className="w-full btn btn-primary py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Wird verifiziert...' : 'Anmelden'}
              </button>
            </form>
          )}

          {!selectedWorker && (
            <div className="text-center py-8 text-gray-500">
              <p>Bitte wählen Sie zuerst einen Mitarbeiter aus</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

