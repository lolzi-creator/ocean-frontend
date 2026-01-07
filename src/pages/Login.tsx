import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Wrench, Mail, Lock, User, X } from 'lucide-react';
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
    setErrorMessage(null); // Clear previous errors

    try {
      await login(email, password);
      // Navigate to worker selection after firm login
      navigate('/worker-selection');
    } catch (error: any) {
      // Log error for debugging
      console.error('Login/Register error:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      
      // Extract error message
      let errorMsg = 'Authentifizierung fehlgeschlagen';
      
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      } else if (error.response?.status === 401) {
        errorMsg = 'Ungültige E-Mail oder Passwort';
      } else if (error.response?.status === 400) {
        errorMsg = 'Ungültige Eingabedaten';
      } else if (error.response?.status === 500) {
        errorMsg = 'Serverfehler. Bitte versuchen Sie es später erneut.';
      } else if (!error.response) {
        errorMsg = 'Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung und ob der Server läuft.';
      }
      
      // Set error message to display on page
      setErrorMessage(errorMsg);
      
      // Show error toast with longer duration
      toast.error(errorMsg, {
        duration: 6000, // 6 seconds
        style: {
          background: '#fee2e2',
          color: '#991b1b',
          fontSize: '14px',
          padding: '16px',
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-primary-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-primary-500/30 blur-2xl rounded-full" />
            <div className="relative bg-gradient-to-br from-primary-600 to-primary-700 rounded-3xl p-4 shadow-2xl">
              <img
                src="/logo.webp"
                alt="Ocean Garage"
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 bg-clip-text text-transparent mb-2">
            Ocean Garage
          </h1>
          <p className="text-gray-600 font-medium">Professionelles Verwaltungssystem</p>
        </div>

        {/* Form Card */}
        <div className="card-elevated shadow-2xl border-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Firmen-Login
            </h2>
            <p className="text-gray-600">
              Melden Sie sich mit Ihrer Firmen-E-Mail an
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message Display */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800 mb-1">Fehler</h3>
                    <p className="text-sm text-red-700 mb-2">{errorMessage}</p>
                    {errorMessage.includes('E-Mail nicht bestätigt') && (
                      <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                        <p className="text-xs text-blue-800">
                          <strong>Tipp:</strong> Überprüfen Sie Ihren Posteingang (und Spam-Ordner) auf eine Bestätigungs-E-Mail von Supabase.
                        </p>
                      </div>
                    )}
                    {errorMessage.includes('Benutzer nicht gefunden') && (
                      <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                        <p className="text-xs text-blue-800">
                          <strong>Tipp:</strong> Haben Sie bereits ein Konto? Versuchen Sie sich zu registrieren, falls nicht.
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMessage(null)}
                    className="flex-shrink-0 text-red-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}


            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-Mail
                  </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passwort
                  </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
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
              className="w-full btn btn-primary py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
                  {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Anmelden...
                </span>
              ) : (
                'Anmelden'
              )}
            </button>
          </form>

        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          © 2024 Ocean Garage. Alle Rechte vorbehalten.
        </p>
      </div>
    </div>
  );
}

