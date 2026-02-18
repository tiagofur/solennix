import React, { useEffect, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { eventService } from '../../services/eventService';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Calendar, Users, Clock, MapPin, Phone, DollarSign as DollarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { logError } from '../../lib/errorHandler';

export const CalendarView: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  // const [_loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents(currentMonth);
  }, [currentMonth]);

  const fetchEvents = async (date: Date) => {
    try {
      // setLoading(true);
      const start = format(startOfMonth(date), 'yyyy-MM-dd');
      const end = format(endOfMonth(date), 'yyyy-MM-dd');
      const data = await eventService.getByDateRange(start, end);
      setEvents(data || []);
    } catch (error) {
      logError('Error fetching events', error);
    } finally {
      // setLoading(false);
    }
  };

  const modifiers = {
    booked: (events || []).map(e => parseISO(e.event_date)),
  };

  const modifiersStyles = {
    booked: {
      fontWeight: 'bold',
      backgroundColor: '#FF6B35', // Brand Orange
      color: 'white',
      borderRadius: '50%'
    }
  };

  const selectedEvents = (events || []).filter(e => 
    selectedDate && isSameDay(parseISO(e.event_date), selectedDate)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendario de Eventos</h1>
        <Link
          to={`/events/new?date=${selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}`}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-orange hover:bg-orange-600 shadow-sm transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Evento
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* Calendar Card */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-4 sm:p-8 xl:col-span-3 border border-gray-100 dark:border-gray-700 transition-colors">
            <style>{`
            .rdp {
                --rdp-cell-size: 45px;
                --rdp-accent-color: #FF6B35;
                --rdp-background-color: rgba(255, 107, 53, 0.1);
                margin: 0;
                width: 100%;
            }
            .rdp-months {
                justify-content: center;
                width: 100%;
            }
            .rdp-month {
                width: 100%;
                max-width: 400px;
            }
            .rdp-table {
                width: 100%;
                max-width: 100%;
            }
            .rdp-day_selected:not([disabled]) { 
                background-color: var(--rdp-accent-color);
                font-weight: bold;
                color: white;
            }
            .rdp-day_selected:hover:not([disabled]) { 
                background-color: #e55a2b; 
            }
            .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
                background-color: var(--rdp-background-color);
                color: var(--rdp-accent-color);
            }
            .rdp-head_cell {
                text-transform: uppercase;
                font-size: 0.75rem;
                font-weight: 700;
                color: #6B7280;
                padding-bottom: 1rem;
            }
            .rdp-nav_button {
                color: #FF6B35;
            }
            .rdp-nav_button:hover {
                color: #e55a2b;
            }
            .rdp-caption_label {
                font-size: 1.125rem;
                font-weight: 700;
                color: #111827;
                text-transform: capitalize;
            }
            .rdp-day {
                font-weight: 500;
                color: #374151;
            }
            .rdp-day_outside {
                color: #9CA3AF !important;
                opacity: 0.5;
            }
            `}</style>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            locale={es}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="flex justify-center"
          />
        </div>

        {/* Events List Card */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6 xl:col-span-2 border border-gray-100 dark:border-gray-700 flex flex-col transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Eventos del {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: es }) : 'día'}
            </h2>
            {selectedEvents.length > 0 && (
                <span className="bg-brand-orange/10 text-brand-orange text-xs font-bold px-2 py-1 rounded-full">
                    {selectedEvents.length} {selectedEvents.length === 1 ? 'Evento' : 'Eventos'}
                </span>
            )}
          </div>
          
          <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
            {selectedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
                    <Calendar className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No hay eventos para este día.</p>
                <Link
                  to={`/events/new?date=${selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}`}
                  className="mt-4 text-brand-orange text-sm font-semibold hover:underline"
                >
                  Crear uno nuevo
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                {selectedEvents.map((event) => (
                  <div 
                      key={event.id} 
                      className="group border border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:border-brand-orange dark:hover:border-brand-orange bg-gray-50/50 dark:bg-gray-900/30 hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition-all shadow-sm hover:shadow-md flex flex-col h-full"
                      onClick={() => navigate(`/events/${event.id}/summary`)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0 flex-1 mr-2">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-brand-orange transition-colors truncate">
                            {event.clients?.name}
                        </h3>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-tight">
                            {event.service_type}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                          event.status === 'confirmed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          event.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          event.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {event.status === 'confirmed' ? 'Confirmado' :
                        event.status === 'completed' ? 'Completado' :
                        event.status === 'cancelled' ? 'Cancelado' : 'Cotizado'}
                      </span>
                    </div>
                    
                    <div className="space-y-2.5 mt-auto">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center text-[11px] text-gray-600 dark:text-gray-400">
                            <Clock className="h-3.5 w-3.5 mr-1.5 text-brand-orange opacity-70" />
                            <span className="truncate">
                                {event.start_time || "S/H"}
                                {event.start_time && event.end_time ? " - " : ""}
                                {event.end_time || ""}
                            </span>
                        </div>
                        <div className="flex items-center text-[11px] text-gray-600 dark:text-gray-400">
                            <Users className="h-3.5 w-3.5 mr-1.5 text-brand-orange opacity-70" />
                            <span>{event.num_people} pax</span>
                        </div>
                      </div>

                      {event.location && (
                        <div className="flex items-start text-[11px] text-gray-600 dark:text-gray-400">
                            <MapPin className="h-3.5 w-3.5 mr-1.5 mt-0.5 text-brand-orange opacity-70 shrink-0" />
                            <span className="line-clamp-1">{event.location}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/50">
                        <div className="flex items-center text-[11px] text-gray-500 dark:text-gray-500">
                            <Phone className="h-3 w-3 mr-1" />
                            <span>{event.clients?.phone || 'Sin tel.'}</span>
                        </div>
                        <div className="flex items-center text-xs font-bold text-gray-900 dark:text-gray-100">
                            <DollarIcon className="h-3 w-3 mr-0.5 text-green-600" />
                            {event.total_amount?.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
