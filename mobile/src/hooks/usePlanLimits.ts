import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/eventService';
import { clientService } from '../services/clientService';
import { productService } from '../services/productService';
import { inventoryService } from '../services/inventoryService';
import { startOfMonth, endOfMonth, format } from 'date-fns';

const FREE_PLAN_LIMIT = 3;
const CLIENT_LIMIT = 50;
const CATALOG_LIMIT = 20;

export function usePlanLimits() {
    const { user } = useAuth();
    const [eventsThisMonth, setEventsThisMonth] = useState(0);
    const [clientsCount, setClientsCount] = useState(0);
    const [catalogCount, setCatalogCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkLimits() {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const now = new Date();
                const start = format(startOfMonth(now), 'yyyy-MM-dd');
                const end = format(endOfMonth(now), 'yyyy-MM-dd');

                const isBasic = user.plan === 'basic' || !user.plan;

                if (isBasic) {
                    const [events, clients, products, inventory] = await Promise.all([
                        eventService.getByDateRange(start, end).catch(() => []),
                        clientService.getAll().catch(() => []),
                        productService.getAll().catch(() => []),
                        inventoryService.getAll().catch(() => []),
                    ]);
                    setEventsThisMonth(events?.length || 0);
                    setClientsCount(clients?.length || 0);
                    setCatalogCount((products?.length || 0) + (inventory?.length || 0));
                } else {
                    const events = await eventService.getByDateRange(start, end).catch(() => []);
                    setEventsThisMonth(events?.length || 0);
                }
            } catch (error) {
                console.error('Error fetching plan limits', error);
            } finally {
                setLoading(false);
            }
        }

        checkLimits();
    }, [user]);

    const isBasicPlan = user?.plan === 'basic' || !user?.plan;

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
