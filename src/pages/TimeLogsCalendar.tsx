import { useState, useEffect, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar.css';
import moment from 'moment';
import 'moment/locale/de';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Clock, Grid, List, ArrowLeft, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: WorkSession;
}

moment.locale('de');
const localizer = momentLocalizer(moment);

export default function TimeLogsCalendar() {
  const { user, currentWorker } = useAuth();
  const activeUser = currentWorker || user;
  const navigate = useNavigate();
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<WorkSession[]>([]);
  const [showListView, setShowListView] = useState(false);

  useEffect(() => {
    fetchWorkSessions();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const sessionsForDate = workSessions.filter((session) => {
        const sessionDate = parseISO(session.checkIn);
        const sessionDateStr = format(sessionDate, 'yyyy-MM-dd');
        const selected = format(selectedDate, 'yyyy-MM-dd');
        return sessionDateStr === selected;
      });
      setSelectedSessions(sessionsForDate);
    }
  }, [selectedDate, workSessions]);

  const fetchWorkSessions = async () => {
    try {
      // Only fetch current worker's sessions
      const response = await api.get(`/work-sessions?userId=${activeUser?.id}`);
      setWorkSessions(response.data || []);
    } catch (error) {
      toast.error('Arbeitszeiten konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  };

  // Convert work sessions to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return workSessions
      .filter((session) => session.checkOut) // Only show completed sessions
      .map((session) => {
        const start = parseISO(session.checkIn);
        const end = session.checkOut ? parseISO(session.checkOut) : new Date(start.getTime() + 8 * 60 * 60 * 1000); // Default 8 hours if no checkout
        
        const hours = session.hours || 0;
        return {
          id: session.id,
          title: `${hours.toFixed(2)}h`,
          start,
          end,
          resource: session,
        };
      });
  }, [workSessions]);

  // Get hours per day for month view
  const getHoursForDate = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events
      .filter((event) => format(event.start, 'yyyy-MM-dd') === dateStr)
      .reduce((sum, event) => sum + (event.resource.hours || 0), 0);
  };

  // Custom day cell renderer for month view
  const dayPropGetter = (date: Date) => {
    const hours = getHoursForDate(date);
    return {
      className: hours > 0 ? 'bg-green-50 border-green-200' : '',
      style: {
        border: hours > 0 ? '2px solid #10b981' : undefined,
      },
    };
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const hours = event.resource.hours || 0;
    let backgroundColor = '#3b82f6'; // blue
    
    if (hours >= 8) {
      backgroundColor = '#10b981'; // green
    } else if (hours >= 4) {
      backgroundColor = '#f59e0b'; // orange
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        padding: '2px 4px',
      },
    };
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedDate(start);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedDate(event.start);
  };

  const totalHours = useMemo(() => {
    return events.reduce((sum, event) => sum + (event.resource.hours || 0), 0);
  }, [events]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => navigate('/time-logs')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Zurück zur Liste
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Arbeitszeit Kalender</h1>
          <p className="text-gray-600 mt-1">Kalenderansicht Ihrer Arbeitszeiten</p>
        </div>
        <div className="flex items-center gap-2">
          {showListView ? (
            <button
              onClick={() => setShowListView(false)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Grid className="w-4 h-4" />
              Kalender
            </button>
          ) : (
            <button
              onClick={() => navigate('/time-logs')}
              className="btn btn-secondary flex items-center gap-2"
            >
              <List className="w-4 h-4" />
              Zurück zur Liste
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Gesamtstunden</p>
              <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}h</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Einträge</p>
              <p className="text-2xl font-bold text-gray-900">{events.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {!showListView ? (
        <div className="card p-4">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 600 }}
            view={view}
            onView={(newView: string) => setView(newView as 'month' | 'week' | 'day' | 'agenda')}
            date={currentDate}
            onNavigate={setCurrentDate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            dayPropGetter={dayPropGetter}
            eventPropGetter={eventStyleGetter}
            messages={{
              next: 'Weiter',
              previous: 'Zurück',
              today: 'Heute',
              month: 'Monat',
              week: 'Woche',
              day: 'Tag',
              agenda: 'Agenda',
              date: 'Datum',
              time: 'Zeit',
              event: 'Ereignis',
            }}
          />
        </div>
      ) : (
        /* List View */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Datum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Eingecheckt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ausgecheckt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Stunden
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events
                  .sort((a, b) => a.start.getTime() - b.start.getTime())
                  .map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(event.start, 'dd.MM.yyyy', { locale: de })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(event.start, 'HH:mm', { locale: de })} Uhr
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(event.end, 'HH:mm', { locale: de })} Uhr
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {event.resource.hours?.toFixed(2) || '0.00'}h
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Date Details Modal */}
      {selectedDate && selectedSessions.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Arbeitszeiten für {format(selectedDate, 'dd.MM.yyyy', { locale: de })}
              </h2>
              <button
                onClick={() => {
                  setSelectedDate(null);
                  setSelectedSessions([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {selectedSessions.map((session) => (
                <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {format(parseISO(session.checkIn), 'HH:mm', { locale: de })} -{' '}
                        {session.checkOut
                          ? format(parseISO(session.checkOut), 'HH:mm', { locale: de })
                          : 'Aktiv'}
                      </h3>
                    </div>
                    <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                      {session.hours?.toFixed(2) || '0.00'}h
                    </span>
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Gesamt:</span>
                  <span className="text-xl font-bold text-primary-600">
                    {selectedSessions
                      .reduce((sum, session) => sum + (session.hours || 0), 0)
                      .toFixed(2)}h
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
