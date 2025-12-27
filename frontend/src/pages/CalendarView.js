import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Calendar as CalendarIcon } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const localizer = momentLocalizer(moment);

const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchCalendarData();
  }, []);
  
  const fetchCalendarData = async () => {
    try {
      const response = await axios.get(`${API}/requests/calendar`);
      const calendarEvents = response.data.map(req => ({
        id: req.id,
        title: `${req.subject} - ${req.equipment_name}`,
        start: new Date(req.scheduled_date),
        end: new Date(new Date(req.scheduled_date).getTime() + (req.duration_hours || 2) * 60 * 60 * 1000),
        resource: req
      }));
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const eventStyleGetter = (event) => {
    const style = {
      backgroundColor: event.resource.status === 'Repaired' ? '#10b981' : '#3b82f6',
      borderRadius: '6px',
      opacity: 0.9,
      color: 'white',
      border: 'none',
      display: 'block',
      padding: '4px 8px',
      fontSize: '0.875rem',
      fontWeight: '500'
    };
    return { style };
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div data-testid="calendar-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-blue-600" />
          Preventive Maintenance Calendar
        </h1>
        <p className="text-slate-600 mt-1">Schedule and track routine maintenance activities</p>
      </div>
      
      <div className="calendar-wrapper" style={{ height: '700px' }}>
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'day', 'agenda']}
          defaultView="month"
          popup
          style={{ height: '100%' }}
          data-testid="calendar-component"
        />
      </div>
      
      {events.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200 mt-8">
          <CalendarIcon className="w-16 h-16 mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No scheduled maintenance</h3>
          <p className="text-slate-500 mt-1">Create preventive maintenance requests to see them here</p>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
