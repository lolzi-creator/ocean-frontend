import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { User, Lock, LogOut, Car, Loader2 } from 'lucide-react';

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
      toast.error('Bitte 4-stelligen PIN eingeben');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/verify-pin', { 
        pin,
        userId: selectedWorker?.id 
      });
      const verifiedUser = response.data.user;

      if (selectedWorker && verifiedUser.id !== selectedWorker.id) {
        toast.error('PIN stimmt nicht überein');
        setPin('');
        return;
      }

      setCurrentWorker(verifiedUser);
      localStorage.setItem('currentWorker', JSON.stringify(verifiedUser));
      localStorage.setItem('workerToken', verifiedUser.id);

      await new Promise(resolve => setTimeout(resolve, 200));

      if (verifiedUser.role === 'admin') {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/check-in';
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ungültiger PIN');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFullLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentWorker');
    localStorage.removeItem('workerToken');
    navigate('/login');
  };

  if (isLoadingWorkers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <span className="text-xl font-bold text-neutral-900">Ocean Garage</span>
          </div>
        </div>

        <div className="card p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-neutral-900">Mitarbeiter wählen</h1>
              <p className="text-sm text-neutral-500">Wählen Sie Ihr Profil</p>
            </div>
            <button
              onClick={handleFullLogout}
              className="p-2 text-neutral-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
              title="Abmelden"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Worker Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {workers.map((worker) => (
              <button
                key={worker.id}
                onClick={() => handleWorkerSelect(worker)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                  selectedWorker?.id === worker.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedWorker?.id === worker.id
                      ? 'bg-primary-600'
                      : 'bg-neutral-200'
                  }`}>
                    <User className={`w-5 h-5 ${
                      selectedWorker?.id === worker.id ? 'text-white' : 'text-neutral-500'
                    }`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900 text-sm truncate">{worker.name}</p>
                    <p className="text-xs text-neutral-500 capitalize">{worker.role}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* PIN Input */}
          {selectedWorker && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  PIN für {selectedWorker.name}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="input pl-10 text-center text-xl font-mono tracking-[0.5em]"
                    autoFocus
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || pin.length !== 4}
                className="w-full btn btn-primary"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Anmelden'
                )}
              </button>
            </form>
          )}

          {!selectedWorker && (
            <div className="text-center py-6 text-neutral-400 text-sm">
              Bitte wählen Sie einen Mitarbeiter
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
