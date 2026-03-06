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
import { Mail, CheckCircle } from "lucide-react-native";
import { AuthStackParamList } from "../../types/navigation";
import { api } from "../../lib/api";
import { useTheme } from "../../hooks/useTheme";
import { FormInput } from "../../components/shared";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const forgotSchema = z.object({
  email: z.string().email("Email inválido"),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 600;
  const isLandscapeTablet = isTablet && width > height;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotFormData) => {
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/forgot-password", { email: data.email });
      setSent(true);
    } catch (err: any) {
      setError(err?.message || "No se pudo enviar el correo");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={[styles.container, styles.centeredContent, { backgroundColor: palette.background }]}>
        <CheckCircle color={palette.success} size={56} />
        <Text style={[styles.successTitle, { color: palette.text }]}>Correo Enviado</Text>
        <Text style={[styles.successText, { color: palette.textSecondary }]}>
          Revisa tu bandeja de entrada para restablecer tu contraseña.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: palette.primary }, isTablet && styles.buttonTablet]}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.buttonText}>Volver al Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background }]}
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
          <Text style={[styles.title, { color: palette.primary }]}>Recuperar Contraseña</Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
            Ingresa tu email y te enviaremos instrucciones
          </Text>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Email"
                placeholder="tu@email.com"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                icon={<Mail color={palette.textTertiary} size={20} />}
              />
            )}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: palette.primary }, loading && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.buttonLoadingContent}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}>Enviando...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Enviar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            style={styles.linkContainer}
          >
            <Text style={[styles.link, { color: palette.primary }]}>Volver al Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: spacing.xxs,
  },
  subtitle: {
    ...typography.body,
    textAlign: "center",
    marginBottom: spacing.xxl,
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
    borderRadius: spacing.borderRadius.sm,
    padding: spacing.sm + 4,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    ...typography.bodySmall,
    color: "#ef4444",
  },
  button: {
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
  buttonLoadingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  buttonText: {
    ...typography.button,
    color: "#ffffff",
  },
  linkContainer: {
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  link: {
    ...typography.body,
  },
  successTitle: {
    ...typography.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  successText: {
    ...typography.body,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
});
