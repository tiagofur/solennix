import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Image } from "expo-image";
import { ArrowLeft, Save, Plus, Trash2, Package, Camera } from "lucide-react-native";
import { ProductStackParamList } from "../../types/navigation";
import { Product, InventoryItem, ProductIngredient } from "../../types/entities";
import { productService } from "../../services/productService";
import { inventoryService } from "../../services/inventoryService";
import { uploadService } from "../../services/uploadService";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../contexts/AuthContext";
import { useImagePicker } from "../../hooks/useImagePicker";
import { logError } from "../../lib/errorHandler";
import { LoadingSpinner, FormInput } from "../../components/shared";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

const productSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  category: z.string().min(2, "La categoría es requerida"),
  base_price: z.number().min(0, "El precio no puede ser negativo"),
});

type ProductFormData = z.infer<typeof productSchema>;

type Props = NativeStackScreenProps<ProductStackParamList, "ProductForm">;

export default function ProductFormScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const isEditing = !!id;
  const addToast = useToast((s) => s.addToast);
  const { user } = useAuth();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const { pickFromCamera, pickFromGallery } = useImagePicker();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [ingredients, setIngredients] = useState<{
    inventory_id: string;
    quantity_required: number;
    inventory?: InventoryItem;
  }[]>([]);
  const [isActive, setIsActive] = useState(true);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      category: "",
      base_price: 0,
    },
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [invItems] = await Promise.all([inventoryService.getAll()]);
      setInventoryItems(invItems || []);

      if (id) {
        const product = await productService.getById(id);
        reset({
          name: product.name || "",
          category: product.category || "",
          base_price: product.base_price || 0,
        });
        setIsActive(product.is_active);
        if (product.image_url) setImageUrl(product.image_url);

        const prodIngredients = await productService.getIngredients(id);
        if (prodIngredients) {
          setIngredients(
            prodIngredients.map((i: any) => ({
              inventory_id: i.inventory_id,
              quantity_required: i.quantity_required,
              inventory: i.inventory,
            }))
          );
        }
      }
    } catch (err) {
      logError("Error loading data", err);
      addToast("Error al cargar datos", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddIngredient = () => {
    setIngredients([
      ...ingredients,
      { inventory_id: "", quantity_required: 1 },
    ]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (
    index: number,
    field: "inventory_id" | "quantity_required",
    value: string | number
  ) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };

    if (field === "inventory_id") {
      const item = inventoryItems.find((i) => i.id === value);
      if (item) {
        newIngredients[index].inventory = item;
      }
    }
    setIngredients(newIngredients);
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!data.category.trim()) {
      addToast("La categoría es requerida", "error");
      return;
    }

    setSaving(true);
    try {
      // Upload image if a new local image was selected
      let finalImageUrl = imageUrl;
      if (localImageUri) {
        try {
          const uploadResult = await uploadService.uploadImage(localImageUri);
          finalImageUrl = uploadResult.url;
        } catch (uploadErr) {
          logError("Error uploading image", uploadErr);
          addToast("Error al subir imagen", "error");
        }
      }

      const validIngredients = ingredients.filter((i) => i.inventory_id);

      if (isEditing) {
        await productService.update(id, {
          name: data.name,
          category: data.category,
          base_price: data.base_price,
          image_url: finalImageUrl,
          is_active: isActive,
        });
        await productService.updateIngredients(
          id,
          validIngredients.map((i) => ({
            inventoryId: i.inventory_id,
            quantityRequired: i.quantity_required,
          }))
        );
        addToast("Producto actualizado", "success");
      } else {
        const newProduct = await productService.create({
          user_id: user?.id || "",
          name: data.name,
          category: data.category,
          base_price: data.base_price,
          image_url: finalImageUrl,
          is_active: true,
          recipe: null,
        });
        if (validIngredients.length > 0) {
          await productService.addIngredients(
            newProduct.id,
            validIngredients.map((i) => ({
              inventoryId: i.inventory_id,
              quantityRequired: i.quantity_required,
            }))
          );
        }
        addToast("Producto creado", "success");
      }
      navigation.goBack();
    } catch (err) {
      logError("Error saving product", err);
      addToast("Error al guardar producto", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Product Image */}
        <View style={styles.imageSection}>
          <TouchableOpacity
            style={styles.imagePickerBtn}
            activeOpacity={0.7}
            onPress={async () => {
              const result = await pickFromGallery();
              if (result?.[0]) {
                setLocalImageUri(result[0].uri);
              }
            }}
            onLongPress={async () => {
              const result = await pickFromCamera();
              if (result?.[0]) {
                setLocalImageUri(result[0].uri);
              }
            }}
          >
            {localImageUri || imageUrl ? (
              <Image
                source={{ uri: localImageUri || uploadService.getFullUrl(imageUrl) || '' }}
                style={styles.productImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Camera color={colors.light.textTertiary} size={32} />
                <Text style={styles.imagePlaceholderText}>Agregar foto</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Producto</Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Nombre"
                placeholder="Ej: Menú Premium"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="category"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Categoría"
                placeholder="Ej: Comida, Bebida, Postre"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.category?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="base_price"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Precio Base"
                placeholder="0.00"
                value={value?.toString() || ""}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.base_price?.message}
                keyboardType="decimal-pad"
                prefix="$"
              />
            )}
          />

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Producto Activo</Text>
              <Text style={styles.switchDescription}>
                Visible en cotizaciones
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: colors.light.border, true: colors.light.primaryLight }}
              thumbColor={isActive ? colors.light.primary : colors.light.textTertiary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Receta / Ingredientes</Text>
            <TouchableOpacity
              style={styles.addIngredientBtn}
              onPress={handleAddIngredient}
            >
              <Plus color={colors.light.primary} size={18} />
              <Text style={styles.addIngredientText}>Agregar</Text>
            </TouchableOpacity>
          </View>

          {ingredients.length === 0 ? (
            <Text style={styles.emptyText}>
              Agrega ingredientes para crear una receta. Esto permitirá calcular
              el costo del producto.
            </Text>
          ) : (
            ingredients.map((ing, index) => (
              <View key={index} style={styles.ingredientRow}>
                <View style={styles.ingredientSelect}>
                  <Text style={styles.selectLabel}>Ingrediente</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.ingredientScroll}
                  >
                    {inventoryItems.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.ingredientChip,
                          ing.inventory_id === item.id &&
                            styles.ingredientChipActive,
                        ]}
                        onPress={() =>
                          handleIngredientChange(index, "inventory_id", item.id)
                        }
                      >
                        <Text
                          style={[
                            styles.ingredientChipText,
                            ing.inventory_id === item.id &&
                              styles.ingredientChipTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {item.ingredient_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.quantityInput}>
                  <Text style={styles.selectLabel}>Cantidad</Text>
                  <TextInput
                    style={styles.input}
                    value={ing.quantity_required.toString()}
                    onChangeText={(v) =>
                      handleIngredientChange(
                        index,
                        "quantity_required",
                        parseFloat(v) || 0
                      )
                    }
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.unitText}>
                    {ing.inventory?.unit || "und"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemoveIngredient(index)}
                >
                  <Trash2 color={colors.light.error} size={18} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={colors.light.textInverse} />
          ) : (
            <>
              <Save color={colors.light.textInverse} size={20} />
              <Text style={styles.saveButtonText}>
                {isEditing ? "Actualizar" : "Crear Producto"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  imageSection: {
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  imagePickerBtn: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: spacing.borderRadius.lg,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.light.surface,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.light.border,
    borderStyle: "dashed",
    gap: spacing.xs,
  },
  imagePlaceholderText: {
    ...typography.caption,
    color: colors.light.textTertiary,
  },
  section: {
    backgroundColor: colors.light.card,
    borderRadius: spacing.borderRadius.lg,
    ...shadows.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.light.text,
    marginBottom: spacing.sm,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.light.separator,
    marginTop: spacing.sm,
  },
  switchLabel: {
    ...typography.label,
    color: colors.light.text,
  },
  switchDescription: {
    ...typography.caption,
    color: colors.light.textTertiary,
  },
  addIngredientBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.light.primaryLight,
  },
  addIngredientText: {
    ...typography.caption,
    color: colors.light.primary,
    fontWeight: "600",
  },
  emptyText: {
    ...typography.body,
    color: colors.light.textTertiary,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.separator,
    gap: spacing.sm,
  },
  ingredientSelect: {
    flex: 2,
  },
  selectLabel: {
    ...typography.caption,
    color: colors.light.textTertiary,
    marginBottom: 2,
  },
  ingredientScroll: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  ingredientChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    maxWidth: 120,
  },
  ingredientChipActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  ingredientChipText: {
    ...typography.caption,
    color: colors.light.textSecondary,
  },
  ingredientChipTextActive: {
    color: colors.light.textInverse,
  },
  quantityInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: spacing.borderRadius.sm,
    paddingHorizontal: spacing.sm,
    ...typography.body,
    color: colors.light.text,
    backgroundColor: colors.light.surface,
  },
  unitText: {
    ...typography.caption,
    color: colors.light.textTertiary,
  },
  removeBtn: {
    padding: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.light.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.light.separator,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.light.primary,
    borderRadius: spacing.borderRadius.md,
    paddingVertical: spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.light.textInverse,
  },
});
