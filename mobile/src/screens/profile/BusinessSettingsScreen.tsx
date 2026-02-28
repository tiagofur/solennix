import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { Save, Camera, Trash2 } from "lucide-react-native";
import { SettingsStackParamList } from "../../types/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/useToast";
import { logError } from "../../lib/errorHandler";
import { FormInput } from "../../components/shared";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

const COLOR_SWATCHES = [
  "#FF6B35",
  "#007AFF",
  "#34C759",
  "#FF3B30",
  "#FF9500",
  "#AF52DE",
  "#5856D6",
  "#000000",
];

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

type Props = NativeStackScreenProps<SettingsStackParamList, "BusinessSettings">;

export default function BusinessSettingsScreen({ navigation }: Props) {
  const { user, updateProfile } = useAuth();
  const addToast = useToast((s) => s.addToast);

  const [businessName, setBusinessName] = useState(user?.business_name || "");
  const [brandColor, setBrandColor] = useState(user?.brand_color || "#FF6B35");
  const [showBusinessName, setShowBusinessName] = useState(
    user?.show_business_name_in_pdf ?? true,
  );
  const [logoUri, setLogoUri] = useState<string | null>(user?.logo_url || null);
  const [saving, setSaving] = useState(false);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permisos requeridos",
        "Se necesita acceso a tus fotos para subir un logo. Actívalo en Configuración del dispositivo.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];

    if (asset.base64) {
      const estimatedSize = asset.base64.length * 0.75;
      if (estimatedSize > MAX_LOGO_SIZE) {
        addToast("La imagen es demasiado grande (máximo 2MB)", "error");
        return;
      }
      setLogoUri(`data:image/jpeg;base64,${asset.base64}`);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUri(null);
  };

  const handleSave = async () => {
    if (brandColor && !/^#[0-9A-Fa-f]{6}$/.test(brandColor)) {
      addToast("Color inválido. Usa formato #RRGGBB", "error");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        business_name: businessName || undefined,
        brand_color: brandColor,
        logo_url: logoUri || "",
        show_business_name_in_pdf: showBusinessName,
      });
      addToast("Configuración guardada", "success");
      navigation.goBack();
    } catch (err) {
      logError("Error saving business settings", err);
      addToast("Error al guardar configuración", "error");
    } finally {
      setSaving(false);
    }
  };

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
          {/* Section: Business Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nombre Comercial</Text>
            <FormInput
              label="Razón Social"
              placeholder="Ej: Eventos Fantásticos"
              value={businessName}
              onChangeText={setBusinessName}
              autoCapitalize="words"
            />
          </View>

          {/* Section: Brand Color */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Color de Marca</Text>
            <Text style={styles.sectionDescription}>
              Se usa en tus PDFs y documentos generados.
            </Text>

            <View style={styles.colorRow}>
              <View
                style={[
                  styles.colorPreview,
                  { backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(brandColor) ? brandColor : "#ccc" },
                ]}
              />
              <View style={{ flex: 1 }}>
                <FormInput
                  label="Código HEX"
                  placeholder="#FF6B35"
                  value={brandColor}
                  onChangeText={(text) => {
                    const hex = text.startsWith("#") ? text : `#${text}`;
                    setBrandColor(hex.toUpperCase());
                  }}
                  autoCapitalize="characters"
                  maxLength={7}
                />
              </View>
            </View>

            <View style={styles.swatchContainer}>
              {COLOR_SWATCHES.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.swatch,
                    { backgroundColor: color },
                    brandColor.toUpperCase() === color.toUpperCase() && styles.swatchSelected,
                  ]}
                  onPress={() => setBrandColor(color)}
                  activeOpacity={0.7}
                />
              ))}
            </View>
          </View>

          {/* Section: Logo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Logo</Text>
            <Text style={styles.sectionDescription}>
              PNG o JPG, máximo 2MB. Se mostrará en tus documentos.
            </Text>

            {logoUri ? (
              <View style={styles.logoContainer}>
                <Image source={{ uri: logoUri }} style={styles.logoPreview} />
                <View style={styles.logoActions}>
                  <TouchableOpacity
                    style={styles.logoButton}
                    onPress={handlePickImage}
                    activeOpacity={0.7}
                  >
                    <Camera color={colors.light.primary} size={18} />
                    <Text style={styles.logoButtonText}>Cambiar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.logoButton, styles.logoDeleteButton]}
                    onPress={handleRemoveLogo}
                    activeOpacity={0.7}
                  >
                    <Trash2 color={colors.light.error} size={18} />
                    <Text style={[styles.logoButtonText, { color: colors.light.error }]}>
                      Eliminar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.logoPlaceholder}
                onPress={handlePickImage}
                activeOpacity={0.7}
              >
                <Camera color={colors.light.textTertiary} size={32} />
                <Text style={styles.logoPlaceholderText}>Subir Logo</Text>
              </TouchableOpacity>
            )}

            {logoUri && (
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>
                  Mostrar nombre junto al logo en PDFs
                </Text>
                <Switch
                  value={showBusinessName}
                  onValueChange={setShowBusinessName}
                  trackColor={{
                    false: colors.light.surfaceAlt,
                    true: colors.light.primary,
                  }}
                />
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Save color="#fff" size={20} />
                <Text style={styles.saveText}>Guardar Configuración</Text>
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
    backgroundColor: colors.light.surfaceGrouped,
  },
  form: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  section: {
    backgroundColor: colors.light.card,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.light.text,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    ...typography.caption1,
    color: colors.light.textSecondary,
    marginBottom: spacing.md,
  },
  // Color picker
  colorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  colorPreview: {
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.md,
    marginTop: 22,
    borderWidth: 2,
    borderColor: colors.light.separator,
  },
  swatchContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchSelected: {
    borderColor: colors.light.text,
    borderWidth: 3,
  },
  // Logo
  logoContainer: {
    alignItems: "center",
    gap: spacing.md,
  },
  logoPreview: {
    width: 80,
    height: 80,
    borderRadius: spacing.borderRadius.lg,
    backgroundColor: colors.light.surface,
  },
  logoActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  logoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.light.surface,
  },
  logoDeleteButton: {
    backgroundColor: colors.light.errorBg,
  },
  logoButtonText: {
    ...typography.subheadline,
    color: colors.light.primary,
    fontWeight: "500",
  },
  logoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.light.separator,
    borderRadius: spacing.borderRadius.lg,
    gap: spacing.sm,
  },
  logoPlaceholderText: {
    ...typography.subheadline,
    color: colors.light.textTertiary,
  },
  // Toggle
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.light.separator,
  },
  toggleLabel: {
    ...typography.subheadline,
    color: colors.light.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  // Footer
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
