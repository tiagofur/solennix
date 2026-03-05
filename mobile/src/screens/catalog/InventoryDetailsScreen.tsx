import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Edit2,
  Trash2,
  Package,
  DollarSign,
  TrendingDown,
  PackageCheck,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Wrench,
  ShoppingCart,
} from "lucide-react-native";
import { format, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { InventoryStackParamList } from "../../types/navigation";
import { InventoryItem } from "../../types/entities";
import { inventoryService } from "../../services/inventoryService";
import { productService } from "../../services/productService";
import { eventService } from "../../services/eventService";
import { useToast } from "../../hooks/useToast";
import { logError } from "../../lib/errorHandler";
import { LoadingSpinner, ConfirmDialog, EmptyState } from "../../components/shared";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

type Props = NativeStackScreenProps<InventoryStackParamList, "InventoryDetail">;

type DemandEntry = { date: string; quantity: number };

export default function InventoryDetailsScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const addToast = useToast((s) => s.addToast);
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [demandForecast, setDemandForecast] = useState<DemandEntry[]>([]);
  const [demandLoading, setDemandLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const loadDemandForecast = useCallback(async (itemId: string) => {
    try {
      setDemandLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const allEvents = await eventService.getAll();
      const upcoming = allEvents.filter(
        (e) => e.status === "confirmed" && new Date(e.event_date) >= today,
      );

      if (upcoming.length === 0) {
        setDemandForecast([]);
        return;
      }

      // Gather all product IDs from upcoming events
      const eventProductsMap: Record<string, { productId: string; quantity: number }[]> = {};
      await Promise.all(
        upcoming.map(async (event) => {
          try {
            const products = await eventService.getProducts(event.id);
            eventProductsMap[event.id] = (products || []).map((p: any) => ({
              productId: p.product_id,
              quantity: p.quantity,
            }));
          } catch {
            eventProductsMap[event.id] = [];
          }
        }),
      );

      const allProductIds = [
        ...new Set(
          Object.values(eventProductsMap).flatMap((ps) => ps.map((p) => p.productId)),
        ),
      ];

      if (allProductIds.length === 0) {
        setDemandForecast([]);
        return;
      }

      // Batch fetch ingredients
      const allIngredients = await productService.getIngredientsForProducts(allProductIds);

      // Map productId → quantity_required for THIS inventory item
      const productDemandMap: Record<string, number> = {};
      for (const ing of allIngredients || []) {
        if (ing.inventory_id === itemId) {
          productDemandMap[ing.product_id] =
            (productDemandMap[ing.product_id] || 0) + ing.quantity_required;
        }
      }

      // Calculate demand per event date
      const demandByDate: Record<string, number> = {};
      for (const event of upcoming) {
        const products = eventProductsMap[event.id] || [];
        let eventDemand = 0;
        for (const ep of products) {
          const perUnit = productDemandMap[ep.productId] || 0;
          eventDemand += perUnit * ep.quantity;
        }
        if (eventDemand > 0) {
          const dateKey = event.event_date.slice(0, 10);
          demandByDate[dateKey] = (demandByDate[dateKey] || 0) + eventDemand;
        }
      }

      const forecast = Object.entries(demandByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, quantity]) => ({ date, quantity }));

      setDemandForecast(forecast);
    } catch (err) {
      logError("Error loading demand forecast", err);
    } finally {
      setDemandLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const data = await inventoryService.getById(id);
      setItem(data);
      loadDemandForecast(id);
    } catch (err) {
      logError("Error loading inventory item", err);
      addToast("Error al cargar ítem", "error");
    } finally {
      setLoading(false);
    }
  }, [id, addToast, loadDemandForecast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleDelete = useCallback(async () => {
    try {
      await inventoryService.delete(id);
      addToast("Ítem eliminado", "success");
      navigation.goBack();
    } catch (err) {
      logError("Error deleting inventory item", err);
      addToast("Error al eliminar ítem", "error");
    } finally {
      setShowDelete(false);
    }
  }, [id, addToast, navigation]);

  const fmtQty = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(2));
  const formatCurrency = (n: number) =>
    `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  if (loading) return <LoadingSpinner />;
  if (!item) {
    return (
      <EmptyState
        title="Ítem no encontrado"
        description="No se pudo cargar la información del ítem."
      />
    );
  }

  const isLowStock = item.minimum_stock > 0 && item.current_stock <= item.minimum_stock;
  const stockValue = item.current_stock * (item.unit_cost || 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  const demand7Days = demandForecast
    .filter((d) => {
      const date = new Date(d.date + "T00:00:00");
      return date >= today && date <= in7Days;
    })
    .reduce((sum, d) => sum + d.quantity, 0);

  const totalDemand = demandForecast.reduce((sum, d) => sum + d.quantity, 0);
  const stockAfter7Days = item.current_stock - demand7Days;

  // Alert severity
  const alertLevel =
    demand7Days > 0 && stockAfter7Days < 0
      ? "critical"
      : demand7Days > 0 && stockAfter7Days < item.minimum_stock
      ? "warning"
      : isLowStock && demand7Days === 0
      ? "critical"
      : "ok";

  const alertColors = {
    critical: { bg: palette.errorBg, border: palette.error + "50", icon: palette.error, text: palette.error },
    warning: { bg: palette.warningBg, border: palette.warning + "50", icon: palette.warning, text: palette.warning },
    ok: { bg: palette.card, border: palette.separator, icon: palette.success, text: palette.success },
  }[alertLevel];

  const typeIcon = item.type === "equipment" ? (
    <Wrench color={palette.info} size={16} />
  ) : (
    <ShoppingCart color={palette.primary} size={16} />
  );
  const typeBg = item.type === "equipment" ? palette.infoBg : palette.primaryLight;
  const typeColor = item.type === "equipment" ? palette.info : palette.primary;

  // Stock bar calculations
  const maxBar = Math.max(item.current_stock, item.minimum_stock, demand7Days, 1);
  const stockPct = Math.min(100, (item.current_stock / maxBar) * 100);
  const minPct = Math.min(100, (item.minimum_stock / maxBar) * 100);
  const demandPct = Math.min(100, (demand7Days / maxBar) * 100);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={[styles.typeIconBox, { backgroundColor: typeBg }]}>
            {typeIcon}
          </View>
          <Text style={styles.itemName}>{item.ingredient_name}</Text>
          <View style={[styles.typeBadge, { backgroundColor: typeBg }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>
              {item.type === "equipment" ? "Activo / Equipo" : "Insumo Consumible"}
            </Text>
          </View>
          {isLowStock && (
            <View style={styles.lowStockBadge}>
              <AlertTriangle color={palette.error} size={12} />
              <Text style={styles.lowStockText}>Stock bajo</Text>
            </View>
          )}
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: isLowStock ? palette.errorBg : palette.card }]}>
            <View style={styles.kpiHeader}>
              <Package color={isLowStock ? palette.error : palette.primary} size={13} />
              <Text style={styles.kpiLabel}>Stock Actual</Text>
            </View>
            <Text style={[styles.kpiValue, { color: isLowStock ? palette.error : palette.text }]}>
              {fmtQty(item.current_stock)}
            </Text>
            <Text style={styles.kpiSub}>{item.unit}</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: palette.card }]}>
            <View style={styles.kpiHeader}>
              <TrendingDown color={palette.textSecondary} size={13} />
              <Text style={styles.kpiLabel}>Stock Mín.</Text>
            </View>
            <Text style={styles.kpiValue}>{fmtQty(item.minimum_stock)}</Text>
            <Text style={styles.kpiSub}>{item.unit}</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: palette.card }]}>
            <View style={styles.kpiHeader}>
              <DollarSign color={palette.primary} size={13} />
              <Text style={styles.kpiLabel}>Costo Unit.</Text>
            </View>
            <Text style={styles.kpiValue}>
              {item.unit_cost ? formatCurrency(item.unit_cost) : "—"}
            </Text>
            <Text style={styles.kpiSub}>por {item.unit}</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: palette.card }]}>
            <View style={styles.kpiHeader}>
              <PackageCheck color={palette.primary} size={13} />
              <Text style={styles.kpiLabel}>Valor Stock</Text>
            </View>
            <Text style={styles.kpiValue}>{formatCurrency(stockValue)}</Text>
            <Text style={styles.kpiSub}>total</Text>
          </View>
        </View>

        {/* Smart Alert */}
        {!demandLoading && (
          <View
            style={[
              styles.alertCard,
              { backgroundColor: alertColors.bg, borderColor: alertColors.border },
            ]}
          >
            <View style={styles.alertIconWrap}>
              {alertLevel === "ok" ? (
                <CheckCircle color={alertColors.icon} size={20} />
              ) : (
                <AlertTriangle color={alertColors.icon} size={20} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: alertColors.text }]}>
                {demand7Days > 0 && stockAfter7Days < 0
                  ? "¡Stock insuficiente para los próximos 7 días!"
                  : demand7Days > 0 && stockAfter7Days < item.minimum_stock
                  ? "Stock quedará bajo el mínimo tras eventos próximos"
                  : isLowStock && demand7Days === 0
                  ? "Stock por debajo del mínimo recomendado"
                  : demand7Days > 0
                  ? "Stock suficiente para los próximos 7 días"
                  : "Sin demanda en los próximos 7 días"}
              </Text>
              <Text style={styles.alertBody}>
                {demand7Days > 0
                  ? `Necesitas ${fmtQty(demand7Days)} ${item.unit} esta semana. Tienes ${item.current_stock} ${item.unit}.${stockAfter7Days < 0 ? ` Faltan ${fmtQty(Math.abs(stockAfter7Days))} ${item.unit}.` : ""}`
                  : isLowStock
                  ? `Tu stock (${item.current_stock} ${item.unit}) está por debajo del mínimo (${item.minimum_stock} ${item.unit}).`
                  : "No hay eventos confirmados que requieran este ítem en los próximos 7 días."}
              </Text>
            </View>
          </View>
        )}

        {/* Demand Forecast */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar color={palette.primary} size={16} />
            <Text style={styles.sectionTitle}>Demanda por Fecha</Text>
            <Text style={styles.sectionSub}>Confirmados</Text>
          </View>

          {demandLoading ? (
            [1, 2, 3].map((i) => (
              <View key={i} style={[styles.skeletonRow, { backgroundColor: palette.surface }]} />
            ))
          ) : demandForecast.length === 0 ? (
            <Text style={styles.emptyText}>
              Sin eventos confirmados que usen este ítem.
            </Text>
          ) : (
            <>
              {demandForecast.map(({ date, quantity }) => {
                const dateObj = new Date(date + "T00:00:00");
                const diffDays = differenceInCalendarDays(dateObj, today);

                // Calculate accumulated demand up to this date
                const accumulated = demandForecast
                  .filter((d) => new Date(d.date + "T00:00:00") <= dateObj)
                  .reduce((s, d) => s + d.quantity, 0);
                const stockAtDate = item.current_stock - accumulated + quantity;
                const isUrgent = stockAtDate < quantity;

                const rowBg = isUrgent
                  ? palette.errorBg
                  : diffDays <= 7
                  ? palette.warningBg
                  : palette.surface;
                const dotColor = isUrgent
                  ? palette.error
                  : diffDays <= 7
                  ? palette.warning
                  : palette.primary + "66";

                return (
                  <View
                    key={date}
                    style={[styles.demandRow, { backgroundColor: rowBg }]}
                  >
                    <View style={[styles.demandDot, { backgroundColor: dotColor }]} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.demandDateRow}>
                        <Text style={styles.demandDate}>
                          {format(dateObj, "d MMM", { locale: es })}
                        </Text>
                        {diffDays === 0 && (
                          <View style={[styles.urgencyBadge, { backgroundColor: palette.primaryLight }]}>
                            <Text style={[styles.urgencyText, { color: palette.primary }]}>Hoy</Text>
                          </View>
                        )}
                        {diffDays === 1 && (
                          <View style={[styles.urgencyBadge, { backgroundColor: palette.warningBg }]}>
                            <Text style={[styles.urgencyText, { color: palette.warning }]}>Mañana</Text>
                          </View>
                        )}
                        {diffDays > 1 && diffDays <= 7 && (
                          <Text style={[styles.urgencyText, { color: palette.textSecondary }]}>
                            en {diffDays} días
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text style={[styles.demandQty, { color: isUrgent ? palette.error : palette.text }]}>
                      {fmtQty(quantity)} {item.unit}
                    </Text>
                  </View>
                );
              })}

              {totalDemand > 0 && (
                <View style={styles.demandTotal}>
                  <Text style={styles.demandTotalLabel}>Total demanda</Text>
                  <Text style={styles.demandTotalValue}>
                    {fmtQty(totalDemand)} {item.unit}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Stock Level Bars */}
        <View style={styles.section}>
          <Text style={styles.barsTitle}>Nivel de Stock</Text>

          <View style={styles.barGroup}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>Stock actual</Text>
              <Text style={styles.barValue}>
                {fmtQty(item.current_stock)} {item.unit}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${stockPct}%` as any, backgroundColor: isLowStock ? palette.error : palette.primary },
                ]}
              />
            </View>
          </View>

          <View style={styles.barGroup}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>Mínimo recomendado</Text>
              <Text style={styles.barValue}>
                {fmtQty(item.minimum_stock)} {item.unit}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[styles.barFill, { width: `${minPct}%` as any, backgroundColor: palette.warning }]}
              />
            </View>
          </View>

          {!demandLoading && demand7Days > 0 && (
            <View style={styles.barGroup}>
              <View style={styles.barLabelRow}>
                <Text style={styles.barLabel}>Demanda próx. 7 días</Text>
                <Text style={styles.barValue}>
                  {fmtQty(demand7Days)} {item.unit}
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${demandPct}%` as any,
                      backgroundColor: stockAfter7Days < 0 ? palette.error : palette.warning,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate("InventoryForm", { id })}
          >
            <Edit2 color={palette.primary} size={18} />
            <Text style={[styles.actionText, { color: palette.primary }]}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => setShowDelete(true)}
          >
            <Trash2 color={palette.error} size={18} />
            <Text style={[styles.actionText, { color: palette.error }]}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={showDelete}
        title="Eliminar ítem"
        description={`¿Eliminar "${item.ingredient_name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </SafeAreaView>
  );
}

