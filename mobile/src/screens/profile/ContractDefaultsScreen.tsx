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
  useWindowDimensions,
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
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import {
  CONTRACT_TEMPLATE_PLACEHOLDERS,
  DEFAULT_CONTRACT_TEMPLATE,
  getMaskedPlaceholder,
  validateContractTemplate,
} from "../../lib/contractTemplate";

const contractSchema = z.object({
  default_deposit_percent: z
    .number()
    .min(0, "Mínimo 0%")
    .max(100, "Máximo 100%"),
  default_cancellation_days: z
    .number()
    .min(0, "Mínimo 0 días")
    .max(365, "Máximo 365 días"),
  default_refund_percent: z
    .number()
    .min(0, "Mínimo 0%")
    .max(100, "Máximo 100%"),
  contract_template: z
    .string()
    .min(1, "La plantilla es obligatoria")
    .max(20000, "Máximo 20000 caracteres"),
});

type ContractFormData = z.infer<typeof contractSchema>;

type Props = NativeStackScreenProps<SettingsStackParamList, "ContractDefaults">;

export default function ContractDefaultsScreen({ navigation }: Props) {
  const { user, updateProfile } = useAuth();
  const addToast = useToast((s) => s.addToast);
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;

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
      contract_template: DEFAULT_CONTRACT_TEMPLATE,
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        default_deposit_percent: user.default_deposit_percent ?? 50,
        default_cancellation_days: user.default_cancellation_days ?? 15,
        default_refund_percent: user.default_refund_percent ?? 0,
        contract_template: user.contract_template ?? DEFAULT_CONTRACT_TEMPLATE,
      });
    }
  }, [user, reset]);

  const onSubmit = useCallback(
    async (data: ContractFormData) => {
      const { invalidTokens } = validateContractTemplate(
        data.contract_template,
      );
      if (invalidTokens.length > 0) {
        addToast(
          `Placeholders no soportados: ${invalidTokens.map((t) => `[${t}]`).join(", ")}`,
          "error",
        );
        return;
      }

      setSubmitting(true);
      try {
        await updateProfile({
          default_deposit_percent: data.default_deposit_percent,
          default_cancellation_days: data.default_cancellation_days,
          default_refund_percent: data.default_refund_percent,
          contract_template: data.contract_template,
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
          contentContainerStyle={[styles.form, isTablet && styles.formTablet]}
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

          <Controller
            control={control}
            name="contract_template"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <FormInput
                  label="Plantilla del Contrato"
                  placeholder="Escribe aquí la plantilla usando [token]"
                  value={value || ""}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.contract_template?.message}
                  multiline
                  style={styles.templateInput}
                />
                <Text style={styles.helperText}>
                  Usa placeholders legibles en formato [Nombre del cliente].
                  También se aceptan tokens técnicos.
                </Text>
                <Text style={styles.tokenList}>
                  {CONTRACT_TEMPLATE_PLACEHOLDERS.map(({ token }) =>
                    getMaskedPlaceholder(token),
                  ).join("  ")}
                </Text>
              </View>
            )}
          />
        </ScrollView>

        <View style={[styles.footer, isTablet && styles.footerTablet]}>
          <TouchableOpacity
            style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={palette.textInverse} size="small" />
            ) : (
              <>
                <Save color={palette.textInverse} size={20} />
                <Text style={styles.saveText}>Guardar Valores</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (palette: typeof colors.light) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    form: {
      padding: spacing.lg,
      gap: spacing.sm,
    },
    formTablet: {
      maxWidth: 600,
      width: "100%",
      alignSelf: "center",
    },
    sectionTitle: {
      ...typography.headline,
      color: palette.text,
      marginBottom: spacing.xs,
    },
    description: {
      ...typography.subheadline,
      color: palette.textSecondary,
      marginBottom: spacing.md,
    },
    helperText: {
      ...typography.caption1,
      color: palette.textTertiary,
      marginTop: -spacing.sm,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xxs,
    },
    templateInput: {
      minHeight: 240,
      textAlignVertical: "top",
    },
    tokenList: {
      ...typography.caption2,
      color: palette.textSecondary,
      marginTop: spacing.xs,
      lineHeight: 18,
    },
    footer: {
      padding: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      backgroundColor: palette.background,
    },
    footerTablet: {
      maxWidth: 600,
      width: "100%",
      alignSelf: "center",
      borderTopWidth: 0,
      backgroundColor: "transparent",
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.primary,
      borderRadius: spacing.borderRadius.lg,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveText: {
      ...typography.button,
      color: palette.textInverse,
      fontSize: 16,
    },
  });
