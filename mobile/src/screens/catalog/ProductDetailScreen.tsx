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
import { Image } from "expo-image";
import {
  Edit2,
  Trash2,
  Package,
  DollarSign,
  Layers,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Users,
  Wrench,
} from "lucide-react-native";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { ProductStackParamList } from "../../types/navigation";
import { Product } from "../../types/entities";
import { productService } from "../../services/productService";
import { eventService } from "../../services/eventService";
import { uploadService } from "../../services/uploadService";
import { useToast } from "../../hooks/useToast";
import { logError } from "../../lib/errorHandler";
import { LoadingSpinner, ConfirmDialog, EmptyState } from "../../components/shared";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

type Props = NativeStackScreenProps<ProductStackParamList, "ProductDetail">;

type DemandEntry = {
  date: string;
  eventId: string;
  quantity: number;
  numPeople: number;
};

export default function ProductDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const addToast = useToast((s) => s.addToast);
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);

  const [product, setProduct] = useState<Product | null>(null);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [demandForecast, setDemandForecast] = useState<DemandEntry[]>([]);
  const [demandLoading, setDemandLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const loadDemandForecast = useCallback(async (productId: string) => {
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

      const entries: DemandEntry[] = [];
      await Promise.all(
        upcoming.map(async (event) => {
          try {
            const products = await eventService.getProducts(event.id);
            const match = (products || []).find((p: any) => p.product_id === productId);
            if (match) {
              entries.push({
                date: event.event_date.slice(0, 10),
                eventId: event.id,
                quantity: match.quantity,
                numPeople: event.num_people || 0,
              });
            }
          } catch {
            // skip
          }
        }),
      );

      entries.sort((a, b) => a.date.localeCompare(b.date));
      setDemandForecast(entries);
    } catch (err) {
      logError("Error loading demand forecast", err);
    } finally {
      setDemandLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [productData, ingredientsData] = await Promise.all([
        productService.getById(id),
        productService.getIngredients(id),
      ]);
      setProduct(productData);
      setIngredients(ingredientsData || []);
      loadDemandForecast(id);
    } catch (err) {
      logError("Error loading product detail", err);
      addToast("Error al cargar producto", "error");
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
      await productService.delete(id);
      addToast("Producto eliminado", "success");
      navigation.goBack();
    } catch (err) {
      logError("Error deleting product", err);
      addToast("Error al eliminar producto", "error");
    } finally {
      setShowDelete(false);
    }
  }, [id, addToast, navigation]);

  const formatCurrency = (n: number) =>
    `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  const fmtQty = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(2));

  if (loading) return <LoadingSpinner />;
  if (!product) {
    return (
      <EmptyState
        title="Producto no encontrado"
        description="No se pudo cargar la información del producto."
      />
    );
  }

  const ingredientItems = ingredients.filter((i: any) => i.type !== "equipment");
  const equipmentItems = ingredients.filter((i: any) => i.type === "equipment");

  const unitCost = ingredientItems.reduce(
    (sum: number, ing: any) => sum + ing.quantity_required * (ing.unit_cost || 0),
    0,
  );

  const margin =
    product.base_price > 0
      ? ((product.base_price - unitCost) / product.base_price) * 100
      : 0;

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
  const estimatedRevenue = totalDemand * product.base_price;

  const marginColor =
    margin >= 50 ? palette.success : margin >= 20 ? palette.text : palette.warning;
  const marginBg =
    margin >= 50 ? palette.successBg : margin >= 20 ? palette.card : palette.warningBg;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          {product.image_url ? (
            <Image
              source={{ uri: uploadService.getFullUrl(product.image_url) || "" }}
              style={styles.heroImage}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={styles.iconBox}>
              <Package color={palette.primary} size={32} />
            </View>
          )}
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{product.category}</Text>
          </View>
          {!product.is_active && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveText}>Producto Inactivo</Text>
            </View>
          )}
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          {/* Precio */}
          <View style={[styles.kpiCard, { backgroundColor: palette.card }]}>
            <View style={styles.kpiHeader}>
              <DollarSign color={palette.primary} size={14} />
              <Text style={styles.kpiLabel}>Precio Base</Text>
            </View>
            <Text style={styles.kpiValue}>{formatCurrency(product.base_price)}</Text>
            <Text style={styles.kpiSub}>por unidad</Text>
          </View>

          {/* Costo */}
          <View style={[styles.kpiCard, { backgroundColor: palette.card }]}>
            <View style={styles.kpiHeader}>
              <Layers color={palette.textSecondary} size={14} />
              <Text style={styles.kpiLabel}>Costo/Unidad</Text>
            </View>
            <Text style={styles.kpiValue}>{formatCurrency(unitCost)}</Text>
            <Text style={styles.kpiSub}>en insumos</Text>
          </View>

          {/* Margen */}
          <View style={[styles.kpiCard, { backgroundColor: marginBg }]}>
            <View style={styles.kpiHeader}>
              <TrendingUp color={marginColor} size={14} />
              <Text style={styles.kpiLabel}>Margen Est.</Text>
            </View>
            <Text style={[styles.kpiValue, { color: marginColor }]}>
              {margin.toFixed(1)}%
            </Text>
            <Text style={styles.kpiSub}>utilidad</Text>
          </View>

          {/* Eventos */}
          <View style={[styles.kpiCard, { backgroundColor: palette.card }]}>
            <View style={styles.kpiHeader}>
              <Calendar color={palette.primary} size={14} />
              <Text style={styles.kpiLabel}>Prox. Eventos</Text>
            </View>
            {demandLoading ? (
              <View style={[styles.kpiSkeleton, { backgroundColor: palette.surface }]} />
            ) : (
              <Text style={styles.kpiValue}>{demandForecast.length}</Text>
            )}
            <Text style={styles.kpiSub}>confirmados</Text>
          </View>
        </View>

        {/* Smart Alert */}
        {!demandLoading && (
          <View
            style={[
              styles.alertCard,
              {
                backgroundColor:
                  demand7Days > 0 ? palette.primaryLight : palette.card,
                borderColor:
                  demand7Days > 0
                    ? palette.primary + "40"
                    : palette.separator,
              },
            ]}
          >
            <View style={styles.alertIconWrap}>
              {demand7Days > 0 ? (
                <AlertTriangle color={palette.primary} size={20} />
              ) : (
                <CheckCircle color={palette.success} size={20} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.alertTitle,
                  { color: demand7Days > 0 ? palette.primary : palette.success },
                ]}
              >
                {demand7Days > 0
                  ? `${demand7Days} unidades en los próximos 7 días`
                  : demandForecast.length > 0
                  ? "Sin demanda inmediata"
                  : "Sin eventos próximos"}
              </Text>
              <Text style={styles.alertBody}>
                {demand7Days > 0
                  ? `Alta demanda esta semana. Ingreso estimado total: ${formatCurrency(estimatedRevenue)}`
                  : demandForecast.length > 0
                  ? `${totalDemand} unidades en ${demandForecast.length} evento${demandForecast.length !== 1 ? "s" : ""} próximos.`
                  : "No hay eventos confirmados que incluyan este producto."}
              </Text>
            </View>
          </View>
        )}

        {/* Demand Forecast */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar color={palette.primary} size={16} />
            <Text style={styles.sectionTitle}>Demanda por Fecha</Text>
            <Text style={styles.sectionSubtitle}>Confirmados</Text>
          </View>

          {demandLoading ? (
            [1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.demandSkeletonRow, { backgroundColor: palette.surface }]}
              />
            ))
          ) : demandForecast.length === 0 ? (
            <Text style={styles.emptyText}>
              Sin eventos confirmados que usen este producto.
            </Text>
          ) : (
            <>
              {demandForecast.map((entry, idx) => {
                const dateObj = new Date(entry.date + "T00:00:00");
                const diffDays = differenceInCalendarDays(dateObj, today);
                const isUrgent = diffDays <= 3;

                const rowBg = isUrgent
                  ? palette.primaryLight
                  : diffDays <= 7
                  ? palette.warningBg
                  : palette.surface;
                const dotColor = isUrgent
                  ? palette.primary
                  : diffDays <= 7
                  ? palette.warning
                  : palette.primary + "66";

                return (
                  <View
                    key={`${entry.eventId}-${idx}`}
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
                      {entry.numPeople > 0 && (
                        <View style={styles.demandPaxRow}>
                          <Users color={palette.textTertiary} size={11} />
                          <Text style={styles.demandPax}>{entry.numPeople} personas</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.demandQtyWrap}>
                      <Text style={styles.demandQty}>{entry.quantity} uds</Text>
                      <Text style={styles.demandQtyPrice}>
                        {formatCurrency(entry.quantity * product.base_price)}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {totalDemand > 0 && (
                <View style={styles.demandTotal}>
                  <View>
                    <Text style={styles.demandTotalLabel}>Total demanda</Text>
                    <Text style={styles.demandTotalSub}>
                      {demandForecast.length} evento{demandForecast.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.demandTotalValue}>
                      {fmtQty(totalDemand)} uds
                    </Text>
                    <Text style={styles.demandTotalSub}>{formatCurrency(estimatedRevenue)}</Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Composición / Insumos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Layers color={palette.primary} size={16} />
            <Text style={styles.sectionTitle}>Composición / Insumos</Text>
          </View>

          {ingredientItems.length === 0 ? (
            <Text style={styles.emptyText}>Este producto no tiene insumos asignados.</Text>
          ) : (
            <>
              {ingredientItems.map((ing: any, index: number) => (
                <View key={index} style={styles.ingredientRow}>
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>
                      {ing.ingredient_name || "Insumo"}
                    </Text>
                    <Text style={styles.ingredientUnit}>
                      {ing.quantity_required} {ing.unit || "und"}
                    </Text>
                  </View>
                  <Text style={styles.ingredientCost}>
                    {ing.unit_cost
                      ? formatCurrency(ing.quantity_required * ing.unit_cost)
                      : "—"}
                  </Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Costo total por unidad</Text>
                <Text style={styles.totalValue}>{formatCurrency(unitCost)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Equipo Necesario */}
        {equipmentItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Wrench color={palette.info} size={16} />
              <Text style={styles.sectionTitle}>Equipo Necesario</Text>
              <Text style={styles.equipmentNote}>Sin costo · Reutilizable</Text>
            </View>
            {equipmentItems.map((ing: any, index: number) => (
              <View key={index} style={styles.ingredientRow}>
                <View style={styles.ingredientInfo}>
                  <Text style={styles.ingredientName}>
                    {ing.ingredient_name || "Equipo"}
                  </Text>
                  <Text style={styles.ingredientUnit}>
                    {ing.quantity_required} {ing.unit || "und"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate("ProductForm", { id })}
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
        title="Eliminar producto"
        description={`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`}
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
    heroImage: {
      width: "100%",
      height: 160,
      borderRadius: spacing.borderRadius.lg,
      backgroundColor: palette.surface,
      marginBottom: spacing.md,
    },
    iconBox: {
      width: 64,
      height: 64,
      borderRadius: spacing.borderRadius.xl,
      backgroundColor: palette.primaryLight,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    productName: { ...typography.h2, color: palette.text, textAlign: "center", marginBottom: spacing.sm },
    categoryBadge: {
      backgroundColor: palette.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: spacing.borderRadius.full,
    },
    categoryText: {
      ...typography.caption,
      color: palette.textSecondary,
      fontWeight: "700",
      textTransform: "uppercase",
      fontSize: 11,
      letterSpacing: 0.5,
    },
    inactiveBadge: {
      marginTop: spacing.sm,
      backgroundColor: palette.errorBg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: spacing.borderRadius.full,
    },
    inactiveText: { ...typography.caption, color: palette.error, fontWeight: "600" },

    // KPI row
    kpiRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    kpiCard: {
      flex: 1,
      borderRadius: spacing.borderRadius.lg,
      padding: spacing.sm,
      ...shadows.sm,
    },
    kpiHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      marginBottom: 4,
    },
    kpiLabel: { ...typography.caption, color: palette.textSecondary, fontSize: 9, fontWeight: "700", flex: 1 },
    kpiValue: { ...typography.headline, color: palette.text, fontSize: 15, fontWeight: "800" },
    kpiSub: { ...typography.caption, color: palette.textTertiary, fontSize: 9, marginTop: 1 },
    kpiSkeleton: { height: 20, width: 40, borderRadius: 4, marginVertical: 2 },

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

    // Generic section
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
    sectionSubtitle: { ...typography.caption, color: palette.textTertiary },

    // Demand rows
    demandSkeletonRow: {
      height: 44,
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
    demandDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    demandDateRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    demandDate: { ...typography.subheadline, color: palette.text, fontSize: 13 },
    urgencyBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: spacing.borderRadius.sm,
    },
    urgencyText: { fontSize: 10, fontWeight: "700" },
    demandPaxRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
    demandPax: { ...typography.caption, color: palette.textTertiary, fontSize: 11 },
    demandQtyWrap: { alignItems: "flex-end" },
    demandQty: { ...typography.subheadline, color: palette.text, fontWeight: "700", fontSize: 13 },
    demandQtyPrice: { ...typography.caption, color: palette.textSecondary, fontSize: 11 },
    demandTotal: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: spacing.sm,
      marginTop: spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.separator,
    },
    demandTotalLabel: { ...typography.caption, color: palette.textSecondary, textTransform: "uppercase", fontWeight: "700", fontSize: 10 },
    demandTotalSub: { ...typography.caption, color: palette.textSecondary, fontSize: 11 },
    demandTotalValue: { ...typography.headline, color: palette.text, fontWeight: "800" },

    // Ingredients
    ingredientRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.separator,
    },
    ingredientInfo: { flex: 1 },
    ingredientName: { ...typography.label, color: palette.text },
    ingredientUnit: { ...typography.caption, color: palette.textTertiary },
    ingredientCost: { ...typography.label, color: palette.textSecondary },
    equipmentNote: { ...typography.caption, color: palette.textTertiary, fontStyle: "italic" },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: spacing.md,
      marginTop: spacing.xs,
    },
    totalLabel: { ...typography.label, color: palette.text },
    totalValue: { ...typography.h3, color: palette.primary },

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

    emptyText: {
      ...typography.body,
      color: palette.textTertiary,
      fontStyle: "italic",
      textAlign: "center",
      paddingVertical: spacing.md,
    },
  });
