import React, { useCallback, useEffect, useMemo, useState } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  Search,
  Plus,
  AlertTriangle,
  Package,
  ShoppingCart,
  Wrench,
} from "lucide-react-native";
import { InventoryStackParamList } from "../../types/navigation";
import { InventoryItem } from "../../types/entities";
import { inventoryService } from "../../services/inventoryService";
import { useToast } from "../../hooks/useToast";
import { logError } from "../../lib/errorHandler";
import { EmptyState, SkeletonList, SwipeableRow, SortSelector } from "../../components/shared";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

type Props = NativeStackScreenProps<InventoryStackParamList, "InventoryList">;

interface InventorySection {
  title: string;
  type: "ingredient" | "equipment";
  data: InventoryItem[];
}

export default function InventoryListScreen({ navigation }: Props) {
  const addToast = useToast((s) => s.addToast);
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [sortKey, setSortKey] = useState("ingredient_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustmentValue, setAdjustmentValue] = useState("");

  const inventorySortOptions = useMemo(() => [
    { key: "ingredient_name", label: "Nombre" },
    { key: "current_stock", label: "Stock actual" },
    { key: "minimum_stock", label: "Stock mínimo" },
    { key: "unit_cost", label: "Costo unitario" },
  ], []);

  const loadItems = useCallback(async () => {
    try {
      const data = await inventoryService.getAll();
      setItems(data || []);
    } catch (err) {
      logError("Error loading inventory", err);
      addToast("Error al cargar inventario", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadItems();
    }, [loadItems]),
  );

  const handleAdjustStock = useCallback(async () => {
    if (!adjustingItem || !adjustmentValue.trim()) return;
    const change = parseFloat(adjustmentValue);
    if (isNaN(change)) {
      addToast("Ingresa un número válido.", "error");
      return;
    }
    try {
      const newStock = Math.max(0, adjustingItem.current_stock + change);
      await inventoryService.update(adjustingItem.id, { current_stock: newStock });
      setItems((prev) =>
        prev.map((item) =>
          item.id === adjustingItem.id ? { ...item, current_stock: newStock } : item,
        ),
      );
      addToast(`Stock de ${adjustingItem.ingredient_name} actualizado.`, "success");
      setAdjustingItem(null);
      setAdjustmentValue("");
    } catch (err) {
      logError("Error adjusting stock", err);
      addToast("Error al actualizar el stock.", "error");
    }
  }, [adjustingItem, adjustmentValue, addToast]);

  const sortedSections = useMemo(() => {
    let filtered = items;

    if (showLowStockOnly) {
      filtered = filtered.filter(item => item.current_stock <= item.minimum_stock);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.ingredient_name.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "current_stock":
          cmp = a.current_stock - b.current_stock;
          break;
        case "minimum_stock":
          cmp = a.minimum_stock - b.minimum_stock;
          break;
        case "unit_cost":
          cmp = (a.unit_cost ?? 0) - (b.unit_cost ?? 0);
          break;
        case "ingredient_name":
        default:
          cmp = a.ingredient_name.localeCompare(b.ingredient_name);
          break;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    const ingredientItems = sorted.filter(item => item.type === "ingredient");
    const equipmentItems = sorted.filter(item => item.type === "equipment");

    const sections: InventorySection[] = [];
    if (ingredientItems.length > 0) {
      sections.push({ title: "Consumibles", type: "ingredient", data: ingredientItems });
    }
    if (equipmentItems.length > 0) {
      sections.push({ title: "Equipos", type: "equipment", data: equipmentItems });
    }

    return sections;
  }, [search, items, showLowStockOnly, sortKey, sortOrder]);

  const totalFilteredItems = sortedSections.reduce((sum, s) => sum + s.data.length, 0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  }, [loadItems]);

  const lowStockCount = items.filter(
    item => item.current_stock <= item.minimum_stock
  ).length;

  const renderItem = useCallback(
    ({ item, index }: { item: InventoryItem; index: number }) => {
      const isLowStock = item.current_stock <= item.minimum_stock;

      return (
        <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).springify()}>
        <SwipeableRow
          onEdit={() => navigation.navigate("InventoryForm", { id: item.id })}
        >
        <TouchableOpacity
          style={[styles.card, isLowStock && styles.cardLowStock]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("InventoryDetail", { id: item.id })}
        >
          <View style={[styles.iconBox, isLowStock && styles.iconBoxLow]}>
            <Package
              color={isLowStock ? palette.error : palette.primary}
              size={22}
            />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.ingredient_name}
            </Text>
            <Text style={styles.cardUnit}>{item.unit}</Text>
          </View>
          <View style={styles.stockInfo}>
            <Text style={[styles.stockValue, isLowStock && styles.stockValueLow]}>
              {item.current_stock} {item.unit}
            </Text>
            {isLowStock && (
              <View style={styles.lowStockBadge}>
                <AlertTriangle color={palette.error} size={10} />
                <Text style={styles.lowStockText}>Mín: {item.minimum_stock}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              setAdjustingItem(item);
              setAdjustmentValue("");
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Plus color={palette.primary} size={18} />
          </TouchableOpacity>
        </TouchableOpacity>
        </SwipeableRow>
        </Animated.View>
      );
    },
    [navigation, palette, styles],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: InventorySection }) => {
      const isEquipment = section.type === "equipment";
      const Icon = isEquipment ? Wrench : ShoppingCart;
      const iconColor = isEquipment ? palette.info : palette.primary;
      const bgColor = isEquipment ? palette.infoBg : palette.primaryLight;

      return (
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconBox, { backgroundColor: bgColor }]}>
            <Icon color={iconColor} size={16} />
          </View>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCountBadge}>
            <Text style={styles.sectionCountText}>{section.data.length}</Text>
          </View>
        </View>
      );
    },
    [palette, styles],
  );

  if (loading && items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <SkeletonList count={6} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { flex: 1 }]}>
            <Search color={palette.textTertiary} size={18} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar inventario..."
              placeholderTextColor={palette.textTertiary}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
          </View>
          <SortSelector
            options={inventorySortOptions}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={(key, order) => { setSortKey(key); setSortOrder(order); }}
          />
        </View>
      </View>

      {lowStockCount > 0 && (
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={() => setShowLowStockOnly(!showLowStockOnly)}
          activeOpacity={0.8}
        >
          <AlertTriangle color={palette.error} size={18} />
          <Text style={styles.alertText}>
            {lowStockCount} {' '}
            {lowStockCount === 1 ? 'ítem con stock bajo' : 'ítems con stock bajo'}
          </Text>
          <Text style={styles.alertAction}>
            {showLowStockOnly ? 'Ver todos' : 'Ver alertas'}
          </Text>
        </TouchableOpacity>
      )}

      <SectionList
        sections={sortedSections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={
          totalFilteredItems === 0
            ? styles.emptyContent
            : styles.listContent
        }
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          loading ? null : search.trim() || showLowStockOnly ? (
            <EmptyState
              title="Sin resultados"
              description="No se encontraron items con los filtros aplicados."
            />
          ) : (
            <EmptyState
              icon={<Package color={palette.textTertiary} size={48} />}
              title="Sin inventario"
              description="Agrega tu primer insumo o equipo."
              actionLabel="Nuevo Item"
              onAction={() => navigation.navigate("InventoryForm", {})}
            />
          )
        }
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("InventoryForm", {})}
      >
        <Plus color={palette.textInverse} size={28} />
      </TouchableOpacity>

      {/* Stock Adjustment Modal */}
      <Modal
        visible={!!adjustingItem}
        transparent
        animationType="fade"
        onRequestClose={() => setAdjustingItem(null)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Ajustar Stock</Text>
              {adjustingItem && (
                <Text style={styles.modalSubtitle}>
                  {adjustingItem.ingredient_name} ({adjustingItem.current_stock} {adjustingItem.unit})
                </Text>
              )}
              <Text style={styles.modalLabel}>Cantidad a sumar/restar</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej: +10 o -5"
                placeholderTextColor={palette.textTertiary}
                keyboardType="numbers-and-punctuation"
                value={adjustmentValue}
                onChangeText={setAdjustmentValue}
                autoFocus
                onSubmitEditing={handleAdjustStock}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setAdjustingItem(null)}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={handleAdjustStock}
                >
                  <Text style={styles.modalConfirmText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surfaceGrouped,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 38,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: palette.text,
    padding: 0,
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.errorBg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    ...shadows.sm,
    gap: spacing.sm,
  },
  alertText: {
    ...typography.bodySmall,
    color: palette.error,
    flex: 1,
    fontWeight: "600",
  },
  alertAction: {
    ...typography.caption,
    color: palette.primary,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  emptyContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  sectionIconBox: {
    width: 28,
    height: 28,
    borderRadius: spacing.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    ...typography.subheadline,
    fontWeight: "700",
    color: palette.text,
    flex: 1,
  },
  sectionCountBadge: {
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: spacing.borderRadius.sm,
  },
  sectionCountText: {
    ...typography.caption,
    color: palette.textSecondary,
    fontWeight: "600",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.card,
    borderRadius: spacing.borderRadius.lg,
    ...shadows.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  cardLowStock: {
    backgroundColor: palette.errorBg,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: spacing.borderRadius.lg,
    backgroundColor: palette.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  iconBoxLow: {
    backgroundColor: palette.errorBg,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    ...typography.subheadline,
    fontWeight: "500",
    color: palette.text,
  },
  cardUnit: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  stockInfo: {
    alignItems: "flex-end",
  },
  stockValue: {
    ...typography.label,
    color: palette.text,
    fontSize: 14,
  },
  stockValueLow: {
    color: palette.error,
  },
  lowStockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  lowStockText: {
    ...typography.caption,
    color: palette.error,
    fontSize: 10,
  },
  fab: {
    position: "absolute",
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.primary,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.fab,
  },
  adjustBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: palette.card,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.lg,
    width: "100%",
    ...shadows.lg,
  },
  modalTitle: {
    ...typography.title2,
    color: palette.text,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.body,
    color: palette.textSecondary,
    marginBottom: spacing.md,
  },
  modalLabel: {
    ...typography.caption1,
    color: palette.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  modalInput: {
    backgroundColor: palette.surfaceGrouped,
    borderWidth: 1,
    borderColor: palette.separator,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    ...typography.body,
    color: palette.text,
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: palette.separator,
    alignItems: "center",
  },
  modalCancelText: {
    ...typography.subheadline,
    color: palette.textSecondary,
    fontWeight: "500",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: spacing.borderRadius.lg,
    backgroundColor: palette.primary,
    alignItems: "center",
  },
  modalConfirmText: {
    ...typography.subheadline,
    color: palette.textInverse,
    fontWeight: "700",
  },
});
