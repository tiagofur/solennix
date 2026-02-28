import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  Search,
  Plus,
  AlertTriangle,
  Package,
  Edit2,
} from "lucide-react-native";
import { InventoryStackParamList } from "../../types/navigation";
import { InventoryItem } from "../../types/entities";
import { inventoryService } from "../../services/inventoryService";
import { useToast } from "../../hooks/useToast";
import { logError } from "../../lib/errorHandler";
import { EmptyState } from "../../components/shared";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

type Props = NativeStackScreenProps<InventoryStackParamList, "InventoryList">;

export default function InventoryListScreen({ navigation }: Props) {
  const addToast = useToast((s) => s.addToast);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const data = await inventoryService.getAll();
      const sorted = (data || []).sort((a, b) =>
        a.ingredient_name.localeCompare(b.ingredient_name)
      );
      setItems(sorted);
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

  useEffect(() => {
    let filtered = items;

    if (showLowStockOnly) {
      filtered = filtered.filter(item => item.current_stock <= item.minimum_stock);
    }

    if (!search.trim()) {
      setFilteredItems(filtered);
    } else {
      const q = search.toLowerCase();
      setFilteredItems(
        filtered.filter(
          (item) =>
            item.ingredient_name.toLowerCase().includes(q) ||
            item.type.toLowerCase().includes(q)
        )
      );
    }
  }, [search, items, showLowStockOnly]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  }, [loadItems]);

  const lowStockCount = items.filter(
    item => item.current_stock <= item.minimum_stock
  ).length;

  const renderItem = useCallback(
    ({ item }: { item: InventoryItem }) => {
      const isLowStock = item.current_stock <= item.minimum_stock;

      return (
        <TouchableOpacity
          style={[styles.card, isLowStock && styles.cardLowStock]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("InventoryForm", { id: item.id })}
        >
          <View style={[styles.iconBox, isLowStock && styles.iconBoxLow]}>
            <Package
              color={isLowStock ? colors.light.error : colors.light.primary}
              size={22}
            />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.ingredient_name}
            </Text>
            <View style={styles.cardRow}>
              <View style={[styles.typeBadge, item.type === 'equipment' && styles.typeBadgeEquip]}>
                <Text style={styles.typeText}>
                  {item.type === 'equipment' ? 'Equipo' : 'Ingrediente'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.stockInfo}>
            <Text style={[styles.stockValue, isLowStock && styles.stockValueLow]}>
              {item.current_stock} {item.unit}
            </Text>
            {isLowStock && (
              <View style={styles.lowStockBadge}>
                <AlertTriangle color={colors.light.error} size={10} />
                <Text style={styles.lowStockText}>Mín: {item.minimum_stock}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [navigation],
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search color={colors.light.textTertiary} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar inventario..."
            placeholderTextColor={colors.light.textTertiary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
        </View>
      </View>

      {lowStockCount > 0 && (
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={() => setShowLowStockOnly(!showLowStockOnly)}
          activeOpacity={0.8}
        >
          <AlertTriangle color={colors.light.error} size={18} />
          <Text style={styles.alertText}>
            {lowStockCount} {' '}
            {lowStockCount === 1 ? 'ítem con stock bajo' : 'ítems con stock bajo'}
          </Text>
          <Text style={styles.alertAction}>
            {showLowStockOnly ? 'Ver todos' : 'Ver alertas'}
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={
          filteredItems.length === 0
            ? styles.emptyContent
            : styles.listContent
        }
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
              icon={<Package color={colors.light.textTertiary} size={48} />}
              title="Sin inventario"
              description="Agrega tu primer ingrediente o equipo."
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
        <Plus color={colors.light.textInverse} size={28} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.surfaceGrouped,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.surface,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 38,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.light.text,
    padding: 0,
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.errorBg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    ...shadows.sm,
    gap: spacing.sm,
  },
  alertText: {
    ...typography.bodySmall,
    color: colors.light.error,
    flex: 1,
    fontWeight: "600",
  },
  alertAction: {
    ...typography.caption,
    color: colors.light.primary,
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.card,
    borderRadius: spacing.borderRadius.lg,
    ...shadows.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  cardLowStock: {
    backgroundColor: colors.light.errorBg,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: spacing.borderRadius.lg,
    backgroundColor: colors.light.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  iconBoxLow: {
    backgroundColor: colors.light.errorBg,
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardName: {
    ...typography.subheadline,
    fontWeight: "500",
    color: colors.light.text,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  typeBadge: {
    backgroundColor: colors.light.surface,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: spacing.borderRadius.sm,
  },
  typeBadgeEquip: {
    backgroundColor: colors.light.infoBg,
  },
  typeText: {
    ...typography.caption,
    color: colors.light.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    fontSize: 9,
    letterSpacing: 0.3,
  },
  stockInfo: {
    alignItems: "flex-end",
  },
  stockValue: {
    ...typography.label,
    color: colors.light.text,
    fontSize: 14,
  },
  stockValueLow: {
    color: colors.light.error,
  },
  lowStockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  lowStockText: {
    ...typography.caption,
    color: colors.light.error,
    fontSize: 10,
  },
  fab: {
    position: "absolute",
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.fab,
  },
});
