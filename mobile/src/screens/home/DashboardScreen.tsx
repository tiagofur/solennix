import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import {
  DollarSign,
  Calendar,
  Package,
  AlertTriangle,
  Search,
  ChevronRight,
  FileCheck,
  Plus,
  UserPlus,
} from "lucide-react-native";
import { HomeStackParamList } from "../../types/navigation";
import { Event, Payment, InventoryItem, Client } from "../../types/entities";
import { useAuth } from "../../contexts/AuthContext";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import { eventService } from "../../services/eventService";
import { inventoryService } from "../../services/inventoryService";
import { paymentService } from "../../services/paymentService";
import { clientService } from "../../services/clientService";
import {
  getEventNetSales,
  getEventTaxAmount,
  getEventTotalCharged,
} from "../../lib/finance";
import { logError } from "../../lib/errorHandler";
import { KPICard, UpgradeBanner, EmptyState } from "../../components/shared";
import OnboardingChecklist from "../../components/OnboardingChecklist";
import PendingEventsModal from "../../components/PendingEventsModal";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

type EventWithClient = Event & {
  clients?: { name: string } | null;
};

type Props = NativeStackScreenProps<HomeStackParamList, "Dashboard">;

export default function DashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { isBasicPlan, canCreateEvent, eventsThisMonth, limit } =
    usePlanLimits();
  const firstName = user?.name ? user.name.split(" ")[0] : "Usuario";

  const [eventsThisMonthList, setEventsThisMonthList] = useState<EventWithClient[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventWithClient[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [netSalesThisMonth, setNetSalesThisMonth] = useState(0);
  const [cashCollectedThisMonth, setCashCollectedThisMonth] = useState(0);
  const [vatOutstandingThisMonth, setVatOutstandingThisMonth] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async () => {
    const today = new Date();
    const start = format(startOfMonth(today), "yyyy-MM-dd");
    const end = format(endOfMonth(today), "yyyy-MM-dd");

    setLoadingMonth(true);
    setLoadingUpcoming(true);
    setLoadingInventory(true);

    const clients = await clientService.getAll();
    const clientMap: Record<string, Client> = {};
    (clients || []).forEach((c) => {
      clientMap[c.id] = c;
    });

    const addClientToEvents = (events: Event[]) => {
      return (events || []).map((e) => ({
        ...e,
        clients: e.client_id ? { name: clientMap[e.client_id]?.name || "Cliente" } : null,
      }));
    };

    eventService
      .getByDateRange(start, end)
      .then(async (data) => {
        const eventsWithClients = addClientToEvents(data || []);
        setEventsThisMonthList(eventsWithClients);

        const realized = eventsWithClients.filter(
          (e) => e.status === "confirmed" || e.status === "completed",
        );
        const netSales = realized.reduce(
          (sum, event) => sum + getEventNetSales(event),
          0,
        );
        setNetSalesThisMonth(netSales);

        const eventIds = realized.map((e) => e.id);
        const payments = await paymentService.getByEventIds(eventIds);
        const paidByEvent: Record<string, number> = {};
        payments.forEach((p: any) => {
          paidByEvent[p.event_id] =
            (paidByEvent[p.event_id] || 0) + Number(p.amount || 0);
        });

        const paymentsInMonth = await paymentService.getByPaymentDateRange(
          start,
          end,
        );
        const cashInMonth = (paymentsInMonth || []).reduce(
          (sum: number, p: any) => sum + Number(p.amount || 0),
          0,
        );
        setCashCollectedThisMonth(cashInMonth);

        const vatOutstanding = realized.reduce((sum, event) => {
          const totalCharged = getEventTotalCharged(event);
          const paid = paidByEvent[event.id] || 0;
          const ratio = totalCharged > 0 ? Math.min(paid / totalCharged, 1) : 0;
          const vat = getEventTaxAmount(event);
          return sum + (vat - vat * ratio);
        }, 0);
        setVatOutstandingThisMonth(vatOutstanding);
      })
      .catch((err) => logError("Error loading month events", err))
      .finally(() => setLoadingMonth(false));

    eventService
      .getUpcoming(5)
      .then((data) => {
        const eventsWithClients = addClientToEvents(data || []);
        setUpcomingEvents(eventsWithClients);
      })
      .catch((err) => logError("Error loading upcoming events", err))
      .finally(() => setLoadingUpcoming(false));

    inventoryService
      .getAll()
      .then((data) => {
        const items = (data || []).filter(
          (item) => item.current_stock <= item.minimum_stock,
        );
        setLowStockCount(items.length);
        setLowStockItems(items.slice(0, 5));
      })
      .catch((err) => logError("Error loading inventory", err))
      .finally(() => setLoadingInventory(false));
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  const formatCurrency = (n: number) =>
    `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  const statusData = useMemo(() => {
    if (!eventsThisMonthList.length) return [];
    const buckets = [
      { status: "quoted", label: "Cotizado", count: 0, color: colors.light.statusQuoted },
      { status: "confirmed", label: "Confirmado", count: 0, color: colors.light.statusConfirmed },
      { status: "completed", label: "Completado", count: 0, color: colors.light.statusCompleted },
      { status: "cancelled", label: "Cancelado", count: 0, color: colors.light.statusCancelled },
    ];
    eventsThisMonthList.forEach((e) => {
      const b = buckets.find((s) => s.status === e.status);
      if (b) b.count += 1;
    });
    return buckets.filter((b) => b.count > 0);
  }, [eventsThisMonthList]);

  const maxStatusCount = Math.max(...statusData.map((d) => d.count), 1);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Hola, {firstName}</Text>
            <Text style={styles.date}>
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", {
                locale: es,
              })}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => (navigation as any).navigate("SearchScreen")}
          >
            <Search color={colors.light.textSecondary} size={22} />
          </TouchableOpacity>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => navigation.navigate("EventForm", {})}
            activeOpacity={0.7}
          >
            <Plus color={colors.light.primary} size={16} />
            <Text style={styles.quickActionText}>Evento</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => (navigation as any).navigate("ClientTab")}
            activeOpacity={0.7}
          >
            <UserPlus color={colors.light.primary} size={16} />
            <Text style={styles.quickActionText}>Cliente</Text>
          </TouchableOpacity>
        </View>

        {/* Onboarding Checklist */}
        <OnboardingChecklist
          onNavigate={(screen) => {
            if (screen === "EventForm") {
              navigation.navigate("EventForm", {});
            } else {
              (navigation as any).navigate(screen);
            }
          }}
        />

        {/* Upgrade Banner */}
        {isBasicPlan && (
          <View style={{ marginBottom: spacing.md }}>
            <UpgradeBanner
              type={!canCreateEvent ? "limit-reached" : "upsell"}
              currentUsage={eventsThisMonth}
              limit={limit}
            />
          </View>
        )}

        {/* KPI Cards - Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiRow}
          style={{ marginBottom: spacing.lg }}
        >
          <KPICard
            icon={<DollarSign color={colors.light.kpiGreen} size={20} />}
            iconBgColor={colors.light.kpiGreenBg}
            title="Ventas netas"
            value={formatCurrency(netSalesThisMonth)}
            loading={loadingMonth}
            footer="Confirmados/Completados"
          />
          <KPICard
            icon={<DollarSign color={colors.light.kpiOrange} size={20} />}
            iconBgColor={colors.light.kpiOrangeBg}
            title="Cobrado (mes)"
            value={formatCurrency(cashCollectedThisMonth)}
            loading={loadingMonth}
          />
          <KPICard
            icon={<FileCheck color={colors.light.kpiBlue} size={20} />}
            iconBgColor={colors.light.kpiBlueBg}
            title="IVA por cobrar"
            value={formatCurrency(vatOutstandingThisMonth)}
            loading={loadingMonth}
          />
          <KPICard
            icon={<Calendar color={colors.light.kpiOrange} size={20} />}
            iconBgColor={colors.light.kpiOrangeBg}
            title="Eventos del mes"
            value={String(loadingMonth ? "..." : eventsThisMonthList.length)}
            loading={loadingMonth}
          />
          <KPICard
            icon={
              <Package
                color={lowStockCount > 0 ? colors.light.error : colors.light.kpiGreen}
                size={20}
              />
            }
            iconBgColor={lowStockCount > 0 ? colors.light.errorBg : colors.light.kpiGreenBg}
            title="Alertas Stock"
            value={
              loadingInventory
                ? "..."
                : lowStockCount > 0
                  ? `${lowStockCount} ítems`
                  : "Todo OK"
            }
            loading={loadingInventory}
            valueColor={lowStockCount > 0 ? colors.light.error : undefined}
          />
        </ScrollView>

        {/* Event Status Mini Chart */}
        {statusData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Estado de Eventos (Este Mes)
            </Text>
            <View style={styles.chartContainer}>
              {statusData.map((d) => (
                <View key={d.status} style={styles.chartRow}>
                  <Text style={styles.chartLabel}>{d.label}</Text>
                  <View style={styles.barBg}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          backgroundColor: d.color,
                          width: `${(d.count / maxStatusCount) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartValue}>{d.count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.xs,
                }}
              >
                <AlertTriangle color={colors.light.error} size={18} />
                <Text style={styles.sectionTitle}>Reponer Inventario</Text>
              </View>
            </View>
            {lowStockItems.map((item) => (
              <View key={item.id} style={styles.stockRow}>
                <Text style={styles.stockName} numberOfLines={1}>
                  {item.ingredient_name}
                </Text>
                <View style={styles.stockBadge}>
                  <Text style={styles.stockBadgeText}>
                    {item.current_stock} {item.unit}
                  </Text>
                </View>
                <Text style={styles.stockMin}>mín: {item.minimum_stock}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Upcoming Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Próximos Eventos</Text>
          </View>

          {loadingUpcoming ? (
            <Text style={styles.placeholder}>Cargando...</Text>
          ) : upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventRow}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate("EventDetail", { id: event.id })
                }
              >
                <View style={styles.eventDateBox}>
                  <Text style={styles.eventMonth}>
                    {format(parseISO(event.event_date), "MMM", {
                      locale: es,
                    }).toUpperCase()}
                  </Text>
                  <Text style={styles.eventDay}>
                    {format(parseISO(event.event_date), "d")}
                  </Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventClient} numberOfLines={1}>
                    {(event as EventWithClient).clients?.name || "Sin cliente"}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing.xs,
                    }}
                  >
                    <Text style={styles.eventType}>{event.service_type}</Text>
                    <Text style={styles.eventPax}>{event.num_people} pax</Text>
                  </View>
                </View>
                <ChevronRight color={colors.light.textTertiary} size={20} />
              </TouchableOpacity>
            ))
          ) : (
            <EmptyState
              title="Sin eventos próximos"
              description="No hay eventos agendados."
            />
          )}
        </View>
      </ScrollView>

      <PendingEventsModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.surfaceGrouped,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  greeting: {
    ...typography.largeTitle,
    color: colors.light.text,
  },
  date: {
    ...typography.subheadline,
    color: colors.light.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.light.card,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.sm,
  },
  quickActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.light.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.full,
    ...shadows.sm,
  },
  quickActionText: {
    ...typography.subheadline,
    color: colors.light.primary,
    fontWeight: "600",
  },
  kpiRow: {
    paddingRight: spacing.lg,
  },
  section: {
    backgroundColor: colors.light.card,
    borderRadius: spacing.borderRadius.lg,
    ...shadows.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.light.text,
  },
  placeholder: {
    ...typography.body,
    color: colors.light.textTertiary,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  // Chart
  chartContainer: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  chartLabel: {
    ...typography.caption1,
    color: colors.light.textSecondary,
    width: 80,
  },
  barBg: {
    flex: 1,
    height: 16,
    backgroundColor: colors.light.surfaceGrouped,
    borderRadius: spacing.borderRadius.sm,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: spacing.borderRadius.sm,
  },
  chartValue: {
    ...typography.headline,
    fontSize: 14,
    color: colors.light.text,
    width: 24,
    textAlign: "right",
  },
  // Stock alerts
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.separator,
    gap: spacing.sm,
  },
  stockName: {
    ...typography.subheadline,
    color: colors.light.text,
    flex: 1,
  },
  stockBadge: {
    backgroundColor: colors.light.errorBg,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: spacing.borderRadius.full,
  },
  stockBadgeText: {
    ...typography.caption1,
    color: colors.light.error,
    fontWeight: "700",
  },
  stockMin: {
    ...typography.caption1,
    color: colors.light.textTertiary,
    width: 60,
    textAlign: "right",
  },
  // Events
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.separator,
    gap: spacing.sm,
  },
  eventDateBox: {
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.light.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  eventMonth: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.light.primary,
    letterSpacing: 0.5,
  },
  eventDay: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.light.primary,
    lineHeight: 20,
  },
  eventInfo: {
    flex: 1,
  },
  eventClient: {
    ...typography.headline,
    fontSize: 15,
    color: colors.light.text,
  },
  eventType: {
    ...typography.caption2,
    color: colors.light.textSecondary,
    backgroundColor: colors.light.surfaceGrouped,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: spacing.borderRadius.sm,
    overflow: "hidden",
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  eventPax: {
    ...typography.caption1,
    color: colors.light.textTertiary,
  },
});
