import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, CheckCircle } from "lucide-react-native";
import { AuthStackParamList } from "../../types/navigation";
import { api } from "../../lib/api";
import { useTheme } from "../../hooks/useTheme";
import { FormInput } from "../../components/shared";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const resetSchema = z
  .object({
    password: z.string().min(6, "M\u00EDnimo 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contrase\u00F1as no coinciden",
    path: ["confirmPassword"],
  });

type ResetFormData = z.infer<typeof resetSchema>;

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { token } = route.params;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 600;
  const isLandscapeTablet = isTablet && width > height;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetFormData) => {
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/reset-password", {
        token,
        password: data.password,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "No se pudo restablecer la contrase\u00F1a");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.container, styles.centeredContent]}>
        <CheckCircle color={palette.success} size={56} />
        <Text style={styles.successTitle}>Contrase&#xF1;a Actualizada</Text>
        <Text style={styles.successText}>
          Tu contrase&#xF1;a fue restablecida exitosamente. Ya puedes iniciar
          sesi&#xF3;n.
        </Text>
        <TouchableOpacity
          style={[styles.button, isTablet && styles.buttonTablet]}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.buttonText}>Ir al Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.inner,
          isTablet && !isLandscapeTablet && styles.innerTabletPortrait,
          isLandscapeTablet && styles.innerTabletLandscape,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.formCard, isTablet && styles.formCardTablet]}>
          <Text style={styles.title}>Nueva Contrase&#xF1;a</Text>
          <Text style={styles.subtitle}>
            Ingresa tu nueva contrase&#xF1;a para restablecer el acceso a tu
            cuenta.
          </Text>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Nueva Contrase&#xF1;a"
                placeholder="M&#xED;nimo 6 caracteres"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry
                textContentType="newPassword"
                autoComplete="new-password"
                icon={<Lock color={palette.textTertiary} size={20} />}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Confirmar Contrase&#xF1;a"
                placeholder="Repite la contrase&#xF1;a"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
                secureTextEntry
                textContentType="newPassword"
                autoComplete="new-password"
                icon={<Lock color={palette.textTertiary} size={20} />}
              />
            )}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={palette.textInverse} />
            ) : (
              <Text style={styles.buttonText}>Restablecer Contrase&#xF1;a</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            style={styles.linkContainer}
          >
            <Text style={styles.link}>Volver al Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (palette: typeof colors.light) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    centeredContent: {
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing.xl,
    },
    inner: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xxl,
    },
    innerTabletPortrait: {
      alignItems: "center",
    },
    innerTabletLandscape: {
      justifyContent: "center",
      paddingHorizontal: spacing.xxxl,
      alignItems: "center",
    },
    formCard: {
      width: "100%",
    },
    formCardTablet: {
      maxWidth: 440,
    },
    title: {
      ...typography.h1,
      textAlign: "center",
      color: palette.primary,
      marginBottom: spacing.xxs,
    },
    subtitle: {
      ...typography.body,
      textAlign: "center",
      color: palette.textSecondary,
      marginBottom: spacing.xxl,
    },
    errorBanner: {
      backgroundColor: palette.errorBg,
      borderLeftWidth: 4,
      borderLeftColor: palette.error,
      borderRadius: spacing.borderRadius.sm,
      padding: spacing.sm + 4,
      marginBottom: spacing.md,
    },
    errorBannerText: {
      ...typography.bodySmall,
      color: palette.error,
    },
    button: {
      backgroundColor: palette.primary,
      borderRadius: spacing.borderRadius.md,
      paddingVertical: spacing.md - 2,
      alignItems: "center",
      marginTop: spacing.sm,
      alignSelf: "stretch",
    },
    buttonTablet: {
      maxWidth: 440,
      alignSelf: "center",
      width: "100%",
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      ...typography.button,
      color: palette.textInverse,
    },
    linkContainer: {
      paddingVertical: spacing.sm,
      alignItems: "center",
    },
    link: {
      ...typography.body,
      color: palette.primary,
    },
    successTitle: {
      ...typography.h2,
      color: palette.text,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    successText: {
      ...typography.body,
      color: palette.textSecondary,
      textAlign: "center",
      marginBottom: spacing.xl,
    },
  });
