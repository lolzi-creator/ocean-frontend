import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 5000; // 5 seconds
    const interval = 50; // Update every 50ms
    const increment = (100 / duration) * interval;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + increment;
        if (newProgress >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 100);
          return 100;
        }
        return newProgress;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl animate-pulse" />
          <img
            src="/logo.webp"
            alt="Ocean Garage"
            className="w-32 h-32 object-contain relative z-10 drop-shadow-2xl"
          />
        </div>

        {/* Loading Text */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Ocean Garage</h2>
          <p className="text-blue-100 text-sm">Lade Software...</p>
        </div>

        {/* Loading Spinner */}
        <div className="relative">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>

        {/* Progress Bar */}
        <div className="w-64 h-1 bg-blue-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Version/Status Text */}
        <p className="text-blue-200 text-xs mt-4">Version 1.0.0</p>
      </div>
    </div>
  );
}

