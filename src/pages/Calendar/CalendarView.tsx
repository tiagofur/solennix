import React, { useEffect, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { eventService } from '../../services/eventService';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
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
      const start = startOfMonth(date).toISOString();
      const end = endOfMonth(date).toISOString();
      const data = await eventService.getByDateRange(start, end);
      setEvents(data);
    } catch (error) {
      logError('Error fetching events', error);
    } finally {
      // setLoading(false);
    }
  };

  const modifiers = {
    booked: events.map(e => parseISO(e.event_date)),
  };

  const modifiersStyles = {
    booked: {
      fontWeight: 'bold',
      backgroundColor: '#FF6B35', // Brand Orange
      color: 'white',
      borderRadius: '50%'
    }
  };

  const selectedEvents = events.filter(e => 
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 lg:col-span-2 text-gray-900 dark:text-gray-100">
            <style>{`
            .rdp-day_selected:not([disabled]) { 
                background-color: #FF6B35; 
            }
            .rdp-day_selected:hover:not([disabled]) { 
                background-color: #e55a2b; 
            }
            .rdp {
                margin: 0;
            }
            .rdp-months {
                justify-content: center;
            }
            .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
                background-color: rgba(255, 107, 53, 0.1);
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
            className="w-full flex justify-center"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Eventos del {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: es }) : 'día'}
          </h2>
          
          <div className="space-y-4">
            {selectedEvents.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No hay eventos para este día.</p>
            ) : (
              selectedEvents.map((event) => (
                <div 
                    key={event.id} 
                    className="border border-gray-200 dark:border-gray-700 rounded-md p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => navigate(`/events/${event.id}/edit`)}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">{event.clients?.name}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        event.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        event.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        event.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {event.status === 'confirmed' ? 'Confirmado' :
                       event.status === 'completed' ? 'Completado' :
                       event.status === 'cancelled' ? 'Cancelado' : 'Cotizado'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{event.service_type}</p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{event.num_people} personas</p>
                  {(event.start_time || event.end_time) && (
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {event.start_time || ""}
                      {event.start_time && event.end_time ? " - " : ""}
                      {event.end_time || ""}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
