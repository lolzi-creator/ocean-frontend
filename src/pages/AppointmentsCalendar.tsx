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
import { Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Grid, List, ArrowLeft, X, Edit, Trash2, Check, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Appointment {
  id: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceType: string;
  status: string;
  notes?: string;
  vehicle?: {
    id: string;
    vin: string;
    brand?: string;
    model?: string;
  };
  createdBy?: {
    id: string;
    name?: string;
    email: string;
  };
}

interface Vehicle {
  id: string;
  vin: string;
  brand?: string;
  model?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Appointment;
}

moment.locale('de');
const localizer = momentLocalizer(moment);

const serviceTypeLabels: Record<string, string> = {
  small_service: 'Kleine Wartung',
  big_service: 'Grosse Wartung',
  tire_change: 'Reifenwechsel',
  brake_service: 'Bremsenservice',
  repair: 'Reparatur',
  inspection: 'Inspektion',
};

const statusColors: Record<string, string> = {
  pending: '#f59e0b', // orange
  confirmed: '#10b981', // green
  cancelled: '#ef4444', // red
  completed: '#3b82f6', // blue
};

export default function AppointmentsCalendar() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAppointments, setSelectedAppointments] = useState<Appointment[]>([]);
  const [showListView, setShowListView] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterVehicle, setFilterVehicle] = useState<string>('all');
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    serviceType: 'small_service',
    status: 'pending',
    notes: '',
    vehicleId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
  });

  useEffect(() => {
    fetchAppointments();
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const appsForDate = appointments.filter((apt) => {
        const aptDate = parseISO(apt.date);
        const aptDateStr = format(aptDate, 'yyyy-MM-dd');
        const selected = format(selectedDate, 'yyyy-MM-dd');
        return aptDateStr === selected;
      });
      setSelectedAppointments(appsForDate);
    }
  }, [selectedDate, appointments]);

  const fetchAppointments = async () => {
    try {
      const response = await api.get('/appointments');
      setAppointments(response.data || []);
    } catch (error) {
      toast.error('Termine konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await api.get('/vehicles');
      setVehicles(response.data.filter((v: any) => v.isActive !== false));
    } catch (error) {
      toast.error('Fahrzeuge konnten nicht geladen werden');
    }
  };

  // Convert appointments to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return appointments
      .filter((apt) => {
        if (filterStatus !== 'all' && apt.status !== filterStatus) return false;
        if (filterVehicle !== 'all' && apt.vehicle?.id !== filterVehicle) return false;
        return true;
      })
      .map((apt) => {
        const start = parseISO(apt.date);
        const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration
        
        const serviceLabel = serviceTypeLabels[apt.serviceType] || apt.serviceType;
        const vehicleName = apt.vehicle?.brand && apt.vehicle?.model
          ? `${apt.vehicle.brand} ${apt.vehicle.model}`
          : apt.vehicle?.vin || 'Kein Fahrzeug';
        
        return {
          id: apt.id,
          title: `${apt.customerName} - ${serviceLabel}`,
          start,
          end,
          resource: apt,
        };
      });
  }, [appointments, filterStatus, filterVehicle]);

  const eventStyleGetter = (event: CalendarEvent) => {
    const status = event.resource.status;
    const backgroundColor = statusColors[status] || '#6b7280';
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        padding: '2px 4px',
        fontSize: '12px',
      },
    };
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    // Check if there are appointments for this date
    const dateStr = format(start, 'yyyy-MM-dd');
    const appsForDate = appointments.filter((apt) => {
      const aptDate = parseISO(apt.date);
      const aptDateStr = format(aptDate, 'yyyy-MM-dd');
      return aptDateStr === dateStr;
    });
    
    if (appsForDate.length > 0) {
      // Show appointments for this date
      setSelectedDate(start);
    } else {
      // No appointments, open create modal with this date/time
      setFormData({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        serviceType: 'small_service',
        status: 'pending',
        notes: '',
        vehicleId: '',
        date: format(start, 'yyyy-MM-dd'),
        time: format(start, 'HH:mm'),
      });
      setShowCreateModal(true);
    }
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setEditingAppointment(event.resource);
    const aptDate = parseISO(event.resource.date);
    setFormData({
      customerName: event.resource.customerName,
      customerPhone: event.resource.customerPhone || '',
      customerEmail: event.resource.customerEmail || '',
      serviceType: event.resource.serviceType,
      status: event.resource.status,
      notes: event.resource.notes || '',
      vehicleId: event.resource.vehicle?.id || '',
      date: format(aptDate, 'yyyy-MM-dd'),
      time: format(aptDate, 'HH:mm'),
    });
    setShowEditModal(true);
  };

  const handleCreateAppointment = async () => {
    if (!formData.customerName.trim()) {
      toast.error('Bitte geben Sie einen Kundennamen ein');
      return;
    }

    try {
      const dateTime = new Date(`${formData.date}T${formData.time}`);
      await api.post('/appointments', {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone || undefined,
        customerEmail: formData.customerEmail || undefined,
        serviceType: formData.serviceType,
        status: formData.status,
        notes: formData.notes || undefined,
        vehicleId: formData.vehicleId || undefined,
        date: dateTime.toISOString(),
      });
      
      toast.success('Termin erstellt');
      setShowCreateModal(false);
      setFormData({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        serviceType: 'small_service',
        status: 'pending',
        notes: '',
        vehicleId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '09:00',
      });
      fetchAppointments();
    } catch (error) {
      toast.error('Termin konnte nicht erstellt werden');
    }
  };

  const handleUpdateAppointment = async () => {
    if (!editingAppointment) return;

    try {
      const dateTime = new Date(`${formData.date}T${formData.time}`);
      await api.patch(`/appointments/${editingAppointment.id}`, {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone || undefined,
        customerEmail: formData.customerEmail || undefined,
        serviceType: formData.serviceType,
        status: formData.status,
        notes: formData.notes || undefined,
        vehicleId: formData.vehicleId || undefined,
        date: dateTime.toISOString(),
      });
      
      toast.success('Termin aktualisiert');
      setShowEditModal(false);
      setEditingAppointment(null);
      fetchAppointments();
    } catch (error) {
      toast.error('Termin konnte nicht aktualisiert werden');
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('Möchten Sie diesen Termin wirklich löschen?')) return;

    try {
      await api.delete(`/appointments/${id}`);
      toast.success('Termin gelöscht');
      fetchAppointments();
      if (selectedDate) {
        setSelectedAppointments(prev => prev.filter(apt => apt.id !== id));
      }
    } catch (error) {
      toast.error('Termin konnte nicht gelöscht werden');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Ausstehend' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Bestätigt' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Abgesagt' },
      completed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Abgeschlossen' },
    };
    
    const style = colors[status] || colors.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const appointmentsByStatus = useMemo(() => {
    return {
      pending: appointments.filter(a => a.status === 'pending').length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length,
      completed: appointments.filter(a => a.status === 'completed').length,
    };
  }, [appointments]);

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
          <h1 className="text-3xl font-bold text-gray-900">Termine Kalender</h1>
          <p className="text-gray-600 mt-1">Übersichtliche Kalenderansicht aller Termine</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFormData({
                customerName: '',
                customerPhone: '',
                customerEmail: '',
                serviceType: 'small_service',
                status: 'pending',
                notes: '',
                vehicleId: '',
                date: format(new Date(), 'yyyy-MM-dd'),
                time: '09:00',
              });
              setShowCreateModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Neuer Termin
          </button>
          <button
            onClick={() => setShowListView(!showListView)}
            className={`btn ${showListView ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
          >
            {showListView ? <Grid className="w-4 h-4" /> : <List className="w-4 h-4" />}
            {showListView ? 'Kalender' : 'Liste'}
          </button>
        </div>
      </div>

      {/* Stats & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Ausstehend</p>
              <p className="text-2xl font-bold text-gray-900">{appointmentsByStatus.pending}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Bestätigt</p>
              <p className="text-2xl font-bold text-gray-900">{appointmentsByStatus.confirmed}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Abgesagt</p>
              <p className="text-2xl font-bold text-gray-900">{appointmentsByStatus.cancelled}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input"
              >
                <option value="all">Alle</option>
                <option value="pending">Ausstehend</option>
                <option value="confirmed">Bestätigt</option>
                <option value="cancelled">Abgesagt</option>
                <option value="completed">Abgeschlossen</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fahrzeug</label>
              <select
                value={filterVehicle}
                onChange={(e) => setFilterVehicle(e.target.value)}
                className="input"
              >
                <option value="all">Alle Fahrzeuge</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.brand && v.model ? `${v.brand} ${v.model}` : v.vin}
                  </option>
                ))}
              </select>
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
            onView={(newView) => setView(newView as 'month' | 'week' | 'day' | 'agenda')}
            date={currentDate}
            onNavigate={setCurrentDate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
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
                    Datum & Zeit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Kunde
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fahrzeug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events
                  .sort((a, b) => a.start.getTime() - b.start.getTime())
                  .map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span>{format(event.start, 'dd.MM.yyyy', { locale: de })}</span>
                          <span className="text-gray-600 text-xs">
                            {format(event.start, 'HH:mm', { locale: de })} Uhr
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {event.resource.customerName}
                        </div>
                        {event.resource.customerPhone && (
                          <div className="text-sm text-gray-500">{event.resource.customerPhone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {serviceTypeLabels[event.resource.serviceType] || event.resource.serviceType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.resource.vehicle?.brand && event.resource.vehicle?.model
                          ? `${event.resource.vehicle.brand} ${event.resource.vehicle.model}`
                          : event.resource.vehicle?.vin || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(event.resource.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSelectEvent(event)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAppointment(event.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Date Details Modal */}
      {selectedDate && selectedAppointments.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Termine für {format(selectedDate, 'dd.MM.yyyy', { locale: de })}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setFormData({
                      customerName: '',
                      customerPhone: '',
                      customerEmail: '',
                      serviceType: 'small_service',
                      status: 'pending',
                      notes: '',
                      vehicleId: '',
                      date: format(selectedDate, 'yyyy-MM-dd'),
                      time: '09:00',
                    });
                    setShowCreateModal(true);
                    setSelectedDate(null);
                    setSelectedAppointments([]);
                  }}
                  className="btn btn-primary flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Neuer Termin
                </button>
                <button
                  onClick={() => {
                    setSelectedDate(null);
                    setSelectedAppointments([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {selectedAppointments.map((apt) => {
                const aptDate = parseISO(apt.date);
                return (
                  <div key={apt.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{apt.customerName}</h3>
                        <p className="text-sm text-gray-500">
                          {format(aptDate, 'HH:mm', { locale: de })} Uhr •{' '}
                          {serviceTypeLabels[apt.serviceType] || apt.serviceType}
                        </p>
                        {apt.vehicle && (
                          <p className="text-sm text-gray-500 mt-1">
                            {apt.vehicle.brand && apt.vehicle.model
                              ? `${apt.vehicle.brand} ${apt.vehicle.model}`
                              : apt.vehicle.vin}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(apt.status)}
                        <button
                          onClick={() => handleSelectEvent({ id: apt.id, title: '', start: aptDate, end: aptDate, resource: apt })}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {apt.notes && (
                      <p className="text-sm text-gray-700 mt-2">{apt.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">Termin bearbeiten</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingAppointment(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kundenname</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service-Typ</label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                    className="input"
                  >
                    <option value="small_service">Kleine Wartung</option>
                    <option value="big_service">Grosse Wartung</option>
                    <option value="tire_change">Reifenwechsel</option>
                    <option value="brake_service">Bremsenservice</option>
                    <option value="repair">Reparatur</option>
                    <option value="inspection">Inspektion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                  <input
                    type="text"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail</label>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Datum</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Uhrzeit</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input"
                  >
                    <option value="pending">Ausstehend</option>
                    <option value="confirmed">Bestätigt</option>
                    <option value="cancelled">Abgesagt</option>
                    <option value="completed">Abgeschlossen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fahrzeug</label>
                  <select
                    value={formData.vehicleId}
                    onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                    className="input"
                  >
                    <option value="">Kein Fahrzeug</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.brand && v.model ? `${v.brand} ${v.model}` : v.vin}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notizen</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingAppointment(null);
                  }}
                  className="btn btn-secondary"
                >
                  Abbrechen
                </button>
                <button onClick={handleUpdateAppointment} className="btn btn-primary">
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">Neuen Termin erstellen</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({
                    customerName: '',
                    customerPhone: '',
                    customerEmail: '',
                    serviceType: 'small_service',
                    status: 'pending',
                    notes: '',
                    vehicleId: '',
                    date: format(new Date(), 'yyyy-MM-dd'),
                    time: '09:00',
                  });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kundenname <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="input"
                    placeholder="Max Mustermann"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service-Typ</label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                    className="input"
                  >
                    <option value="small_service">Kleine Wartung</option>
                    <option value="big_service">Grosse Wartung</option>
                    <option value="tire_change">Reifenwechsel</option>
                    <option value="brake_service">Bremsenservice</option>
                    <option value="repair">Reparatur</option>
                    <option value="inspection">Inspektion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                  <input
                    type="text"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="input"
                    placeholder="+41 79 123 45 67"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail</label>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="input"
                    placeholder="max@example.com"
                  />
                </div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Uhrzeit <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input"
                  >
                    <option value="pending">Ausstehend</option>
                    <option value="confirmed">Bestätigt</option>
                    <option value="cancelled">Abgesagt</option>
                    <option value="completed">Abgeschlossen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fahrzeug</label>
                  <select
                    value={formData.vehicleId}
                    onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                    className="input"
                  >
                    <option value="">Kein Fahrzeug</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.brand && v.model ? `${v.brand} ${v.model}` : v.vin}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notizen</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Zusätzliche Informationen zum Termin..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({
                      customerName: '',
                      customerPhone: '',
                      customerEmail: '',
                      serviceType: 'small_service',
                      status: 'pending',
                      notes: '',
                      vehicleId: '',
                      date: format(new Date(), 'yyyy-MM-dd'),
                      time: '09:00',
                    });
                  }}
                  className="btn btn-secondary"
                >
                  Abbrechen
                </button>
                <button onClick={handleCreateAppointment} className="btn btn-primary">
                  Termin erstellen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

