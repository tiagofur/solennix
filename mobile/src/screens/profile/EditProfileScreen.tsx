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

const profileSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

type Props = NativeStackScreenProps<SettingsStackParamList, "EditProfile">;

export default function EditProfileScreen({ navigation }: Props) {
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
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (user) {
      reset({ name: user.name || "" });
    }
  }, [user, reset]);

  const onSubmit = useCallback(
    async (data: ProfileFormData) => {
      setSubmitting(true);
      try {
        await updateProfile({ name: data.name });
        addToast("Perfil actualizado", "success");
        navigation.goBack();
      } catch (err) {
        logError("Error updating profile", err);
        addToast("Error al actualizar perfil", "error");
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
          <Text style={styles.sectionTitle}>Información Personal</Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Nombre *"
                placeholder="Tu nombre"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
                autoCapitalize="words"
                returnKeyType="done"
              />
            )}
          />

          <FormInput
            label="Email"
            value={user?.email || ""}
            editable={false}
            style={styles.readonlyInput}
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
                <Text style={styles.saveText}>Guardar Cambios</Text>
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
      marginBottom: spacing.sm,
    },
    readonlyInput: {
      color: palette.textTertiary,
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
