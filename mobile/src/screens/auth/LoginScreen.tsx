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
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff } from "lucide-react-native";
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

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Solennix</Text>
        <Text style={styles.subtitle}>Inicia sesión en tu cuenta</Text>

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
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("ForgotPassword")}
          style={styles.linkContainer}
        >
          <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Register")}
          style={styles.linkContainer}
        >
          <Text style={styles.linkSecondary}>
            ¿No tienes cuenta? <Text style={styles.link}>Regístrate</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  inner: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
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
    backgroundColor: "#fef2f2",
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
  },
  buttonDisabled: {
    opacity: 0.6,
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
    color: palette.primary,
  },
  linkSecondary: {
    ...typography.body,
    color: palette.textSecondary,
  },
});
