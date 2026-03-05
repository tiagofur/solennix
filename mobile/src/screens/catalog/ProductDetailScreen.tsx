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
} from "lucide-react-native";
import { ProductStackParamList } from "../../types/navigation";
import { Product } from "../../types/entities";
import { productService } from "../../services/productService";
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

export default function ProductDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const addToast = useToast((s) => s.addToast);
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);

  const [product, setProduct] = useState<Product | null>(null);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [productData, ingredientsData] = await Promise.all([
        productService.getById(id),
        productService.getIngredients(id),
      ]);
      setProduct(productData);
      setIngredients(ingredientsData || []);
    } catch (err) {
      logError("Error loading product detail", err);
      addToast("Error al cargar producto", "error");
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

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

  if (loading) return <LoadingSpinner />;
  if (!product) {
    return (
      <EmptyState
        title="Producto no encontrado"
        description="No se pudo cargar la información del producto."
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          {product.image_url ? (
            <Image
              source={{ uri: uploadService.getFullUrl(product.image_url) || '' }}
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Precio Base</Text>
            <Text style={styles.infoValue}>{formatCurrency(product.base_price)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estado</Text>
            <Text style={[styles.infoValue, { color: product.is_active ? palette.success : palette.error }]}>
              {product.is_active ? "Activo" : "Inactivo"}
            </Text>
          </View>
        </View>

        {/* Composición / Insumos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Composición / Insumos</Text>

          {ingredients.filter((i: any) => i.type !== 'equipment').length === 0 ? (
            <Text style={styles.emptyText}>
              Este producto no tiene insumos asignados.
            </Text>
          ) : (
            ingredients.filter((i: any) => i.type !== 'equipment').map((ing: any, index: number) => (
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
                    : "-"}
                </Text>
              </View>
            ))
          )}

          {ingredients.filter((i: any) => i.type !== 'equipment').length > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Costo estimado</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(
                  ingredients.filter((i: any) => i.type !== 'equipment').reduce((sum: number, ing: any) => {
                    const cost = ing.unit_cost || 0;
                    return sum + ing.quantity_required * cost;
                  }, 0)
                )}
              </Text>
            </View>
          )}
        </View>

        {/* Equipo Necesario */}
        {ingredients.filter((i: any) => i.type === 'equipment').length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Equipo Necesario</Text>
            <Text style={styles.equipmentBadge}>Sin costo - Activos reutilizables</Text>

            {ingredients.filter((i: any) => i.type === 'equipment').map((ing: any, index: number) => (
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

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate("ProductForm", { id })}
          >
            <Edit2 color={palette.primary} size={18} />
            <Text style={[styles.actionText, { color: palette.primary }]}>
              Editar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => setShowDelete(true)}
          >
            <Trash2 color={palette.error} size={18} />
            <Text style={[styles.actionText, { color: palette.error }]}>
              Eliminar
            </Text>
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

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surfaceGrouped,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
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
    height: 180,
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
  productName: {
    ...typography.h2,
    color: palette.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
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
  inactiveText: {
    ...typography.caption,
    color: palette.error,
    fontWeight: "600",
  },
  section: {
    backgroundColor: palette.card,
    borderRadius: spacing.borderRadius.lg,
    ...shadows.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: palette.text,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.separator,
  },
  infoLabel: {
    ...typography.body,
    color: palette.textSecondary,
  },
  infoValue: {
    ...typography.label,
    color: palette.text,
  },
  emptyText: {
    ...typography.body,
    color: palette.textTertiary,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  ingredientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.separator,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    ...typography.label,
    color: palette.text,
  },
  ingredientUnit: {
    ...typography.caption,
    color: palette.textTertiary,
  },
  ingredientCost: {
    ...typography.label,
    color: palette.textSecondary,
  },
  equipmentBadge: {
    ...typography.caption,
    color: palette.textTertiary,
    fontStyle: "italic",
    marginBottom: spacing.sm,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  totalLabel: {
    ...typography.label,
    color: palette.text,
  },
  totalValue: {
    ...typography.h3,
    color: palette.primary,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
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
  deleteBtn: {
    backgroundColor: palette.errorBg,
  },
  actionText: {
    ...typography.button,
    fontSize: 14,
  },
});
