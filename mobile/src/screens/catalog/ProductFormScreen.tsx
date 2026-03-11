import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Image } from "expo-image";
import {
  Save,
  Plus,
  Trash2,
  Camera,
  ChevronDown,
  Check,
} from "lucide-react-native";
import { ProductStackParamList } from "../../types/navigation";
import { InventoryItem } from "../../types/entities";
import { productService } from "../../services/productService";
import { inventoryService } from "../../services/inventoryService";
import { uploadService } from "../../services/uploadService";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../contexts/AuthContext";
import { useImagePicker } from "../../hooks/useImagePicker";
import { logError } from "../../lib/errorHandler";
import {
  LoadingSpinner,
  FormInput,
  AppBottomSheet,
} from "../../components/shared";
import { useTheme } from "../../hooks/useTheme";
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
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const { pickFromCamera, pickFromGallery } = useImagePicker();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [ingredients, setIngredients] = useState<
    {
      inventory_id: string;
      quantity_required: number;
      inventory?: InventoryItem;
      _type: "ingredient" | "equipment" | "supply";
    }[]
  >([]);
  const [isActive, setIsActive] = useState(true);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState("");

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
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
      const [invItems, allProducts] = await Promise.all([
        inventoryService.getAll(),
        productService.getAll(),
      ]);
      setInventoryItems(invItems || []);

      // Extract unique categories from existing products
      const categories = [
        ...new Set(
          (allProducts || [])
            .map((p) => p.category)
            .filter((c): c is string => !!c && c.trim().length > 0),
        ),
      ].sort();
      setExistingCategories(categories);

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
              _type:
                i.type === "equipment"
                  ? ("equipment" as const)
                  : i.type === "supply"
                    ? ("supply" as const)
                    : ("ingredient" as const),
            })),
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
      { inventory_id: "", quantity_required: 1, _type: "ingredient" },
    ]);
  };

  const handleAddEquipment = () => {
    setIngredients([
      ...ingredients,
      { inventory_id: "", quantity_required: 1, _type: "equipment" },
    ]);
  };

  const handleAddSupply = () => {
    setIngredients([
      ...ingredients,
      { inventory_id: "", quantity_required: 1, _type: "supply" },
    ]);
  };

  const ingredientInventoryItems = inventoryItems.filter(
    (i) => i.type === "ingredient",
  );
  const equipmentInventoryItems = inventoryItems.filter(
    (i) => i.type === "equipment",
  );
  const supplyInventoryItems = inventoryItems.filter(
    (i) => i.type === "supply",
  );

  const ingredientEntries = ingredients
    .map((item, idx) => ({ item, originalIndex: idx }))
    .filter(({ item }) => item._type === "ingredient");

  const equipmentEntries = ingredients
    .map((item, idx) => ({ item, originalIndex: idx }))
    .filter(({ item }) => item._type === "equipment");

  const supplyEntries = ingredients
    .map((item, idx) => ({ item, originalIndex: idx }))
    .filter(({ item }) => item._type === "supply");

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (
    index: number,
    field: "inventory_id" | "quantity_required",
    value: string | number,
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
          })),
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
            })),
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            isTablet && styles.contentTablet,
          ]}
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
                  source={{
                    uri:
                      localImageUri || uploadService.getFullUrl(imageUrl) || "",
                  }}
                  style={styles.productImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Camera color={palette.textTertiary} size={32} />
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
                  placeholder="Ej: Paquete Premium"
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
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text style={styles.pickerLabel}>Categoría</Text>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      errors.category && styles.pickerButtonError,
                    ]}
                    onPress={() => setShowCategoryPicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.pickerButtonText,
                        !value && styles.pickerButtonPlaceholder,
                      ]}
                    >
                      {value || "Seleccionar categoría..."}
                    </Text>
                    <ChevronDown color={palette.textTertiary} size={18} />
                  </TouchableOpacity>
                  {errors.category && (
                    <Text style={styles.pickerError}>
                      {errors.category.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="base_price"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Precio Base"
                  placeholder="0.00"
                  value={
                    value != null && !isNaN(Number(value)) ? String(value) : "0"
                  }
                  onChangeText={(v) => onChange(parseFloat(v) || 0)}
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
                trackColor={{
                  false: palette.border,
                  true: palette.primaryLight,
                }}
                thumbColor={isActive ? palette.primary : palette.textTertiary}
              />
            </View>
          </View>

          {/* Composición / Insumos */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Composición / Insumos</Text>
              <TouchableOpacity
                style={styles.addIngredientBtn}
                onPress={handleAddIngredient}
              >
                <Plus color={palette.primary} size={18} />
                <Text style={styles.addIngredientText}>Agregar</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionDescription}>
              Solo insumos generan costo al producto.
            </Text>

            {ingredientEntries.length === 0 ? (
              <Text style={styles.emptyText}>
                Agrega insumos para definir la composición. Esto permitirá
                calcular el costo del producto.
              </Text>
            ) : (
              ingredientEntries.map(({ item: ing, originalIndex }) => (
                <View key={originalIndex} style={styles.ingredientRow}>
                  <View style={styles.ingredientSelect}>
                    <Text style={styles.selectLabel}>Insumo</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.ingredientScroll}
                    >
                      {ingredientInventoryItems.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.ingredientChip,
                            ing.inventory_id === item.id &&
                              styles.ingredientChipActive,
                          ]}
                          onPress={() =>
                            handleIngredientChange(
                              originalIndex,
                              "inventory_id",
                              item.id,
                            )
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
                          originalIndex,
                          "quantity_required",
                          parseFloat(v) || 0,
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
                    onPress={() => handleRemoveIngredient(originalIndex)}
                  >
                    <Trash2 color={palette.error} size={18} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Maquinaria / Equipo Necesario */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Equipo Necesario</Text>
              <TouchableOpacity
                style={styles.addIngredientBtn}
                onPress={handleAddEquipment}
              >
                <Plus color={palette.primary} size={18} />
                <Text style={styles.addIngredientText}>Agregar</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionDescription}>
              Activos reutilizables. No se incluyen en el costo del producto.
            </Text>

            {equipmentEntries.length === 0 ? (
              <Text style={styles.emptyText}>
                No hay equipo asignado a este producto.
              </Text>
            ) : (
              equipmentEntries.map(({ item: ing, originalIndex }) => (
                <View key={originalIndex} style={styles.ingredientRow}>
                  <View style={styles.ingredientSelect}>
                    <Text style={styles.selectLabel}>Equipo</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.ingredientScroll}
                    >
                      {equipmentInventoryItems.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.ingredientChip,
                            ing.inventory_id === item.id &&
                              styles.ingredientChipActive,
                          ]}
                          onPress={() =>
                            handleIngredientChange(
                              originalIndex,
                              "inventory_id",
                              item.id,
                            )
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
                          originalIndex,
                          "quantity_required",
                          parseFloat(v) || 0,
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
                    onPress={() => handleRemoveIngredient(originalIndex)}
                  >
                    <Trash2 color={palette.error} size={18} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Insumos por Evento */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Insumos por Evento</Text>
              <TouchableOpacity
                style={styles.addIngredientBtn}
                onPress={handleAddSupply}
              >
                <Plus color={palette.primary} size={18} />
                <Text style={styles.addIngredientText}>Agregar</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionDescription}>
              Costo fijo por evento (ej. aceite, gas). No escala con unidades
              del producto.
            </Text>

            {supplyEntries.length === 0 ? (
              <Text style={styles.emptyText}>
                No hay insumos por evento asignados.
              </Text>
            ) : (
              supplyEntries.map(({ item: ing, originalIndex }) => (
                <View key={originalIndex} style={styles.ingredientRow}>
                  <View style={styles.ingredientSelect}>
                    <Text style={styles.selectLabel}>Insumo</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.ingredientScroll}
                    >
                      {supplyInventoryItems.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.ingredientChip,
                            ing.inventory_id === item.id &&
                              styles.ingredientChipActive,
                          ]}
                          onPress={() =>
                            handleIngredientChange(
                              originalIndex,
                              "inventory_id",
                              item.id,
                            )
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
                          originalIndex,
                          "quantity_required",
                          parseFloat(v) || 0,
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
                    onPress={() => handleRemoveIngredient(originalIndex)}
                  >
                    <Trash2 color={palette.error} size={18} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, isTablet && styles.footerTablet]}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={palette.textInverse} />
            ) : (
              <>
                <Save color={palette.textInverse} size={20} />
                <Text style={styles.saveButtonText}>
                  {isEditing ? "Actualizar" : "Crear Producto"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <AppBottomSheet
        visible={showCategoryPicker}
        onClose={() => {
          setShowCategoryPicker(false);
          setCustomCategory("");
        }}
        snapPoints={["50%"]}
        scrollable
      >
        <View style={styles.categorySheetHeader}>
          <Text style={styles.categorySheetTitle}>Seleccionar Categoría</Text>
        </View>
        {existingCategories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={styles.categorySheetItem}
            onPress={() => {
              setValue("category", cat, { shouldValidate: true });
              setShowCategoryPicker(false);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.categorySheetItemText}>{cat}</Text>
            {watch("category") === cat && (
              <Check color={palette.primary} size={18} />
            )}
          </TouchableOpacity>
        ))}
        <View style={styles.categoryCustomRow}>
          <TextInput
            style={styles.categoryCustomInput}
            placeholder="Nueva categoría..."
            placeholderTextColor={palette.textMuted}
            value={customCategory}
            onChangeText={setCustomCategory}
            autoCapitalize="words"
          />
          <TouchableOpacity
            style={[
              styles.categoryCustomBtn,
              !customCategory.trim() && styles.categoryCustomBtnDisabled,
            ]}
            onPress={() => {
              if (customCategory.trim()) {
                setValue("category", customCategory.trim(), {
                  shouldValidate: true,
                });
                setShowCategoryPicker(false);
                setCustomCategory("");
              }
            }}
            disabled={!customCategory.trim()}
          >
            <Plus color={palette.textInverse} size={16} />
          </TouchableOpacity>
        </View>
      </AppBottomSheet>
    </SafeAreaView>
  );
}

const getStyles = (palette: typeof colors.light) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    contentTablet: {
      maxWidth: 600,
      width: "100%",
      alignSelf: "center",
      paddingHorizontal: 0,
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
      backgroundColor: palette.surface,
      borderRadius: spacing.borderRadius.lg,
      borderWidth: 2,
      borderColor: palette.border,
      borderStyle: "dashed",
      gap: spacing.xs,
    },
    imagePlaceholderText: {
      ...typography.caption,
      color: palette.textTertiary,
    },
    section: {
      backgroundColor: palette.card,
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
      color: palette.text,
      marginBottom: spacing.sm,
    },
    sectionDescription: {
      ...typography.caption,
      color: palette.textTertiary,
      marginBottom: spacing.sm,
      marginTop: -spacing.xs,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.separator,
      marginTop: spacing.sm,
    },
    switchLabel: {
      ...typography.label,
      color: palette.text,
    },
    switchDescription: {
      ...typography.caption,
      color: palette.textTertiary,
    },
    addIngredientBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: spacing.borderRadius.md,
      backgroundColor: palette.primaryLight,
    },
    addIngredientText: {
      ...typography.caption,
      color: palette.primary,
      fontWeight: "600",
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
      alignItems: "flex-end",
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.separator,
      gap: spacing.sm,
    },
    ingredientSelect: {
      flex: 2,
    },
    selectLabel: {
      ...typography.caption,
      color: palette.textTertiary,
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
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      maxWidth: 120,
    },
    ingredientChipActive: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    ingredientChipText: {
      ...typography.caption,
      color: palette.textSecondary,
    },
    ingredientChipTextActive: {
      color: palette.textInverse,
    },
    quantityInput: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    input: {
      flex: 1,
      height: 40,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: spacing.borderRadius.sm,
      paddingHorizontal: spacing.sm,
      ...typography.body,
      color: palette.text,
      backgroundColor: palette.surface,
      paddingVertical: 0,
    },
    unitText: {
      ...typography.caption,
      color: palette.textTertiary,
    },
    removeBtn: {
      padding: spacing.xs,
    },
    footer: {
      padding: spacing.lg,
      backgroundColor: palette.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.separator,
    },
    footerTablet: {
      maxWidth: 600,
      width: "100%",
      alignSelf: "center",
      paddingHorizontal: 0,
      backgroundColor: "transparent",
      borderTopWidth: 0,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      backgroundColor: palette.primary,
      borderRadius: spacing.borderRadius.md,
      paddingVertical: spacing.md,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      ...typography.button,
      color: palette.textInverse,
    },
    pickerLabel: {
      ...typography.caption,
      color: palette.textSecondary,
      marginBottom: spacing.xs,
      marginTop: spacing.sm,
    },
    pickerButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: palette.surface,
      borderRadius: spacing.borderRadius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
    },
    pickerButtonError: {
      borderColor: palette.error,
    },
    pickerButtonText: {
      ...typography.body,
      color: palette.text,
    },
    pickerButtonPlaceholder: {
      color: palette.textMuted,
    },
    pickerError: {
      ...typography.caption,
      color: palette.error,
      marginTop: 2,
    },
    categorySheetHeader: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    categorySheetTitle: {
      ...typography.h3,
      color: palette.text,
    },
    categorySheetItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.separator,
    },
    categorySheetItemText: {
      ...typography.body,
      color: palette.text,
    },
    categoryCustomRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    categoryCustomInput: {
      flex: 1,
      backgroundColor: palette.surface,
      borderRadius: spacing.borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      ...typography.body,
      color: palette.text,
    },
    categoryCustomBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: palette.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    categoryCustomBtnDisabled: {
      opacity: 0.4,
    },
  });
