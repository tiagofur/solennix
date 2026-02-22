import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/eventService';
import { startOfMonth, endOfMonth, format } from 'date-fns';

const FREE_PLAN_LIMIT = 3;

export function usePlanLimits() {
  const { user } = useAuth();
  const [eventsThisMonth, setEventsThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkLimits() {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        // Calculate current month date range
        const now = new Date();
        const start = format(startOfMonth(now), 'yyyy-MM-dd');
        const end = format(endOfMonth(now), 'yyyy-MM-dd');
        
        // Fetch events for the current month
        const events = await eventService.getByDateRange(start, end);
        setEventsThisMonth(events?.length || 0);
      } catch (error) {
        console.error("Error fetching plan limits", error);
      } finally {
        setLoading(false);
      }
    }

    checkLimits();
  }, [user]);

  const isBasicPlan = user?.plan === 'basic' || !user?.plan;
  const canCreateEvent = !isBasicPlan || eventsThisMonth < FREE_PLAN_LIMIT;
  
  return {
    isBasicPlan,
    eventsThisMonth,
    limit: FREE_PLAN_LIMIT,
    canCreateEvent,
    loading
  };
}
