import { useState, useMemo, useCallback } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export type FilterPeriod = 'week' | 'month' | 'year' | 'all';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface UseDateFilterReturn {
  filterPeriod: FilterPeriod;
  setFilterPeriod: (period: FilterPeriod) => void;
  dateRange: DateRange;
  filterByDate: <T>(items: T[], getDate: (item: T) => Date) => T[];
  isInRange: (date: Date) => boolean;
}

export function useDateFilter(initialPeriod: FilterPeriod = 'all'): UseDateFilterReturn {
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>(initialPeriod);

  const dateRange = useMemo((): DateRange => {
    if (filterPeriod === 'all') {
      return { startDate: null, endDate: null };
    }

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (filterPeriod) {
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      default:
        return { startDate: null, endDate: null };
    }

    return { startDate, endDate };
  }, [filterPeriod]);

  const isInRange = useCallback((date: Date): boolean => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return true; // 'all' period - include everything
    }
    return date >= dateRange.startDate && date <= dateRange.endDate;
  }, [dateRange]);

  const filterByDate = useCallback(<T>(items: T[], getDate: (item: T) => Date): T[] => {
    if (filterPeriod === 'all') {
      return items;
    }
    return items.filter((item) => isInRange(getDate(item)));
  }, [filterPeriod, isInRange]);

  return {
    filterPeriod,
    setFilterPeriod,
    dateRange,
    filterByDate,
    isInRange,
  };
}

export default useDateFilter;
