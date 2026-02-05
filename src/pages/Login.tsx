import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, X, Car, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login(email, password);
      navigate('/worker-selection');
    } catch (error: any) {
      let errorMsg = 'Authentifizierung fehlgeschlagen';
      if (error.response?.data?.message) errorMsg = error.response.data.message;
      else if (error.message) errorMsg = error.message;
      else if (error.response?.status === 401) errorMsg = 'Ungültige E-Mail oder Passwort';
      else if (!error.response) errorMsg = 'Verbindungsfehler';
      
      setErrorMessage(errorMsg);
      toast.error(errorMsg, { duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <span className="text-xl font-bold text-neutral-900">Ocean Garage</span>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">Anmelden</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Melden Sie sich mit Ihrer Firmen-E-Mail an
            </p>
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="mb-6 p-3 bg-danger-50 border border-danger-200 rounded-lg">
              <div className="flex items-start gap-2">
                <X className="w-4 h-4 text-danger-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-danger-700">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                E-Mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input pl-10"
                  placeholder="name@firma.ch"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Passwort
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input pl-10"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary py-2.5 mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Anmelden
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-neutral-400 text-center mt-8">
            © {new Date().getFullYear()} Ocean Garage
          </p>
        </div>
      </div>

      {/* Right - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral-900 relative overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 to-transparent" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div />
          
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Werkstatt-<br />verwaltung<br />
              <span className="text-neutral-500">neu gedacht.</span>
            </h2>
            <p className="text-neutral-400 max-w-sm">
              Verwalten Sie Fahrzeuge, Termine, Rechnungen und mehr – effizient und übersichtlich.
            </p>
          </div>
          
          <div className="flex items-center gap-8 text-neutral-400">
            <div>
              <p className="text-2xl font-bold text-white">500+</p>
              <p className="text-sm">Fahrzeuge</p>
            </div>
            <div className="w-px h-10 bg-neutral-700" />
            <div>
              <p className="text-2xl font-bold text-white">99%</p>
              <p className="text-sm">Zufriedenheit</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
