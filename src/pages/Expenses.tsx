import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, DollarSign, Edit, Trash2, X, Car, ChevronDown, ChevronUp, Users, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { useDateFilter, useVehicles } from '../hooks';

// Partial vehicle info returned in expense response
interface ExpenseVehicle {
  id: string;
  vin: string;
  brand?: string;
  model?: string;
}

interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
  vehicle?: {
    id: string;
    vin: string;
    brand?: string;
    model?: string;
  };
  createdBy: {
    id: string;
    name?: string;
    email: string;
  };
  createdAt: string;
}

interface WorkerSalary {
  userId: string;
  userName: string;
  userEmail: string;
  hourlyRate: number;
  totalHours: number;
  salary: number;
}

interface User {
  id: string;
  name?: string;
  email: string;
  hourlyRate?: number;
}

const categories = [
  { value: 'parts', label: 'Ersatzteile' },
  { value: 'labor', label: 'Arbeitszeit' },
  { value: 'tools', label: 'Werkzeuge' },
  { value: 'supplies', label: 'Materialien' },
  { value: 'other', label: 'Sonstiges' },
];

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [salaries, setSalaries] = useState<WorkerSalary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingWorker, setEditingWorker] = useState<User | null>(null);
  const [filterType, setFilterType] = useState<string>('both'); // 'workers', 'cars', 'both'
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterVehicle, setFilterVehicle] = useState<string>('all');
  const [groupByVehicle, setGroupByVehicle] = useState<boolean>(true);
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    description: '',
    category: 'parts',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    vehicleId: '',
  });

  // Use shared hooks
  const { filterPeriod, setFilterPeriod, dateRange } = useDateFilter('all');
  const { activeVehicles: vehicles } = useVehicles();

  useEffect(() => {
    fetchWorkers();
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchSalaries();
  }, [filterCategory, filterVehicle, filterPeriod, filterType]);

  const fetchExpenses = async () => {
    try {
      const params: Record<string, string> = {};
      if (filterCategory !== 'all') params.category = filterCategory;
      if (filterVehicle !== 'all') params.vehicleId = filterVehicle;

      // Use date range from hook
      if (dateRange.startDate && dateRange.endDate) {
        params.startDate = format(dateRange.startDate, 'yyyy-MM-dd');
        params.endDate = format(dateRange.endDate, 'yyyy-MM-dd');
      }

      const response = await api.get('/expenses', { params });
      setExpenses(response.data);
    } catch (error) {
      toast.error('Ausgaben konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const response = await api.get('/users');
      setWorkers(response.data.filter((u: any) => u.isActive && u.role === 'worker'));
    } catch (error) {
      toast.error('Mitarbeiter konnten nicht geladen werden');
    }
  };

  const fetchSalaries = async () => {
    try {
      // Calculate period from 25th to 25th
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      const currentDay = now.getDate();
      if (currentDay >= 25) {
        startDate = new Date(now.getFullYear(), now.getMonth(), 25);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 25);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 25);
        endDate = new Date(now.getFullYear(), now.getMonth(), 25);
      }

      const response = await api.get('/expenses/salaries', {
        params: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
        },
      });
      setSalaries(response.data);
    } catch (error) {
      toast.error('Gehälter konnten nicht geladen werden');
    }
  };

  const handleUpdateHourlyRate = async (userId: string, hourlyRate: number) => {
    try {
      await api.patch(`/users/${userId}`, { hourlyRate });
      toast.success('Stundenlohn erfolgreich aktualisiert');
      fetchWorkers();
      fetchSalaries();
      setShowSalaryModal(false);
      setEditingWorker(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Stundenlohn konnte nicht aktualisiert werden');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        vehicleId: formData.vehicleId || undefined,
      };

      if (editingExpense) {
        await api.patch(`/expenses/${editingExpense.id}`, payload);
        toast.success('Ausgabe erfolgreich aktualisiert');
      } else {
        await api.post('/expenses', payload);
        toast.success('Ausgabe erfolgreich erstellt');
      }

      setShowModal(false);
      resetForm();
      fetchExpenses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ausgabe konnte nicht gespeichert werden');
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      category: expense.category,
      amount: expense.amount.toString(),
      date: format(new Date(expense.date), 'yyyy-MM-dd'),
      notes: expense.notes || '',
      vehicleId: expense.vehicle?.id || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sind Sie sicher, dass Sie diese Ausgabe löschen möchten?')) return;

    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Ausgabe erfolgreich gelöscht');
      fetchExpenses();
    } catch (error) {
      toast.error('Ausgabe konnte nicht gelöscht werden');
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      category: 'parts',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      vehicleId: '',
    });
    setEditingExpense(null);
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalSalaries = salaries.reduce((sum, s) => sum + s.salary, 0);
  const totalAll = totalExpenses + totalSalaries;
  const expensesByCategory = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  // Group expenses by vehicle
  const expensesByVehicle = expenses.reduce((acc, exp) => {
    const vehicleId = exp.vehicle?.id || 'no-vehicle';
    const vehicleKey = vehicleId === 'no-vehicle' 
      ? 'no-vehicle' 
      : `${exp.vehicle?.brand || ''} ${exp.vehicle?.model || ''} (${exp.vehicle?.vin || ''})`.trim();
    
    if (!acc[vehicleId]) {
      acc[vehicleId] = {
        vehicle: exp.vehicle || null,
        vehicleKey,
        expenses: [],
        total: 0,
      };
    }
    acc[vehicleId].expenses.push(exp);
    acc[vehicleId].total += exp.amount;
    return acc;
  }, {} as Record<string, { vehicle: ExpenseVehicle | null; vehicleKey: string; expenses: Expense[]; total: number }>);

  const getCategoryLabel = (category: string) => {
    return categories.find((c) => c.value === category)?.label || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      parts: 'from-blue-500 to-blue-600',
      labor: 'from-purple-500 to-purple-600',
      tools: 'from-amber-500 to-amber-600',
      supplies: 'from-green-500 to-green-600',
      other: 'from-gray-500 to-gray-600',
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  const toggleVehicleGroup = (vehicleId: string) => {
    setExpandedVehicles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(vehicleId)) {
        newSet.delete(vehicleId);
      } else {
        newSet.add(vehicleId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allVehicleIds = Object.keys(expensesByVehicle);
    setExpandedVehicles(new Set(allVehicleIds));
  };

  const collapseAll = () => {
    setExpandedVehicles(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Ausgaben</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {expenses.length} Einträge • CHF {totalAll.toFixed(0)}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Neue Ausgabe
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-danger-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-danger-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">CHF {totalAll.toFixed(0)}</p>
              <p className="text-xs text-neutral-500">Gesamt</p>
            </div>
          </div>
        </div>

        {filterType === 'both' || filterType === 'workers' ? (
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">CHF {totalSalaries.toFixed(0)}</p>
                <p className="text-xs text-neutral-500">Gehälter</p>
              </div>
            </div>
          </div>
        ) : null}

        {(filterType === 'both' || filterType === 'cars') && Object.entries(expensesByCategory).slice(0, filterType === 'both' ? 2 : 3).map(([category, amount]) => (
          <div key={category} className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-neutral-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">CHF {amount.toFixed(0)}</p>
                <p className="text-xs text-neutral-500">{getCategoryLabel(category)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg">
            {[
              { value: 'both', label: 'Alle' },
              { value: 'workers', label: 'Gehälter', icon: Users },
              { value: 'cars', label: 'Fahrzeuge', icon: Car },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterType(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  filterType === opt.value
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {opt.icon && <opt.icon className="w-3 h-3" />}
                {opt.label}
              </button>
            ))}
          </div>

          {(filterType === 'both' || filterType === 'cars') && (
            <>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="input w-36 text-sm"
              >
                <option value="all">Alle Kategorien</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <select
                value={filterVehicle}
                onChange={(e) => setFilterVehicle(e.target.value)}
                className="input w-40 text-sm"
              >
                <option value="all">Alle Fahrzeuge</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.brand && vehicle.model ? `${vehicle.brand} ${vehicle.model}` : vehicle.vin}
                  </option>
                ))}
              </select>
            </>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterPeriod('week')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                filterPeriod === 'week'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Woche
            </button>
            <button
              onClick={() => setFilterPeriod('month')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                filterPeriod === 'month'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Monat
            </button>
            <button
              onClick={() => setFilterPeriod('year')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                filterPeriod === 'year'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Jahr
            </button>
            <button
              onClick={() => setFilterPeriod('all')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                filterPeriod === 'all'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Gesamt
            </button>
          </div>
          {(filterType === 'both' || filterType === 'cars') && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={groupByVehicle}
                  onChange={(e) => setGroupByVehicle(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-semibold text-gray-700">Nach Fahrzeug gruppieren</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Worker Salaries Section */}
      {(filterType === 'both' || filterType === 'workers') && (
        <div className="card-elevated">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                Mitarbeitergehälter
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Periode: 25. bis 25. (aktueller Monat)
              </p>
            </div>
            <button
              onClick={() => {
                setShowSalaryModal(true);
              }}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Stundenlöhne verwalten
            </button>
          </div>

          {salaries.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600">Keine Gehaltsdaten für diesen Zeitraum</p>
            </div>
          ) : (
            <div className="space-y-3">
              {salaries.map((salary, index) => (
                <div
                  key={salary.userId}
                  className="card-hover border border-gray-100 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg mb-1">
                          {salary.userName}
                        </h3>
                        <div className="flex flex-wrap gap-3 items-center text-sm text-gray-600">
                          <span>{salary.totalHours.toFixed(2)} Stunden</span>
                          <span>•</span>
                          <span>CHF {salary.hourlyRate.toFixed(2)}/h</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        CHF {salary.salary.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expenses List */}
      {(filterType === 'both' || filterType === 'cars') && (isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary-600 animate-pulse" />
            </div>
          </div>
        </div>
      ) : expenses.length === 0 ? (
        <div className="card-elevated text-center py-16">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <DollarSign className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Keine Ausgaben gefunden</h3>
          <p className="text-gray-600 mb-6">Erstellen Sie Ihre erste Ausgabe</p>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Erste Ausgabe erstellen
          </button>
        </div>
      ) : groupByVehicle ? (
        // Grouped by vehicle view
        <div className="space-y-4">
          {/* Expand/Collapse All Buttons */}
          {Object.keys(expensesByVehicle).length > 0 && (
            <div className="flex gap-2 justify-end">
              <button
                onClick={expandAll}
                className="text-sm px-3 py-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors font-medium"
              >
                Alle öffnen
              </button>
              <button
                onClick={collapseAll}
                className="text-sm px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors font-medium"
              >
                Alle schließen
              </button>
            </div>
          )}

          {Object.entries(expensesByVehicle)
            .sort(([a], [b]) => {
              // Sort: vehicles first, then no-vehicle
              if (a === 'no-vehicle') return 1;
              if (b === 'no-vehicle') return -1;
              return expensesByVehicle[a].vehicleKey.localeCompare(expensesByVehicle[b].vehicleKey);
            })
            .map(([vehicleId, group], groupIndex) => {
              const isExpanded = expandedVehicles.has(vehicleId);
              
              return (
                <div key={vehicleId} className="card-elevated animate-slide-up" style={{ animationDelay: `${groupIndex * 100}ms` }}>
                  {/* Vehicle Header - Clickable */}
                  <button
                    onClick={() => toggleVehicleGroup(vehicleId)}
                    className="w-full text-left border-b border-gray-200 pb-4 mb-0 transition-all duration-200 hover:bg-gray-50 -m-6 p-6 rounded-t-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {group.vehicle ? (
                          <>
                            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                              <Car className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg text-gray-900">
                                {group.vehicle.brand && group.vehicle.model
                                  ? `${group.vehicle.brand} ${group.vehicle.model}`
                                  : group.vehicle.vin}
                              </h3>
                              <p className="text-sm text-gray-600">VIN: {group.vehicle.vin}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {group.expenses.length} {group.expenses.length === 1 ? 'Ausgabe' : 'Ausgaben'}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                              <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg text-gray-900">Ohne Fahrzeug</h3>
                              <p className="text-xs text-gray-500 mt-1">
                                {group.expenses.length} {group.expenses.length === 1 ? 'Ausgabe' : 'Ausgaben'}
                              </p>
                            </div>
                          </>
                        )}
                        {/* Chevron Icon */}
                        <div className="flex-shrink-0 ml-2">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm text-gray-600 mb-1">Gesamt</p>
                        <p className="text-3xl font-bold text-red-600">
                          CHF {group.total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Expenses List - Collapsible */}
                  {isExpanded && (
                    <div className="pt-4 space-y-3 animate-fade-in">
                      {group.expenses.map((expense, index) => (
                        <div
                          key={expense.id}
                          className="card-hover border border-gray-100"
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              {/* Icon */}
                              <div className="relative flex-shrink-0">
                                <div className="absolute inset-0 bg-primary-500/20 blur-lg rounded-xl" />
                                <div className={`w-12 h-12 bg-gradient-to-br ${getCategoryColor(expense.category)} rounded-xl flex items-center justify-center shadow-lg relative z-10`}>
                                  <DollarSign className="w-6 h-6 text-white" />
                                </div>
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h4 className="font-bold text-gray-900 mb-1">
                                      {expense.description}
                                    </h4>
                                    <div className="flex flex-wrap gap-3 items-center">
                                      <span className={`badge ${getCategoryColor(expense.category).includes('blue') ? 'badge-info' : 'badge-gray'}`}>
                                        {getCategoryLabel(expense.category)}
                                      </span>
                                      <span className="text-sm text-gray-500">
                                        {format(new Date(expense.date), 'dd.MM.yyyy')}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xl font-bold text-red-600">
                                      CHF {expense.amount.toFixed(2)}
                                    </p>
                                  </div>
                                </div>

                                {expense.notes && (
                                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-100 mt-2">
                                    <p className="text-sm text-gray-700">{expense.notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(expense);
                                }}
                                className="p-2 hover:bg-primary-50 rounded-xl transition-all duration-200 hover:scale-110"
                                title="Bearbeiten"
                              >
                                <Edit className="w-4 h-4 text-primary-600" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(expense.id);
                                }}
                                className="p-2 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-110"
                                title="Löschen"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        // Flat list view
        <div className="space-y-4">
          {expenses.map((expense, index) => (
            <div
              key={expense.id}
              className="card-hover animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {/* Icon */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-primary-500/20 blur-lg rounded-xl" />
                    <div className={`w-16 h-16 bg-gradient-to-br ${getCategoryColor(expense.category)} rounded-xl flex items-center justify-center shadow-lg relative z-10`}>
                      <DollarSign className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg mb-1">
                          {expense.description}
                        </h3>
                        <div className="flex flex-wrap gap-3 items-center">
                          <span className={`badge ${getCategoryColor(expense.category).includes('blue') ? 'badge-info' : 'badge-gray'}`}>
                            {getCategoryLabel(expense.category)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(expense.date), 'dd.MM.yyyy')}
                          </span>
                          {expense.vehicle && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Car className="w-4 h-4" />
                              <span>
                                {expense.vehicle.brand && expense.vehicle.model
                                  ? `${expense.vehicle.brand} ${expense.vehicle.model}`
                                  : expense.vehicle.vin}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600">
                          CHF {expense.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {expense.notes && (
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-sm text-gray-700">{expense.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(expense)}
                    className="p-2.5 hover:bg-primary-50 rounded-xl transition-all duration-200 hover:scale-110"
                    title="Bearbeiten"
                  >
                    <Edit className="w-4 h-4 text-primary-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="p-2.5 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-110"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Salary Settings Modal */}
      {showSalaryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-3xl z-10">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Stundenlöhne verwalten
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Legen Sie den Stundenlohn für jeden Mitarbeiter fest
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSalaryModal(false);
                  setEditingWorker(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {workers.map((worker) => (
                <div key={worker.id} className="card-hover border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">
                        {worker.name || worker.email}
                      </h3>
                      <p className="text-sm text-gray-600">{worker.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-gray-700">CHF</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={worker.hourlyRate || 35}
                          onChange={(e) => {
                            const newWorkers = workers.map((w) =>
                              w.id === worker.id
                                ? { ...w, hourlyRate: parseFloat(e.target.value) || 35 }
                                : w
                            );
                            setWorkers(newWorkers);
                            setEditingWorker(worker);
                          }}
                          className="input w-24"
                        />
                        <span className="text-sm text-gray-600">/h</span>
                      </div>
                      <button
                        onClick={() => handleUpdateHourlyRate(worker.id, worker.hourlyRate || 35)}
                        className="btn btn-primary px-4 py-2"
                      >
                        Speichern
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-3xl z-10">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {editingExpense ? 'Ausgabe bearbeiten' : 'Neue Ausgabe'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {editingExpense ? 'Aktualisieren Sie die Ausgabedaten' : 'Erfassen Sie eine neue Betriebsausgabe'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Beschreibung *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  className="input"
                  placeholder="z.B. Ölfilter, Bremsbeläge..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Kategorie *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className="input"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Betrag (CHF) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    className="input"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Datum *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fahrzeug (optional)
                  </label>
                  <select
                    value={formData.vehicleId}
                    onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                    className="input"
                  >
                    <option value="">Kein Fahrzeug</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.brand && vehicle.model
                          ? `${vehicle.brand} ${vehicle.model}`
                          : vehicle.vin}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notizen
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Zusätzliche Informationen..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Abbrechen
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingExpense ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

