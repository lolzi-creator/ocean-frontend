import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import type { Vehicle } from '../types';

interface UseVehiclesReturn {
  vehicles: Vehicle[];
  activeVehicles: Vehicle[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getVehicleById: (id: string) => Vehicle | undefined;
  getVehicleLabel: (vehicle: Vehicle) => string;
}

export function useVehicles(): UseVehiclesReturn {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/vehicles');
      setVehicles(response.data);
    } catch (err) {
      const message = 'Fahrzeuge konnten nicht geladen werden';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const activeVehicles = useMemo(() => {
    return vehicles.filter((v) => v.isActive !== false);
  }, [vehicles]);

  const getVehicleById = useCallback((id: string): Vehicle | undefined => {
    return vehicles.find((v) => v.id === id);
  }, [vehicles]);

  const getVehicleLabel = useCallback((vehicle: Vehicle): string => {
    if (vehicle.brand && vehicle.model) {
      return `${vehicle.brand} ${vehicle.model}`;
    }
    return vehicle.vin;
  }, []);

  return {
    vehicles,
    activeVehicles,
    isLoading,
    error,
    refetch: fetchVehicles,
    getVehicleById,
    getVehicleLabel,
  };
}

export default useVehicles;
