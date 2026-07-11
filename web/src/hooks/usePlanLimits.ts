import { useAuth } from '../contexts/AuthContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { useEventsByDateRange } from './queries/useEventQueries';
import { useClients } from './queries/useClientQueries';
import { useProducts } from './queries/useProductQueries';
import { useInventoryItems } from './queries/useInventoryQueries';

const FREE_PLAN_EVENT_LIMIT = 4;
const CLIENT_LIMIT = 20;
const PRODUCT_LIMIT = 15;
const INVENTORY_LIMIT = 30;
const CATALOG_LIMIT = 20;

export function usePlanLimits() {
  const { user } = useAuth();
  const isBasicPlan = user?.plan === 'basic' || !user?.plan;

  const now = new Date();
  const start = format(startOfMonth(now), 'yyyy-MM-dd');
  const end = format(endOfMonth(now), 'yyyy-MM-dd');

  // NOTE: ?? [] instead of = [] — destructuring defaults only catch undefined, not null
  const { data: _monthEvents, isLoading: eventsLoading } = useEventsByDateRange(start, end);
  const { data: _clients, isLoading: clientsLoading } = useClients();
  const { data: _products, isLoading: productsLoading } = useProducts();
  const { data: _inventory, isLoading: inventoryLoading } = useInventoryItems();

  const monthEvents = _monthEvents ?? [];
  const clientList = _clients ?? [];
  const productList = _products ?? [];
  const inventoryList = _inventory ?? [];

  const eventsThisMonth = monthEvents.length;
  const clientsCount = clientList.length;
  const productsCount = productList.length;
  const inventoryCount = inventoryList.length;

  const loading = eventsLoading || (isBasicPlan && (clientsLoading || productsLoading || inventoryLoading));

  const catalogTotal = productsCount + inventoryCount;

  const canCreateEvent = !isBasicPlan || eventsThisMonth < FREE_PLAN_EVENT_LIMIT;
  const canCreateClient = !isBasicPlan || clientsCount < CLIENT_LIMIT;
  const canCreateProduct =
    !isBasicPlan || (productsCount < PRODUCT_LIMIT && catalogTotal < CATALOG_LIMIT);
  const canCreateInventoryItem =
    !isBasicPlan || (inventoryCount < INVENTORY_LIMIT && catalogTotal < CATALOG_LIMIT);

  return {
    isBasicPlan,
    eventsThisMonth,
    eventLimit: FREE_PLAN_EVENT_LIMIT,
    clientsCount,
    clientLimit: CLIENT_LIMIT,
    productsCount,
    productLimit: PRODUCT_LIMIT,
    inventoryCount,
    inventoryLimit: INVENTORY_LIMIT,
    catalogTotal,
    catalogLimit: CATALOG_LIMIT,
    canCreateEvent,
    canCreateClient,
    canCreateProduct,
    canCreateInventoryItem,
    loading,
  };
}
