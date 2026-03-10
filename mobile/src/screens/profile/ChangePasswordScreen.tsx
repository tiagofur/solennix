import React, { useState } from "react";
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
import { Save } from "lucide-react-native";
import { SettingsStackParamList } from "../../types/navigation";
import { useToast } from "../../hooks/useToast";
import { api } from "../../lib/api";
import { FormInput } from "../../components/shared";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type Props = NativeStackScreenProps<SettingsStackParamList, "ChangePassword">;

export default function ChangePasswordScreen({ navigation }: Props) {
  const addToast = useToast((s) => s.addToast);
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;

  const [submitting, setSubmitting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword) {
      addToast("Completa todos los campos", "error");
      return;
    }
    if (newPassword.length < 6) {
      addToast("La nueva contraseña debe tener al menos 6 caracteres", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast("Las contraseñas no coinciden", "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      addToast("Contraseña actualizada correctamente", "success");
      navigation.goBack();
    } catch (error: any) {
      const msg = error?.message?.includes("incorrect")
        ? "La contraseña actual es incorrecta"
        : "Error al cambiar la contraseña";
      addToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            isTablet && styles.contentTablet,
          ]}
        >
          <Text style={styles.description}>
            Ingresa tu contraseña actual y elige una nueva contraseña.
          </Text>

          <View style={styles.form}>
            <FormInput
              label="Contraseña actual"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Ingresa tu contraseña actual"
            />
            <FormInput
              label="Nueva contraseña"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Mínimo 6 caracteres"
            />
            <FormInput
              label="Confirmar nueva contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Repite la nueva contraseña"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Save color="#fff" size={18} />
                <Text style={styles.buttonText}>Guardar</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (palette: typeof colors.light) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.surfaceGrouped,
    },
    content: {
      padding: spacing.lg,
    },
    contentTablet: {
      maxWidth: 600,
      width: "100%",
      alignSelf: "center",
    },
    description: {
      ...typography.body,
      color: palette.textSecondary,
      marginBottom: spacing.lg,
    },
    form: {
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    button: {
      backgroundColor: palette.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingVertical: spacing.md,
      borderRadius: spacing.borderRadius.md,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      ...typography.body,
      color: "#fff",
      fontWeight: "600",
    },
  });
