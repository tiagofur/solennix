import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { useEventsByDateRange } from './queries/useEventQueries';
import { useClients } from './queries/useClientQueries';
import { useProducts } from './queries/useProductQueries';
import { useInventoryItems } from './queries/useInventoryQueries';

const FREE_PLAN_LIMIT = 3;
const CLIENT_LIMIT = 50;
const CATALOG_LIMIT = 20;

export function usePlanLimits() {
  const { user } = useAuth();
  const isBasicPlan = user?.plan === 'basic' || !user?.plan;

  const now = useMemo(() => new Date(), []);
  const start = useMemo(() => format(startOfMonth(now), 'yyyy-MM-dd'), [now]);
  const end = useMemo(() => format(endOfMonth(now), 'yyyy-MM-dd'), [now]);

  // These queries share cache with list pages — zero additional requests
  // if Dashboard, EventList, ClientList, etc. have already fetched them
  const { data: monthEvents = [], isLoading: eventsLoading } = useEventsByDateRange(start, end);
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: inventory = [], isLoading: inventoryLoading } = useInventoryItems();

  const eventsThisMonth = monthEvents.length;
  const clientsCount = clients.length;
  const catalogCount = products.length + inventory.length;

  const loading = eventsLoading || (isBasicPlan && (clientsLoading || productsLoading || inventoryLoading));

  const canCreateEvent = !isBasicPlan || eventsThisMonth < FREE_PLAN_LIMIT;
  const canCreateClient = !isBasicPlan || clientsCount < CLIENT_LIMIT;
  const canCreateCatalogItem = !isBasicPlan || catalogCount < CATALOG_LIMIT;

  return {
    isBasicPlan,
    eventsThisMonth,
    limit: FREE_PLAN_LIMIT,
    clientsCount,
    clientLimit: CLIENT_LIMIT,
    catalogCount,
    catalogLimit: CATALOG_LIMIT,
    canCreateEvent,
    canCreateClient,
    canCreateCatalogItem,
    loading,
  };
}
