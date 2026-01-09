import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

interface AuthContextType {
  user: User | null; // Firm user (from email/password login)
  currentWorker: User | null; // Current worker (from PIN login)
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, role?: string) => Promise<void>;
  logout: () => void;
  setCurrentWorker: (worker: User) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null); // Firm user
  const [currentWorker, setCurrentWorker] = useState<User | null>(null); // Current worker
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedWorker = localStorage.getItem('currentWorker');
    const token = localStorage.getItem('token');
    const workerToken = localStorage.getItem('workerToken');
    
    if (storedUser && token) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }

    if (storedWorker) {
      try {
        const workerData = JSON.parse(storedWorker);
        setCurrentWorker(workerData);
        // Ensure workerToken is set if we have a worker
        if (workerData.id && !workerToken) {
          localStorage.setItem('workerToken', workerData.id);
        }
      } catch (error) {
        console.error('Error parsing stored worker:', error);
        localStorage.removeItem('currentWorker');
        localStorage.removeItem('workerToken');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      // Check if response has required data
      if (!response.data) {
        throw new Error('Keine Antwort vom Server erhalten');
      }
      
      const { access_token, user: supabaseUser } = response.data;
      
      if (!access_token) {
        throw new Error('Kein Zugriffstoken erhalten');
      }
      
      localStorage.setItem('token', access_token);
      
      // Create a minimal user object from Supabase response (we'll use this for firm login)
      // The actual worker will be selected later via PIN, so we don't need to fetch from DB
      const userData = {
        id: supabaseUser?.id || email,
        email: email,
        name: supabaseUser?.user_metadata?.name || email.split('@')[0],
        role: 'worker', // Default role, actual role comes from worker selection
      };
      
      // Set user data immediately (no DB fetch needed for firm login)
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      toast.success('Willkommen zurück!', { duration: 3000 });
    } catch (error: any) {
      console.error('Login error:', error);
      // Re-throw with better error message
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Anmeldung fehlgeschlagen';
      const enhancedError = new Error(errorMessage);
      (enhancedError as any).response = error.response;
      throw enhancedError;
    }
  };

  const register = async (email: string, password: string, name?: string, role?: string) => {
    try {
      const response = await api.post('/auth/register', { email, password, name, role });
      const { user: supabaseUser } = response.data;
      
      // After registration, user needs to verify email, so we don't set token yet
      // But we can still show success message
      toast.success('Konto erstellt! Bitte überprüfen Sie Ihre E-Mail, um Ihr Konto zu verifizieren.');
      
      // Note: User will need to login after email verification
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await api.post('/auth/logout', { access_token: token });
      }
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('currentWorker');
      localStorage.removeItem('workerToken');
      setUser(null);
      setCurrentWorker(null);
      toast.success('Erfolgreich abgemeldet');
    }
  };

  const handleSetCurrentWorker = (worker: User) => {
    setCurrentWorker(worker);
    localStorage.setItem('currentWorker', JSON.stringify(worker));
  };

  return (
    <AuthContext.Provider value={{ user, currentWorker, login, register, logout, setCurrentWorker: handleSetCurrentWorker, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

