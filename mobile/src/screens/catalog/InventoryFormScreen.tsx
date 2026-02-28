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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Package } from "lucide-react-native";
import { InventoryStackParamList } from "../../types/navigation";
import { InventoryItem } from "../../types/entities";
import { inventoryService } from "../../services/inventoryService";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../contexts/AuthContext";
import { logError } from "../../lib/errorHandler";
import { LoadingSpinner, FormInput } from "../../components/shared";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

const inventorySchema = z.object({
  ingredient_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  current_stock: z.number().min(0, "El stock no puede ser negativo"),
  minimum_stock: z.number().min(0, "El stock mínimo no puede ser negativo"),
  unit: z.string().min(1, "La unidad es requerida"),
  unit_cost: z.number().nullable(),
});

type InventoryFormData = z.infer<typeof inventorySchema>;

type Props = NativeStackScreenProps<InventoryStackParamList, "InventoryForm">;

export default function InventoryFormScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const isEditing = !!id;
  const addToast = useToast((s) => s.addToast);
  const { user } = useAuth();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [itemType, setItemType] = useState<"ingredient" | "equipment">("ingredient");

  const {
    control,
    handleSubmit,
    reset,
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
      <ScrollView
        contentContainerStyle={styles.content}
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
                  Ingrediente
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

          <Controller
            control={control}
            name="unit"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Unidad"
                placeholder="Ej: kg, litros, piezas"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.unit?.message}
              />
            )}
          />
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
                value={value?.toString() || "0"}
                onChangeText={onChange}
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
                value={value?.toString() || "0"}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.minimum_stock?.message}
                keyboardType="decimal-pad"
              />
            )}
          />

          <Text style={styles.helpText}>
            Cuando el stock caiga por debajo de este valor, recibirás una alerta.
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
            Este costo se usará para calcular el costo de las recetas.
          </Text>
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
                {isEditing ? "Actualizar" : "Crear Item"}
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
  section: {
    backgroundColor: colors.light.card,
    borderRadius: spacing.borderRadius.lg,
    ...shadows.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.light.text,
    marginBottom: spacing.sm,
  },
  typeSelector: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.light.textSecondary,
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
    backgroundColor: colors.light.surface,
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: colors.light.primary,
  },
  typeButtonText: {
    ...typography.bodySmall,
    color: colors.light.textSecondary,
    fontWeight: "600",
  },
  typeButtonTextActive: {
    color: colors.light.textInverse,
  },
  helpText: {
    ...typography.caption,
    color: colors.light.textTertiary,
    marginTop: spacing.xs,
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