const getStyles = (palette: typeof colors.light) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.surfaceGrouped },
    content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

    // Header card
    headerCard: {
      alignItems: "center",
      backgroundColor: palette.card,
      borderRadius: spacing.borderRadius.xl,
      ...shadows.sm,
      padding: spacing.xl,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    typeIconBox: {
      width: 56,
      height: 56,
      borderRadius: spacing.borderRadius.xl,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    itemName: { ...typography.h2, color: palette.text, textAlign: "center", marginBottom: spacing.sm },
    typeBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: spacing.borderRadius.full,
      marginBottom: spacing.xs,
    },
    typeText: { ...typography.caption, fontWeight: "700", fontSize: 11 },
    lowStockBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: palette.errorBg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: spacing.borderRadius.full,
      marginTop: spacing.xs,
    },
    lowStockText: { ...typography.caption, color: palette.error, fontWeight: "700" },

    // KPI row
    kpiRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
    kpiCard: {
      flex: 1,
      borderRadius: spacing.borderRadius.lg,
      padding: spacing.sm,
      ...shadows.sm,
    },
    kpiHeader: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 4 },
    kpiLabel: { ...typography.caption, color: palette.textSecondary, fontSize: 9, fontWeight: "700", flex: 1 },
    kpiValue: { ...typography.headline, color: palette.text, fontSize: 14, fontWeight: "800" },
    kpiSub: { ...typography.caption, color: palette.textTertiary, fontSize: 9, marginTop: 1 },

    // Smart alert
    alertCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: spacing.borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    alertIconWrap: { marginTop: 1 },
    alertTitle: { ...typography.subheadline, fontWeight: "700", marginBottom: 2 },
    alertBody: { ...typography.bodySmall, color: palette.textSecondary },

    // Section
    section: {
      backgroundColor: palette.card,
      borderRadius: spacing.borderRadius.lg,
      ...shadows.sm,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      marginBottom: spacing.sm,
      paddingBottom: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.separator,
    },
    sectionTitle: { ...typography.headline, color: palette.text, flex: 1 },
    sectionSub: { ...typography.caption, color: palette.textTertiary },

    // Demand
    skeletonRow: {
      height: 40,
      borderRadius: spacing.borderRadius.md,
      marginBottom: spacing.xs,
    },
    demandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.sm + 2,
      borderRadius: spacing.borderRadius.md,
      marginBottom: spacing.xs,
    },
    demandDot: { width: 8, height: 8, borderRadius: 4 },
    demandDateRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    demandDate: { ...typography.subheadline, color: palette.text, fontSize: 13 },
    urgencyBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: spacing.borderRadius.sm,
    },
    urgencyText: { fontSize: 10, fontWeight: "700" },
    demandQty: { ...typography.subheadline, fontWeight: "700", fontSize: 13 },
    demandTotal: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: spacing.sm,
      marginTop: spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.separator,
    },
    demandTotalLabel: {
      ...typography.caption,
      color: palette.textSecondary,
      textTransform: "uppercase",
      fontWeight: "700",
      fontSize: 10,
    },
    demandTotalValue: { ...typography.headline, color: palette.text, fontWeight: "800" },

    // Stock bars
    barsTitle: {
      ...typography.caption,
      color: palette.textSecondary,
      textTransform: "uppercase",
      fontWeight: "700",
      fontSize: 10,
      letterSpacing: 0.5,
      marginBottom: spacing.md,
    },
    barGroup: { marginBottom: spacing.md },
    barLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: spacing.xs,
    },
    barLabel: { ...typography.caption, color: palette.textSecondary, fontSize: 11 },
    barValue: { ...typography.caption, color: palette.text, fontWeight: "600", fontSize: 11 },
    barTrack: {
      height: 8,
      backgroundColor: palette.surface,
      borderRadius: 4,
      overflow: "hidden",
    },
    barFill: { height: "100%", borderRadius: 4 },

    emptyText: {
      ...typography.body,
      color: palette.textTertiary,
      fontStyle: "italic",
      textAlign: "center",
      paddingVertical: spacing.md,
    },

    // Actions
    actions: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingVertical: spacing.sm + 2,
      backgroundColor: palette.card,
      borderRadius: spacing.borderRadius.lg,
      ...shadows.sm,
    },
    deleteBtn: { backgroundColor: palette.errorBg },
    actionText: { ...typography.button, fontSize: 14 },
  });
