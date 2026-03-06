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
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, Calendar, Users, BarChart2 } from "lucide-react-native";
import { AuthStackParamList } from "../../types/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../hooks/useTheme";
import { FormInput } from "../../components/shared";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

const BRAND_FEATURES = [
  { icon: Calendar, text: "Gestiona eventos de principio a fin" },
  { icon: Users,    text: "CRM integrado para tus clientes" },
  { icon: BarChart2, text: "Reportes financieros en tiempo real" },
];

function BrandPanel({ palette }: { palette: typeof colors.light }) {
  return (
    <LinearGradient
      colors={[palette.primary, palette.primaryDark]}
      style={styles.brandPanel}
    >
      <Text style={styles.brandTitle}>EventosApp</Text>
      <Text style={styles.brandTagline}>
        La plataforma todo-en-uno para organizadores de eventos
      </Text>
      <View style={styles.brandFeatures}>
        {BRAND_FEATURES.map(({ icon: Icon, text }) => (
          <View key={text} style={styles.brandFeatureRow}>
            <View style={styles.brandFeatureIcon}>
              <Icon color="#fff" size={18} />
            </View>
            <Text style={styles.brandFeatureText}>{text}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 600;
  const isLandscapeTablet = isTablet && width > height;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);
    try {
      await signIn(data.email, data.password);
    } catch (err: any) {
      setError(err?.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <ScrollView
      contentContainerStyle={[
        styles.inner,
        isTablet && !isLandscapeTablet && styles.innerTabletPortrait,
        isLandscapeTablet && styles.innerTabletLandscape,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={[
          styles.formCard,
          isTablet && styles.formCardTablet,
        ]}
      >
        {!isLandscapeTablet && (
          <>
            <Text style={styles.title}>EventosApp</Text>
            <Text style={styles.subtitle}>Inicia sesión en tu cuenta</Text>
          </>
        )}
        {isLandscapeTablet && (
          <Text style={styles.formTitle}>Inicia sesión</Text>
        )}

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

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              label="Contraseña"
              placeholder="••••••••"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              secureTextEntry={!showPassword}
              textContentType="password"
              autoComplete="password"
              icon={<Lock color={palette.textTertiary} size={20} />}
              rightElement={
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={8}>
                  {showPassword
                    ? <EyeOff color={palette.textTertiary} size={18} />
                    : <Eye color={palette.textTertiary} size={18} />}
                </TouchableOpacity>
              }
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
              <Text style={styles.buttonText}>Iniciando sesión...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("ForgotPassword")}
          style={styles.linkContainer}
        >
          <Text style={[styles.link, { color: palette.primary }]}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Register")}
          style={styles.linkContainer}
        >
          <Text style={[styles.linkSecondary, { color: palette.textSecondary }]}>
            ¿No tienes cuenta?{" "}
            <Text style={[styles.link, { color: palette.primary }]}>Regístrate</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  if (isLandscapeTablet) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: palette.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.landscapeWrapper}>
          <BrandPanel palette={palette} />
          {formContent}
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {formContent}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  landscapeWrapper: {
    flex: 1,
    flexDirection: "row",
  },
  // Brand panel (landscape tablet left column)
  brandPanel: {
    width: "42%",
    justifyContent: "center",
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.xxl,
  },
  brandTitle: {
    ...typography.h1,
    color: "#fff",
    marginBottom: spacing.sm,
  },
  brandTagline: {
    ...typography.body,
    color: "rgba(255,255,255,0.85)",
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  brandFeatures: {
    gap: spacing.md,
  },
  brandFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brandFeatureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandFeatureText: {
    ...typography.body,
    color: "#fff",
    flex: 1,
  },
  // Form scroll area
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
  },
  formCard: {
    width: "100%",
  },
  formCardTablet: {
    maxWidth: 440,
  },
  formTitle: {
    ...typography.h2,
    color: "#666",
    marginBottom: spacing.xl,
    textAlign: "center",
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
  linkSecondary: {
    ...typography.body,
  },
});
