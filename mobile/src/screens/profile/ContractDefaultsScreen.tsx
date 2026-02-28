import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save } from "lucide-react-native";
import { SettingsStackParamList } from "../../types/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/useToast";
import { logError } from "../../lib/errorHandler";
import { FormInput } from "../../components/shared";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const contractSchema = z.object({
  default_deposit_percent: z.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
  default_cancellation_days: z.number().min(0, "Mínimo 0 días").max(365, "Máximo 365 días"),
  default_refund_percent: z.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
});

type ContractFormData = z.infer<typeof contractSchema>;

type Props = NativeStackScreenProps<SettingsStackParamList, "ContractDefaults">;

export default function ContractDefaultsScreen({ navigation }: Props) {
  const { user, updateProfile } = useAuth();
  const addToast = useToast((s) => s.addToast);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      default_deposit_percent: 50,
      default_cancellation_days: 15,
      default_refund_percent: 0,
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        default_deposit_percent: user.default_deposit_percent ?? 50,
        default_cancellation_days: user.default_cancellation_days ?? 15,
        default_refund_percent: user.default_refund_percent ?? 0,
      });
    }
  }, [user, reset]);

  const onSubmit = useCallback(
    async (data: ContractFormData) => {
      setSubmitting(true);
      try {
        await updateProfile({
          default_deposit_percent: data.default_deposit_percent,
          default_cancellation_days: data.default_cancellation_days,
          default_refund_percent: data.default_refund_percent,
        });
        addToast("Valores de contrato actualizados", "success");
        navigation.goBack();
      } catch (err) {
        logError("Error updating contract defaults", err);
        addToast("Error al actualizar valores de contrato", "error");
      } finally {
        setSubmitting(false);
      }
    },
    [updateProfile, addToast, navigation],
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Valores Predeterminados</Text>
          <Text style={styles.description}>
            Estos valores se aplicarán automáticamente a nuevos eventos.
          </Text>

          <Controller
            control={control}
            name="default_deposit_percent"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <FormInput
                  label="Anticipo (%)"
                  placeholder="50"
                  value={value?.toString() || ""}
                  onChangeText={(text) => onChange(parseFloat(text) || 0)}
                  onBlur={onBlur}
                  error={errors.default_deposit_percent?.message}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
                <Text style={styles.helperText}>
                  Porcentaje del total que se solicita como anticipo
                </Text>
              </View>
            )}
          />

          <Controller
            control={control}
            name="default_cancellation_days"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <FormInput
                  label="Días para Cancelación"
                  placeholder="15"
                  value={value?.toString() || ""}
                  onChangeText={(text) => onChange(parseInt(text, 10) || 0)}
                  onBlur={onBlur}
                  error={errors.default_cancellation_days?.message}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
                <Text style={styles.helperText}>
                  Días de anticipación mínimos para cancelar un evento
                </Text>
              </View>
            )}
          />

          <Controller
            control={control}
            name="default_refund_percent"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <FormInput
                  label="Reembolso del Anticipo (%)"
                  placeholder="0"
                  value={value?.toString() || ""}
                  onChangeText={(text) => onChange(parseFloat(text) || 0)}
                  onBlur={onBlur}
                  error={errors.default_refund_percent?.message}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
                <Text style={styles.helperText}>
                  Porcentaje del anticipo que se reembolsa al cancelar
                </Text>
              </View>
            )}
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Save color="#fff" size={20} />
                <Text style={styles.saveText}>Guardar Valores</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  form: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.light.text,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.subheadline,
    color: colors.light.textSecondary,
    marginBottom: spacing.md,
  },
  helperText: {
    ...typography.caption1,
    color: colors.light.textTertiary,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xxs,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    backgroundColor: colors.light.background,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light.primary,
    borderRadius: spacing.borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    ...typography.button,
    color: "#ffffff",
    fontSize: 16,
  },
});
