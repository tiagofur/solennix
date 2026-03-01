import React, { useCallback, useEffect, useState } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import {
  Search,
  Plus,
  ChevronRight,
  Package,
  Edit2,
  X,
} from "lucide-react-native";
import { ProductStackParamList } from "../../types/navigation";
import { Product } from "../../types/entities";
import { productService } from "../../services/productService";
import { uploadService } from "../../services/uploadService";
import { useToast } from "../../hooks/useToast";
import { logError } from "../../lib/errorHandler";
import { EmptyState, ConfirmDialog, SkeletonList, SwipeableRow } from "../../components/shared";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

type Props = NativeStackScreenProps<ProductStackParamList, "ProductList">;

export default function ProductListScreen({ navigation }: Props) {
  const addToast = useToast((s) => s.addToast);

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      const data = await productService.getAll();
      const sorted = (data || []).sort((a, b) => a.name.localeCompare(b.name));
      setProducts(sorted);
    } catch (err) {
      logError("Error loading products", err);
      addToast("Error al cargar productos", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadProducts();
    }, [loadProducts]),
  );

  useEffect(() => {
    let filtered = products;

    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (!search.trim()) {
      setFilteredProducts(filtered);
    } else {
      const q = search.toLowerCase();
      setFilteredProducts(
        filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q),
        ),
      );
    }
  }, [search, products, selectedCategory]);

  const categories = React.useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  }, [loadProducts]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await productService.delete(deleteTarget.id);
      addToast("Producto eliminado", "success");
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    } catch (err) {
      logError("Error deleting product", err);
      addToast("Error al eliminar producto", "error");
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, addToast]);

  const formatCurrency = (n: number) =>
    `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  const renderProduct = useCallback(
    ({ item, index }: { item: Product; index: number }) => (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).springify()}>
      <SwipeableRow
        onEdit={() => navigation.navigate("ProductForm", { id: item.id })}
        onDelete={() => setDeleteTarget(item)}
      >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate("ProductDetail", { id: item.id })}
      >
        {item.image_url ? (
          <Image
            source={{ uri: uploadService.getFullUrl(item.image_url) || '' }}
            style={styles.productThumb}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.iconBox}>
            <Package color={colors.light.primary} size={22} />
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.cardRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
            {!item.is_active && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveText}>Inactivo</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.priceText}>{formatCurrency(item.base_price)}</Text>
        </View>
        <ChevronRight color={colors.light.textTertiary} size={20} />
      </TouchableOpacity>
      </SwipeableRow>
      </Animated.View>
    ),
    [navigation],
  );

  if (loading && products.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <SkeletonList count={6} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar productos..."
            placeholderTextColor={colors.light.textTertiary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <X color={colors.light.textTertiary} size={18} />
            </TouchableOpacity>
          ) : (
            <Search color={colors.light.textTertiary} size={18} />
          )}
        </View>
      </View>

      {categories.length > 0 && (
        <View style={styles.categoriesWrapper}>
          <FlatList
            horizontal
            data={categories}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory === item && styles.categoryChipActive,
                ]}
                onPress={() =>
                  setSelectedCategory(selectedCategory === item ? null : item)
                }
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === item && styles.categoryChipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        style={styles.flatList}
        contentContainerStyle={
          filteredProducts.length === 0
            ? styles.emptyContent
            : styles.listContent
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          loading ? null : search.trim() || selectedCategory ? (
            <EmptyState
              title="Sin resultados"
              description="No se encontraron productos con los filtros aplicados."
            />
          ) : (
            <EmptyState
              icon={<Package color={colors.light.textTertiary} size={48} />}
              title="Sin productos"
              description="Agrega tu primer producto al catálogo."
              actionLabel="Nuevo Producto"
              onAction={() => navigation.navigate("ProductForm", {})}
            />
          )
        }
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("ProductForm", {})}
      >
        <Plus color={colors.light.textInverse} size={28} />
      </TouchableOpacity>

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Eliminar producto"
        description={`¿Eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.surfaceGrouped,
  },
  flatList: {
    flexGrow: 1,
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
  categoriesWrapper: {
    paddingBottom: spacing.xs,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    alignItems: "center",
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.light.card,
    ...shadows.sm,
    marginRight: spacing.xs,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.light.textSecondary,
  },
  categoryChipActive: {
    backgroundColor: colors.light.primary,
  },
  categoryChipTextActive: {
    color: colors.light.textInverse,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
    paddingTop: spacing.sm,
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
  productThumb: {
    width: 44,
    height: 44,
    borderRadius: spacing.borderRadius.lg,
    backgroundColor: colors.light.surface,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: spacing.borderRadius.lg,
    backgroundColor: colors.light.primaryLight,
    justifyContent: "center",
    alignItems: "center",
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
  categoryBadge: {
    backgroundColor: colors.light.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: 2,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    lineHeight: 10,
  },
  inactiveBadge: {
    backgroundColor: colors.light.errorBg,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: spacing.borderRadius.sm,
  },
  inactiveText: {
    ...typography.caption,
    color: colors.light.error,
    fontWeight: "600",
    fontSize: 9,
  },
  priceBox: {
    alignItems: "flex-end",
  },
  priceText: {
    ...typography.label,
    color: colors.light.text,
    fontSize: 14,
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
