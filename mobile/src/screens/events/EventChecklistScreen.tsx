import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import * as SecureStore from "expo-secure-store";
import { Check, ClipboardList } from "lucide-react-native";
import { HomeStackParamList } from "../../types/navigation";
import { eventService } from "../../services/eventService";
import { productService } from "../../services/productService";
import { logError } from "../../lib/errorHandler";
import { LoadingSpinner, EmptyState } from "../../components/shared";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";

type Props = NativeStackScreenProps<HomeStackParamList, "EventChecklist">;

interface ChecklistItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  section: "equipment" | "stock" | "purchase";
}

const CHECKLIST_STORE_KEY = "event_checklist_state_";

export default function EventChecklistScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const loadCheckedState = async () => {
    try {
      const stored = await SecureStore.getItemAsync(
        `${CHECKLIST_STORE_KEY}${id}`,
      );
      if (stored) {
        setCheckedIds(new Set(JSON.parse(stored)));
      }
    } catch (err) {
      logError("Error loading checklist state", err);
    }
  };

  const saveCheckedState = async (newCheckedIds: Set<string>) => {
    try {
      const arr = Array.from(newCheckedIds);
      await SecureStore.setItemAsync(
        `${CHECKLIST_STORE_KEY}${id}`,
        JSON.stringify(arr),
      );
    } catch (err) {
      logError("Error saving checklist state", err);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [productsData, equipmentData, suppliesData] = await Promise.all([
        eventService.getProducts(id),
        eventService.getEquipment(id),
        eventService.getSupplies(id),
      ]);

      const productQuantities = new Map<string, number>();
      (productsData || []).forEach((p: any) => {
        productQuantities.set(p.product_id, p.quantity || 0);
      });

      const productIds = Array.from(productQuantities.keys());
      const prodIngredients =
        productIds.length > 0
          ? await productService.getIngredientsForProducts(productIds)
          : [];

      const checklistItems: ChecklistItem[] = [];

      // Equipment
      (equipmentData || []).forEach((eq: any, index: number) => {
        checklistItems.push({
          id: `eq-${eq.inventory_id || index}`,
          name: eq.equipment_name || "Equipo",
          quantity: eq.quantity,
          unit: "und",
          section: "equipment",
        });
      });

      // Ingredients (Bring to event)
      const aggregatedIngredients: Record<string, ChecklistItem> = {};
      (prodIngredients || [])
        .filter((ing: any) => ing.type === "ingredient" && ing.bring_to_event)
        .forEach((ing: any) => {
          const key = ing.inventory_id;
          const qty = productQuantities.get(ing.product_id) || 0;
          if (!aggregatedIngredients[key]) {
            aggregatedIngredients[key] = {
              id: `ing-${key}`,
              name: ing.ingredient_name || "Insumo",
              unit: ing.unit || "und",
              quantity: 0,
              section: "stock",
            };
          }
          aggregatedIngredients[key].quantity +=
            (ing.quantity_required || 0) * qty;
        });

      Object.values(aggregatedIngredients).forEach((item) =>
        checklistItems.push(item),
      );

      // Stock Supplies
      (suppliesData || [])
        .filter((s: any) => s.source === "stock")
        .forEach((s: any, index: number) => {
          checklistItems.push({
            id: `sup-stock-${s.inventory_id || index}`,
            name: s.supply_name || "Insumo",
            quantity: s.quantity,
            unit: s.unit || "und",
            section: "stock",
          });
        });

      // Purchase Supplies
      (suppliesData || [])
        .filter((s: any) => s.source === "purchase")
        .forEach((s: any, index: number) => {
          checklistItems.push({
            id: `sup-purch-${s.inventory_id || index}`,
            name: s.supply_name || "Insumo",
            quantity: s.quantity,
            unit: s.unit || "und",
            section: "purchase",
          });
        });

      setItems(checklistItems);
      await loadCheckedState();
    } catch (err) {
      logError("Error loading checklist data", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const toggleItem = (itemId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      saveCheckedState(next);
      return next;
    });
  };

  const sections = useMemo(
    () =>
      [
        {
          title: "Equipo",
          data: items.filter((i) => i.section === "equipment"),
        },
        {
          title: "Insumos de Almacén",
          data: items.filter((i) => i.section === "stock"),
        },
        {
          title: "Insumos a Comprar",
          data: items.filter((i) => i.section === "purchase"),
        },
      ].filter((s) => s.data.length > 0),
    [items],
  );

  if (loading) return <LoadingSpinner />;

  if (items.length === 0) {
    return (
      <EmptyState
        title="Checklist Vacío"
        description="No hay insumos ni equipos requeridos para este evento."
      />
    );
  }

  const progress = Math.round((checkedIds.size / items.length) * 100);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.headerArea}>
          <View style={styles.iconCircle}>
            <ClipboardList color={palette.primary} size={24} />
          </View>
          <Text style={styles.title}>Checklist de Carga</Text>
          <Text style={styles.subtitle}>
            Supervisa que todo esté preparado o comprado antes del evento.
          </Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressLabel}>Progreso</Text>
              <Text style={styles.progressValue}>
                {checkedIds.size} de {items.length}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
        </View>

        {sections.map((section, sIdx) => (
          <View key={sIdx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.data.map((item, index) => {
                const isChecked = checkedIds.has(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    onPress={() => toggleItem(item.id)}
                    style={[
                      styles.row,
                      index !== section.data.length - 1 && styles.rowBorder,
                    ]}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        isChecked && styles.checkboxChecked,
                      ]}
                    >
                      {isChecked && (
                        <Check size={14} color="#fff" strokeWidth={3} />
                      )}
                    </View>
                    <View style={styles.itemInfo}>
                      <Text
                        style={[styles.itemName, isChecked && styles.itemDone]}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.itemDetail,
                          isChecked && styles.itemDone,
                        ]}
                      >
                        {item.quantity.toFixed(2).replace(/\.00$/, "")}{" "}
                        {item.unit}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (palette: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.surfaceGrouped,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    headerArea: {
      marginBottom: spacing.xl,
      alignItems: "center",
    },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: `${palette.primary}15`,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
    },
    title: {
      ...typography.h1Premium,
      color: palette.text,
      textAlign: "center",
      marginBottom: spacing.xs,
    },
    subtitle: {
      ...typography.callout,
      color: palette.textSecondary,
      textAlign: "center",
      marginBottom: spacing.lg,
    },
    progressContainer: {
      width: "100%",
      backgroundColor: palette.card,
      borderRadius: spacing.borderRadius.lg,
      padding: spacing.md,
      ...typography.body,
    },
    progressTextRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: spacing.xs,
    },
    progressLabel: {
      ...typography.subheadline,
      fontWeight: "600",
      color: palette.text,
    },
    progressValue: {
      ...typography.subheadline,
      color: palette.textSecondary,
    },
    progressBar: {
      height: 6,
      backgroundColor: palette.surfaceAlt,
      borderRadius: 3,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: palette.primary,
      borderRadius: 3,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      ...typography.headline,
      color: palette.textSecondary,
      marginBottom: spacing.sm,
      textTransform: "uppercase",
      letterSpacing: 1,
      fontSize: 13,
    },
    card: {
      backgroundColor: palette.card,
      borderRadius: spacing.borderRadius.lg,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.md,
      backgroundColor: palette.card,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: palette.borderStrong,
      marginRight: spacing.md,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxChecked: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      ...typography.body,
      fontWeight: "500",
      color: palette.text,
    },
    itemDetail: {
      ...typography.caption1,
      color: palette.textTertiary,
      marginTop: 2,
    },
    itemDone: {
      color: palette.textTertiary,
      textDecorationLine: "line-through",
    },
  });
