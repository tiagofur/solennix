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
import { Save, Package, ChevronDown, Check } from "lucide-react-native";
import { InventoryStackParamList } from "../../types/navigation";
import { InventoryItem } from "../../types/entities";
import { inventoryService } from "../../services/inventoryService";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../contexts/AuthContext";
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

const inventorySchema = z.object({
  ingredient_name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres"),
  current_stock: z.number().min(0, "El stock no puede ser negativo"),
  minimum_stock: z.number().min(0, "El stock mínimo no puede ser negativo"),
  unit: z.string().min(1, "La unidad es requerida"),
  unit_cost: z.number().nullable(),
});

type InventoryFormData = z.infer<typeof inventorySchema>;

const UNIT_GROUPS = [
  { label: "Peso", units: ["kg", "g", "oz", "lb"] },
  { label: "Volumen", units: ["L", "ml", "galón"] },
  { label: "Conteo", units: ["piezas", "unidades", "docenas", "porciones"] },
];

type Props = NativeStackScreenProps<InventoryStackParamList, "InventoryForm">;

export default function InventoryFormScreen({ navigation, route }: Props) {
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
  const [itemType, setItemType] = useState<
    "ingredient" | "equipment" | "supply"
  >("ingredient");
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      ingredient_name: "",
      current_stock: 0,
      minimum_stock: 0,
      unit: "",
      unit_cost: null,
    },
  });

  useEffect(() => {
    if (id) {
      loadItem();
    }
  }, [id]);

  const loadItem = async () => {
    try {
      const item = await inventoryService.getById(id!);
      reset({
        ingredient_name: item.ingredient_name || "",
        current_stock: item.current_stock || 0,
        minimum_stock: item.minimum_stock || 0,
        unit: item.unit || "",
        unit_cost: item.unit_cost,
      });
      setItemType(item.type || "ingredient");
    } catch (err) {
      logError("Error loading inventory item", err);
      addToast("Error al cargar item", "error");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: InventoryFormData) => {
    setSaving(true);
    try {
      if (isEditing) {
        await inventoryService.update(id, {
          ingredient_name: data.ingredient_name,
          current_stock: data.current_stock,
          minimum_stock: data.minimum_stock,
          unit: data.unit,
          unit_cost: data.unit_cost,
          type: itemType,
        });
        addToast("Inventario actualizado", "success");
      } else {
        await inventoryService.create({
          user_id: user?.id || "",
          ingredient_name: data.ingredient_name,
          current_stock: data.current_stock,
          minimum_stock: data.minimum_stock,
          unit: data.unit,
          unit_cost: data.unit_cost,
          type: itemType,
        });
        addToast("Inventario creado", "success");
      }
      navigation.goBack();
    } catch (err) {
      logError("Error saving inventory", err);
      addToast("Error al guardar", "error");
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información del Item</Text>

            <Controller
              control={control}
              name="ingredient_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Nombre"
                  placeholder="Ej: Aceite vegetal, Sillas"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.ingredient_name?.message}
                />
              )}
            />

            <View style={styles.typeSelector}>
              <Text style={styles.inputLabel}>Tipo</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    itemType === "ingredient" && styles.typeButtonActive,
                  ]}
                  onPress={() => setItemType("ingredient")}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      itemType === "ingredient" && styles.typeButtonTextActive,
                    ]}
                  >
                    Insumo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    itemType === "supply" && styles.typeButtonActive,
                  ]}
                  onPress={() => setItemType("supply")}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      itemType === "supply" && styles.typeButtonTextActive,
                    ]}
                  >
                    Por Evento
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    itemType === "equipment" && styles.typeButtonActive,
                  ]}
                  onPress={() => setItemType("equipment")}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      itemType === "equipment" && styles.typeButtonTextActive,
                    ]}
                  >
                    Equipo
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text style={styles.inputLabel}>Unidad</Text>
              <TouchableOpacity
                style={[
                  styles.unitPickerButton,
                  errors.unit && styles.unitPickerButtonError,
                ]}
                onPress={() => setShowUnitPicker(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.unitPickerText,
                    !watch("unit") && styles.unitPickerPlaceholder,
                  ]}
                >
                  {watch("unit") || "Seleccionar unidad..."}
                </Text>
                <ChevronDown color={palette.textTertiary} size={18} />
              </TouchableOpacity>
              {errors.unit && (
                <Text style={styles.unitPickerError}>
                  {errors.unit.message}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stock</Text>

            <Controller
              control={control}
              name="current_stock"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Stock Actual"
                  placeholder="0"
                  value={
                    value != null && !isNaN(Number(value)) ? String(value) : "0"
                  }
                  onChangeText={(v) => onChange(parseFloat(v) || 0)}
                  onBlur={onBlur}
                  error={errors.current_stock?.message}
                  keyboardType="decimal-pad"
                />
              )}
            />

            <Controller
              control={control}
              name="minimum_stock"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Stock Mínimo (Alerta)"
                  placeholder="0"
                  value={
                    value != null && !isNaN(Number(value)) ? String(value) : "0"
                  }
                  onChangeText={(v) => onChange(parseFloat(v) || 0)}
                  onBlur={onBlur}
                  error={errors.minimum_stock?.message}
                  keyboardType="decimal-pad"
                />
              )}
            />

            <Text style={styles.helpText}>
              Cuando el stock caiga por debajo de este valor, recibirás una
              alerta.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Costo (Opcional)</Text>

            <Controller
              control={control}
              name="unit_cost"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Costo por unidad"
                  placeholder="0.00"
                  value={value?.toString() || ""}
                  onChangeText={(v) => onChange(v ? parseFloat(v) : null)}
                  onBlur={onBlur}
                  error={errors.unit_cost?.message}
                  keyboardType="decimal-pad"
                  prefix="$"
                />
              )}
            />

            <Text style={styles.helpText}>
              Este costo se usará para calcular el costo de los productos.
            </Text>
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
                  {isEditing ? "Actualizar" : "Crear Item"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <AppBottomSheet
        visible={showUnitPicker}
        onClose={() => setShowUnitPicker(false)}
        snapPoints={["50%"]}
        scrollable
      >
        <View style={styles.unitSheetHeader}>
          <Text style={styles.unitSheetTitle}>Seleccionar Unidad</Text>
        </View>
        {UNIT_GROUPS.map((group) => (
          <View key={group.label}>
            <Text style={styles.unitGroupLabel}>{group.label}</Text>
            <View style={styles.unitChipsRow}>
              {group.units.map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.unitChip,
                    watch("unit") === unit && styles.unitChipActive,
                  ]}
                  onPress={() => {
                    setValue("unit", unit, { shouldValidate: true });
                    setShowUnitPicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.unitChipText,
                      watch("unit") === unit && styles.unitChipTextActive,
                    ]}
                  >
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
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
    section: {
      backgroundColor: palette.card,
      borderRadius: spacing.borderRadius.lg,
      ...shadows.sm,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    sectionTitle: {
      ...typography.h3,
      color: palette.text,
      marginBottom: spacing.sm,
    },
    typeSelector: {
      marginBottom: spacing.md,
    },
    inputLabel: {
      ...typography.caption,
      color: palette.textSecondary,
      marginBottom: spacing.xs,
    },
    typeButtons: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    typeButton: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: spacing.borderRadius.md,
      backgroundColor: palette.surface,
      alignItems: "center",
    },
    typeButtonActive: {
      backgroundColor: palette.primary,
    },
    typeButtonText: {
      ...typography.bodySmall,
      color: palette.textSecondary,
      fontWeight: "600",
    },
    typeButtonTextActive: {
      color: palette.textInverse,
    },
    helpText: {
      ...typography.caption,
      color: palette.textTertiary,
      marginTop: spacing.xs,
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
    unitPickerButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: palette.surface,
      borderRadius: spacing.borderRadius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
    },
    unitPickerButtonError: {
      borderColor: palette.error,
    },
    unitPickerText: {
      ...typography.body,
      color: palette.text,
    },
    unitPickerPlaceholder: {
      color: palette.textMuted,
    },
    unitPickerError: {
      ...typography.caption,
      color: palette.error,
      marginTop: 2,
    },
    unitSheetHeader: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    unitSheetTitle: {
      ...typography.h3,
      color: palette.text,
    },
    unitGroupLabel: {
      ...typography.caption,
      color: palette.textTertiary,
      fontWeight: "600",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xs,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    unitChipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    unitChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: spacing.borderRadius.md,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    unitChipActive: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    unitChipText: {
      ...typography.body,
      color: palette.textSecondary,
    },
    unitChipTextActive: {
      color: palette.textInverse,
      fontWeight: "600",
    },
  });
