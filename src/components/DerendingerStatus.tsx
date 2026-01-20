import { useState, useEffect } from 'react';
import api from '../lib/api';
import { ShoppingBag, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface DerendingerStatusProps {
  compact?: boolean;
}

export default function DerendingerStatus({ compact = false }: DerendingerStatusProps) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkConnection = async () => {
    setStatus('checking');
    try {
      const response = await api.get('/derendinger/test');
      if (response.data.success) {
        setStatus('connected');
      } else {
        setStatus('disconnected');
      }
    } catch (err) {
      setStatus('disconnected');
    }
    setLastCheck(new Date());
  };

  useEffect(() => {
    checkConnection();
    // Check every 30 minutes (not too frequent)
    const interval = setInterval(checkConnection, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (compact) {
    return (
      <button
        onClick={checkConnection}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all ${
          status === 'connected'
            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            : status === 'checking'
            ? 'bg-amber-100 text-amber-700 animate-pulse'
            : 'bg-red-100 text-red-700 hover:bg-red-200'
        }`}
        title={`Derendinger Shop ${status === 'connected' ? 'verbunden' : status === 'checking' ? 'prüfe...' : 'nicht verbunden'}`}
      >
        {status === 'connected' ? (
          <Wifi className="w-3 h-3" />
        ) : status === 'checking' ? (
          <RefreshCw className="w-3 h-3 animate-spin" />
        ) : (
          <WifiOff className="w-3 h-3" />
        )}
        <span className="hidden sm:inline">
          {status === 'connected' ? 'Shop' : status === 'checking' ? '...' : 'Offline'}
        </span>
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
      status === 'connected'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : status === 'checking'
        ? 'bg-amber-50 border-amber-200 text-amber-700'
        : 'bg-red-50 border-red-200 text-red-700'
    }`}>
      <div className="flex items-center gap-1.5">
        <ShoppingBag className="w-4 h-4" />
        <span className="text-xs font-medium">Derendinger</span>
      </div>
      
      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
        status === 'connected'
          ? 'bg-emerald-200/50'
          : status === 'checking'
          ? 'bg-amber-200/50'
          : 'bg-red-200/50'
      }`}>
        {status === 'connected' ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Verbunden</span>
          </>
        ) : status === 'checking' ? (
          <>
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Prüfe...</span>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span>Offline</span>
          </>
        )}
      </div>
      
      <button
        onClick={checkConnection}
        className="p-1 rounded hover:bg-white/50 transition-colors"
        title="Verbindung prüfen"
      >
        <RefreshCw className={`w-3 h-3 ${status === 'checking' ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
