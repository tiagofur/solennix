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
import { useTheme } from "../../hooks/useTheme";
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
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);

  const [eventsThisMonthList, setEventsThisMonthList] = useState<EventWithClient[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventWithClient[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [netSalesThisMonth, setNetSalesThisMonth] = useState(0);
  const [cashCollectedThisMonth, setCashCollectedThisMonth] = useState(0);
  const [vatOutstandingThisMonth, setVatOutstandingThisMonth] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [vatCollectedThisMonth, setVatCollectedThisMonth] = useState(0);
  const [cashAppliedToThisMonthsEvents, setCashAppliedToThisMonthsEvents] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    const today = new Date();
    const start = format(startOfMonth(today), "yyyy-MM-dd");
    const end = format(endOfMonth(today), "yyyy-MM-dd");

    setLoading(true);
    setError(null);

    try {
      const [clients, monthEvents, upcoming, inventory] = await Promise.all([
        clientService.getAll().catch((err) => { logError("Error loading clients", err); return []; }),
        eventService.getByDateRange(start, end).catch((err) => { logError("Error loading month events", err); return []; }),
        eventService.getUpcoming(5).catch((err) => { logError("Error loading upcoming events", err); return []; }),
        inventoryService.getAll().catch((err) => { logError("Error loading inventory", err); return []; }),
      ]);

      const clientMap: Record<string, Client> = {};
      (clients || []).forEach((c) => { clientMap[c.id] = c; });

      const addClientToEvents = (events: Event[]) =>
        (events || []).map((e) => ({
          ...e,
          clients: e.client_id ? { name: clientMap[e.client_id]?.name || "Cliente" } : null,
        }));

      // Month events + financials
      const eventsWithClients = addClientToEvents(monthEvents || []);
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
      const [payments, paymentsInMonth] = await Promise.all([
        paymentService.getByEventIds(eventIds).catch(() => []),
        paymentService.getByPaymentDateRange(start, end).catch(() => []),
      ]);

      const paidByEvent: Record<string, number> = {};
      payments.forEach((p: any) => {
        paidByEvent[p.event_id] = (paidByEvent[p.event_id] || 0) + Number(p.amount || 0);
      });

      const cashApplied = Object.values(paidByEvent).reduce((sum, v) => sum + v, 0);
      setCashAppliedToThisMonthsEvents(cashApplied);

      const cashInMonth = (paymentsInMonth || []).reduce(
        (sum: number, p: any) => sum + Number(p.amount || 0),
        0,
      );
      setCashCollectedThisMonth(cashInMonth);

      const vatCollected = realized.reduce((sum, event) => {
        const totalCharged = getEventTotalCharged(event);
        const paid = paidByEvent[event.id] || 0;
        const ratio = totalCharged > 0 ? Math.min(paid / totalCharged, 1) : 0;
        return sum + getEventTaxAmount(event) * ratio;
      }, 0);
      setVatCollectedThisMonth(vatCollected);

      const vatOutstanding = realized.reduce((sum, event) => {
        const totalCharged = getEventTotalCharged(event);
        const paid = paidByEvent[event.id] || 0;
        const ratio = totalCharged > 0 ? Math.min(paid / totalCharged, 1) : 0;
        const vat = getEventTaxAmount(event);
        return sum + (vat - vat * ratio);
      }, 0);
      setVatOutstandingThisMonth(vatOutstanding);

      // Upcoming events
      const upcomingWithClients = addClientToEvents(upcoming || []);
      setUpcomingEvents(upcomingWithClients);

      // Low stock
      const lowItems = (inventory || []).filter(
        (item) => item.minimum_stock > 0 && item.current_stock <= item.minimum_stock,
      );
      setLowStockCount(lowItems.length);
      setLowStockItems(lowItems.slice(0, 5));
    } catch (err) {
      logError("Error loading dashboard", err);
      setError("Error al cargar los datos del dashboard");
    } finally {
      setLoading(false);
    }
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
      { status: "quoted", label: "Cotizado", count: 0, color: palette.statusQuoted },
      { status: "confirmed", label: "Confirmado", count: 0, color: palette.statusConfirmed },
      { status: "completed", label: "Completado", count: 0, color: palette.statusCompleted },
      { status: "cancelled", label: "Cancelado", count: 0, color: palette.statusCancelled },
    ];
    eventsThisMonthList.forEach((e) => {
      const b = buckets.find((s) => s.status === e.status);
      if (b) b.count += 1;
    });
    return buckets.filter((b) => b.count > 0);
  }, [eventsThisMonthList, palette]);

  const maxStatusCount = Math.max(...statusData.map((d) => d.count), 1);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "quoted": return "Cotizado";
      case "confirmed": return "Confirmado";
      case "completed": return "Completado";
      case "cancelled": return "Cancelado";
      default: return status;
    }
  };

  const getStatusColors = (status: string) => {
    switch (status) {
      case "quoted": return { bg: palette.surfaceGrouped, text: palette.textSecondary };
      case "confirmed": return { bg: palette.kpiBlueBg, text: palette.kpiBlue };
      case "completed": return { bg: palette.kpiGreenBg, text: palette.kpiGreen };
      case "cancelled": return { bg: palette.errorBg, text: palette.error };
      default: return { bg: palette.surfaceGrouped, text: palette.textSecondary };
    }
  };

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
            <Search color={palette.textSecondary} size={22} />
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {error && (
          <TouchableOpacity
            style={styles.errorBanner}
            onPress={loadDashboardData}
            activeOpacity={0.8}
          >
            <AlertTriangle color={palette.error} size={16} />
            <Text style={styles.errorBannerText}>{error}</Text>
            <Text style={styles.errorBannerRetry}>Reintentar</Text>
          </TouchableOpacity>
        )}

        {/* Quick Action Buttons */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => navigation.navigate("EventForm", {})}
            activeOpacity={0.7}
          >
            <Plus color={palette.primary} size={16} />
            <Text style={styles.quickActionText}>Evento</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => (navigation as any).navigate("ClientTab")}
            activeOpacity={0.7}
          >
            <UserPlus color={palette.primary} size={16} />
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
            icon={<DollarSign color={palette.kpiGreen} size={20} />}
            iconBgColor={palette.kpiGreenBg}
            title="Ventas netas"
            value={formatCurrency(netSalesThisMonth)}
            loading={loading}
            footer="Confirmados/Completados"
          />
          <KPICard
            icon={<DollarSign color={palette.kpiOrange} size={20} />}
            iconBgColor={palette.kpiOrangeBg}
            title="Cobrado (mes)"
            value={formatCurrency(cashCollectedThisMonth)}
            loading={loading}
            footer={`Aplicado a eventos: ${formatCurrency(cashAppliedToThisMonthsEvents)}`}
          />
          <KPICard
            icon={<FileCheck color={palette.kpiBlue} size={20} />}
            iconBgColor={palette.kpiBlueBg}
            title="IVA cobrado"
            value={formatCurrency(vatCollectedThisMonth)}
            loading={loading}
          />
          <KPICard
            icon={<FileCheck color={palette.kpiBlue} size={20} />}
            iconBgColor={palette.kpiBlueBg}
            title="IVA por cobrar"
            value={formatCurrency(vatOutstandingThisMonth)}
            loading={loading}
          />
          <KPICard
            icon={<Calendar color={palette.kpiOrange} size={20} />}
            iconBgColor={palette.kpiOrangeBg}
            title="Eventos del mes"
            value={String(loading ? "..." : eventsThisMonthList.length)}
            loading={loading}
          />
          <KPICard
            icon={
              <Package
                color={lowStockCount > 0 ? palette.error : palette.kpiGreen}
                size={20}
              />
            }
            iconBgColor={lowStockCount > 0 ? palette.errorBg : palette.kpiGreenBg}
            title="Alertas Stock"
            value={
              loading
                ? "..."
                : lowStockCount > 0
                  ? `${lowStockCount} ítems`
                  : "Todo OK"
            }
            loading={loading}
            valueColor={lowStockCount > 0 ? palette.error : undefined}
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

        {/* Financial Comparison */}
        {!loading && (netSalesThisMonth > 0 || cashCollectedThisMonth > 0 || vatOutstandingThisMonth > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumen Financiero</Text>
            {(() => {
              const financialData = [
                { name: "Ventas Netas", value: netSalesThisMonth, color: palette.kpiGreen },
                { name: "Cobrado Real", value: cashCollectedThisMonth, color: palette.kpiOrange },
                { name: "IVA por Cobrar", value: vatOutstandingThisMonth, color: palette.error },
              ];
              const maxVal = Math.max(...financialData.map((d) => d.value), 1);
              return (
                <View style={styles.chartContainer}>
                  {financialData.map((d) => (
                    <View key={d.name} style={styles.chartRow}>
                      <Text style={[styles.chartLabel, { width: 90 }]} numberOfLines={1}>{d.name}</Text>
                      <View style={styles.barBg}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              backgroundColor: d.color,
                              width: `${(d.value / maxVal) * 100}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.chartValue, { width: 70, fontSize: 11 }]} numberOfLines={1}>
                        {formatCurrency(d.value)}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })()}
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
                <AlertTriangle color={palette.error} size={18} />
                <Text style={styles.sectionTitle}>Reponer Inventario</Text>
              </View>
              <TouchableOpacity onPress={() => (navigation as any).navigate("InventoryStack")}>
                <Text style={styles.sectionLink}>Ver inventario</Text>
              </TouchableOpacity>
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
            <TouchableOpacity onPress={() => (navigation as any).navigate("CalendarTab")}>
              <Text style={styles.sectionLink}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
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
                      flexWrap: "wrap",
                    }}
                  >
                    <Text style={styles.eventType}>{event.service_type}</Text>
                    <Text style={styles.eventPax}>{event.num_people} pax</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColors(event.status).bg }]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusColors(event.status).text }]}>
                        {getStatusLabel(event.status)}
                      </Text>
                    </View>
                  </View>
                </View>
                <ChevronRight color={palette.textTertiary} size={20} />
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

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surfaceGrouped,
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
    color: palette.text,
  },
  date: {
    ...typography.subheadline,
    color: palette.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.card,
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
    backgroundColor: palette.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.full,
    ...shadows.sm,
  },
  quickActionText: {
    ...typography.subheadline,
    color: palette.primary,
    fontWeight: "600",
  },
  kpiRow: {
    paddingRight: spacing.lg,
  },
  section: {
    backgroundColor: palette.card,
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
    color: palette.text,
  },
  placeholder: {
    ...typography.body,
    color: palette.textTertiary,
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
    color: palette.textSecondary,
    width: 80,
  },
  barBg: {
    flex: 1,
    height: 16,
    backgroundColor: palette.surfaceGrouped,
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
    color: palette.text,
    width: 24,
    textAlign: "right",
  },
  // Stock alerts
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.separator,
    gap: spacing.sm,
  },
  stockName: {
    ...typography.subheadline,
    color: palette.text,
    flex: 1,
  },
  stockBadge: {
    backgroundColor: palette.errorBg,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: spacing.borderRadius.full,
  },
  stockBadgeText: {
    ...typography.caption1,
    color: palette.error,
    fontWeight: "700",
  },
  stockMin: {
    ...typography.caption1,
    color: palette.textTertiary,
    width: 60,
    textAlign: "right",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: palette.errorBg,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    ...typography.subheadline,
    color: palette.error,
    flex: 1,
  },
  errorBannerRetry: {
    ...typography.subheadline,
    color: palette.error,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  // Events
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.separator,
    gap: spacing.sm,
  },
  eventDateBox: {
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: palette.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  eventMonth: {
    fontSize: 9,
    fontWeight: "700",
    color: palette.primary,
    letterSpacing: 0.5,
  },
  eventDay: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.primary,
    lineHeight: 20,
  },
  eventInfo: {
    flex: 1,
  },
  eventClient: {
    ...typography.headline,
    fontSize: 15,
    color: palette.text,
  },
  eventType: {
    ...typography.caption2,
    color: palette.textSecondary,
    backgroundColor: palette.surfaceGrouped,
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
    color: palette.textTertiary,
  },
  statusBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: spacing.borderRadius.full,
  },
  statusBadgeText: {
    ...typography.caption2,
    fontWeight: "600",
    fontSize: 10,
  },
  sectionLink: {
    ...typography.subheadline,
    color: palette.primary,
    fontWeight: "600",
  },
});
