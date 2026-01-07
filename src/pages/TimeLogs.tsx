import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Clock, Edit, Trash2, X, Calendar, User } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';

interface WorkSession {
  id: string;
  checkIn: string;
  checkOut?: string;
  hours?: number;
  createdAt: string;
  user: {
    id: string;
    name?: string;
    email: string;
  };
}

export default function TimeLogs() {
  const { user, currentWorker } = useAuth();
  const activeUser = currentWorker || user;
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState<WorkSession | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<'week' | 'month' | 'year' | 'all'>('all');
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    block1StartTime: '',
    block1EndTime: '',
    block1Hours: '',
    block2StartTime: '',
    block2EndTime: '',
    block2Hours: '',
  });

  useEffect(() => {
    fetchWorkSessions();
  }, []);

  useEffect(() => {
    fetchWorkSessions();
  }, [filterPeriod]);

  useEffect(() => {
    // Calculate Block 1 hours
    if (formData.block1StartTime && formData.block1EndTime) {
      const start = new Date(`${formData.date}T${formData.block1StartTime}`);
      const end = new Date(`${formData.date}T${formData.block1EndTime}`);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
        const diff = Math.round(((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * 100) / 100;
        setFormData((prev) => {
          const diffStr = diff.toFixed(2);
          if (prev.block1Hours === diffStr) return prev;
          return { ...prev, block1Hours: diffStr };
        });
      }
    }

    // Calculate Block 2 hours
    if (formData.block2StartTime && formData.block2EndTime) {
      const start = new Date(`${formData.date}T${formData.block2StartTime}`);
      const end = new Date(`${formData.date}T${formData.block2EndTime}`);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
        const diff = Math.round(((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * 100) / 100;
        setFormData((prev) => {
          const diffStr = diff.toFixed(2);
          if (prev.block2Hours === diffStr) return prev;
          return { ...prev, block2Hours: diffStr };
        });
      }
    }
  }, [formData.date, formData.block1StartTime, formData.block1EndTime, formData.block2StartTime, formData.block2EndTime]);

  const fetchWorkSessions = async () => {
    try {
      // Always fetch only current worker's sessions
      const url = `/work-sessions?userId=${activeUser?.id}`;
      const response = await api.get(url);
      let sessions = response.data || [];
      
      // Filter by period
      if (filterPeriod !== 'all') {
        const now = new Date();
        let startDate: Date;
        let endDate: Date;
        
        if (filterPeriod === 'week') {
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
        } else if (filterPeriod === 'month') {
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
        } else if (filterPeriod === 'year') {
          startDate = startOfYear(now);
          endDate = endOfYear(now);
        } else {
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
        }
        
        sessions = sessions.filter((session: WorkSession) => {
          const sessionDate = new Date(session.checkIn);
          return sessionDate >= startDate && sessionDate <= endDate;
        });
      }
      
      setWorkSessions(sessions);
    } catch (error) {
      toast.error('Arbeitszeiten konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate Block 1 (required)
    if (!formData.block1StartTime || !formData.block1EndTime) {
      toast.error('Bitte Block 1 Start- und Endzeit angeben');
      return;
    }

    const block1CheckIn = new Date(`${formData.date}T${formData.block1StartTime}`);
    const block1CheckOut = new Date(`${formData.date}T${formData.block1EndTime}`);

    if (isNaN(block1CheckIn.getTime()) || isNaN(block1CheckOut.getTime())) {
      toast.error('Ungültige Zeitangaben für Block 1');
      return;
    }

    if (block1CheckOut <= block1CheckIn) {
      toast.error('Block 1 Endzeit muss nach der Startzeit liegen');
      return;
    }

    // Validate Block 2 (optional, but if filled, must be valid)
    let block2CheckIn: Date | null = null;
    let block2CheckOut: Date | null = null;
    
    if (formData.block2StartTime && formData.block2EndTime) {
      block2CheckIn = new Date(`${formData.date}T${formData.block2StartTime}`);
      block2CheckOut = new Date(`${formData.date}T${formData.block2EndTime}`);

      if (isNaN(block2CheckIn.getTime()) || isNaN(block2CheckOut.getTime())) {
        toast.error('Ungültige Zeitangaben für Block 2');
        return;
      }

      if (block2CheckOut <= block2CheckIn) {
        toast.error('Block 2 Endzeit muss nach der Startzeit liegen');
        return;
      }
    }

    try {
      // Create Block 1
      await api.post('/work-sessions/manual', {
        checkIn: block1CheckIn.toISOString(),
        checkOut: block1CheckOut.toISOString(),
      });

      // Create Block 2 if provided
      if (block2CheckIn && block2CheckOut) {
        await api.post('/work-sessions/manual', {
          checkIn: block2CheckIn.toISOString(),
          checkOut: block2CheckOut.toISOString(),
        });
      }

      toast.success('Arbeitszeit(en) manuell erfasst!');
      setShowModal(false);
      resetForm();
      fetchWorkSessions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Arbeitszeit konnte nicht gespeichert werden');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sind Sie sicher, dass Sie diese Arbeitszeit löschen möchten?')) return;

    try {
      // Work sessions don't have a delete endpoint yet, would need to be added
      toast.error('Löschen von Arbeitszeiten ist derzeit nicht möglich');
    } catch (error) {
      toast.error('Arbeitszeit konnte nicht gelöscht werden');
    }
  };

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      block1StartTime: '',
      block1EndTime: '',
      block1Hours: '',
      block2StartTime: '',
      block2EndTime: '',
      block2Hours: '',
    });
    setEditingSession(null);
  };

  const totalHours = workSessions
    .filter(s => s.checkOut && s.hours)
    .reduce((sum, session) => sum + (session.hours || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Zeiterfassung</h1>
          <p className="text-gray-600 mt-1">Arbeitszeiten für {activeUser?.name || activeUser?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/time-logs/calendar"
            className="btn btn-secondary flex items-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            Kalender
          </Link>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Manuell hinzufügen
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Gesamtstunden</p>
              <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(2)}h</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Einträge</p>
              <p className="text-2xl font-bold text-gray-900">{workSessions.filter(s => s.checkOut).length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Aktive Sitzung</p>
              <p className="text-2xl font-bold text-gray-900">
                {workSessions.filter(s => !s.checkOut).length > 0 ? 'Ja' : 'Nein'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Zeitraum</label>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value as 'week' | 'month' | 'year' | 'all')}
              className="input"
            >
              <option value="all">Alle</option>
              <option value="week">Diese Woche</option>
              <option value="month">Dieser Monat</option>
              <option value="year">Dieses Jahr</option>
            </select>
          </div>
        </div>
      </div>

      {/* Work Sessions List - Grouped by Day */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {workSessions.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              Keine Arbeitszeiten erfasst
            </div>
          ) : (
            (() => {
              // Group sessions by date
              const groupedByDate = workSessions.reduce((acc, session) => {
                const dateKey = format(new Date(session.checkIn), 'yyyy-MM-dd');
                if (!acc[dateKey]) {
                  acc[dateKey] = [];
                }
                acc[dateKey].push(session);
                return acc;
              }, {} as Record<string, WorkSession[]>);

              // Sort dates descending
              const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

              return sortedDates.map((dateKey) => {
                const daySessions = groupedByDate[dateKey];
                const dayTotal = daySessions
                  .filter(s => s.checkOut && s.hours)
                  .reduce((sum, s) => sum + (s.hours || 0), 0);
                const date = new Date(dateKey);

                return (
                  <div key={dateKey} className="border-b border-gray-200 last:border-b-0">
                    {/* Day Header */}
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {format(date, 'EEEE, dd.MM.yyyy', { locale: de })}
                          </h3>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Tagesgesamt</p>
                          <p className="text-lg font-bold text-primary-600">{dayTotal.toFixed(2)}h</p>
                        </div>
                      </div>
                    </div>

                    {/* Sessions for this day */}
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Eingecheckt</th>
                          <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ausgecheckt</th>
                          <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stunden</th>
                          <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {daySessions
                          .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
                          .map((session) => (
                            <tr key={session.id} className="hover:bg-gray-50">
                              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                                {format(new Date(session.checkIn), 'HH:mm')} Uhr
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                                {session.checkOut ? format(new Date(session.checkOut), 'HH:mm') + ' Uhr' : '-'}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {session.hours ? `${session.hours.toFixed(2)}h` : '-'}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                {session.checkOut ? (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                    Abgeschlossen
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                    Aktiv
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                );
              });
            })()
          )}
        </div>
      </div>

      {/* Info Message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Hinweis:</strong> Verwenden Sie die <Link to="/check-in" className="underline font-semibold">Check-In</Link> Seite, um Ihre Arbeitszeiten zu erfassen. 
          Fahrzeug-Zeiten können Sie auf der <Link to="/car-time-logs" className="underline font-semibold">Fahrzeug-Zeiterfassung</Link> Seite hinzufügen.
        </p>
      </div>

      {/* Manual Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">Arbeitszeit manuell hinzufügen</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Datum <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input"
                  required
                />
              </div>

              {/* Block 1 */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Block-Zeit <span className="text-red-500">*</span></h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zeit von <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.block1StartTime}
                      onChange={(e) => setFormData({ ...formData, block1StartTime: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zeit bis <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.block1EndTime}
                      onChange={(e) => setFormData({ ...formData, block1EndTime: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                </div>
                {formData.block1Hours && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600">
                      Stunden: <span className="font-semibold text-gray-900">{formData.block1Hours}h</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Block 2 */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Block-Zeit (optional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zeit von
                    </label>
                    <input
                      type="time"
                      value={formData.block2StartTime}
                      onChange={(e) => setFormData({ ...formData, block2StartTime: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zeit bis
                    </label>
                    <input
                      type="time"
                      value={formData.block2EndTime}
                      onChange={(e) => setFormData({ ...formData, block2EndTime: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
                {formData.block2Hours && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600">
                      Stunden: <span className="font-semibold text-gray-900">{formData.block2Hours}h</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Total Hours */}
              {(formData.block1Hours || formData.block2Hours) && (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Gesamtstunden:</p>
                  <p className="text-2xl font-bold text-primary-700">
                    {(parseFloat(formData.block1Hours || '0') + parseFloat(formData.block2Hours || '0')).toFixed(2)}h
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                >
                  Abbrechen
                </button>
                <button type="submit" className="btn btn-primary">
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
