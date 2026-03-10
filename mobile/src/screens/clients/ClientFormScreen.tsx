import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Camera } from "lucide-react-native";
import { ClientStackParamList } from "../../types/navigation";
import { clientService } from "../../services/clientService";
import { uploadService } from "../../services/uploadService";
import { useToast } from "../../hooks/useToast";
import { useImagePicker } from "../../hooks/useImagePicker";
import { logError } from "../../lib/errorHandler";
import { FormInput, LoadingSpinner, Avatar } from "../../components/shared";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const clientSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type ClientFormData = z.infer<typeof clientSchema>;

type Props = NativeStackScreenProps<ClientStackParamList, "ClientForm">;

export default function ClientFormScreen({ navigation, route }: Props) {
  const editId = route.params?.id;
  const isEdit = !!editId;
  const addToast = useToast((s) => s.addToast);
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);
  const tabBarHeight = useBottomTabBarHeight();
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;

  const [loadingData, setLoadingData] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const { pickFromCamera, pickFromGallery } = useImagePicker();

  const phoneRef = useRef<RNTextInput>(null);
  const emailRef = useRef<RNTextInput>(null);
  const addressRef = useRef<RNTextInput>(null);
  const cityRef = useRef<RNTextInput>(null);
  const notesRef = useRef<RNTextInput>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      notes: "",
    },
  });

  // Load existing client data for edit
  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const client = await clientService.getById(editId);
        reset({
          name: client.name || "",
          phone: client.phone || "",
          email: client.email || "",
          address: client.address || "",
          city: client.city || "",
          notes: client.notes || "",
        });
        if (client.photo_url) setPhotoUrl(client.photo_url);
      } catch (err) {
        logError("Error loading client for edit", err);
        addToast("Error al cargar datos del cliente", "error");
        navigation.goBack();
      } finally {
        setLoadingData(false);
      }
    })();
  }, [editId, reset, addToast, navigation]);

  const onSubmit = useCallback(
    async (data: ClientFormData) => {
      setSubmitting(true);
      try {
        // Upload photo if new local photo was selected
        let finalPhotoUrl = photoUrl;
        if (localPhotoUri) {
          try {
            const uploadResult = await uploadService.uploadImage(localPhotoUri);
            finalPhotoUrl = uploadResult.url;
          } catch (uploadErr) {
            logError("Error uploading photo", uploadErr);
          }
        }

        const payload = {
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          address: data.address || null,
          city: data.city || null,
          notes: data.notes || null,
          photo_url: finalPhotoUrl,
        };

        if (isEdit && editId) {
          await clientService.update(editId, payload);
          addToast("Cliente actualizado", "success");
        } else {
          await clientService.create(payload as any);
          addToast("Cliente creado", "success");
        }
        navigation.goBack();
      } catch (err) {
        logError("Error saving client", err);
        addToast(
          isEdit ? "Error al actualizar cliente" : "Error al crear cliente",
          "error",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [isEdit, editId, addToast, navigation],
  );

  useEffect(() => {
    navigation.setOptions({
      title: isEdit ? "Editar Cliente" : "Nuevo Cliente",
    });
  }, [isEdit, navigation]);

  if (loadingData) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
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
          {/* Avatar Photo */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={async () => {
                const result = await pickFromGallery();
                if (result?.[0]) setLocalPhotoUri(result[0].uri);
              }}
            >
              {localPhotoUri || photoUrl ? (
                <View style={styles.avatarContainer}>
                  <Avatar
                    name={control._formValues.name || "?"}
                    photoUrl={localPhotoUri || photoUrl}
                    size={80}
                  />
                  <View style={styles.cameraOverlay}>
                    <Camera color={palette.textInverse} size={16} />
                  </View>
                </View>
              ) : (
                <View style={styles.avatarContainer}>
                  <Avatar name={control._formValues.name || "?"} size={80} />
                  <View style={styles.cameraOverlay}>
                    <Camera color={palette.textInverse} size={16} />
                  </View>
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Toca para agregar foto</Text>
          </View>

          {/* Name */}
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Nombre *"
                placeholder="Nombre completo"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
              />
            )}
          />

          {/* Phone */}
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                ref={phoneRef}
                label="Teléfono *"
                placeholder="10 dígitos"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.phone?.message}
                keyboardType="phone-pad"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            )}
          />

          {/* Email */}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                ref={emailRef}
                label="Email"
                placeholder="correo@ejemplo.com"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => addressRef.current?.focus()}
              />
            )}
          />

          {/* Address */}
          <Controller
            control={control}
            name="address"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                ref={addressRef}
                label="Dirección"
                placeholder="Calle, número, colonia"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.address?.message}
                returnKeyType="next"
                onSubmitEditing={() => cityRef.current?.focus()}
              />
            )}
          />

          {/* City */}
          <Controller
            control={control}
            name="city"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                ref={cityRef}
                label="Ciudad"
                placeholder="Ciudad"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.city?.message}
                returnKeyType="next"
                onSubmitEditing={() => notesRef.current?.focus()}
              />
            )}
          />

          {/* Notes */}
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                ref={notesRef}
                label="Notas"
                placeholder="Notas sobre el cliente..."
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.notes?.message}
                multiline
                numberOfLines={3}
                style={{ minHeight: 80, textAlignVertical: "top" }}
                returnKeyType="done"
              />
            )}
          />
        </ScrollView>

        {/* Save Button */}
        <View
          style={[styles.footer, { paddingBottom: tabBarHeight + spacing.sm }]}
        >
          <TouchableOpacity
            style={[
              styles.saveButton,
              submitting && styles.saveButtonDisabled,
              isTablet && styles.saveButtonTablet,
            ]}
            activeOpacity={0.8}
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={palette.textInverse} size="small" />
            ) : (
              <>
                <Save color={palette.textInverse} size={20} />
                <Text style={styles.saveText}>
                  {isEdit ? "Guardar Cambios" : "Crear Cliente"}
                </Text>
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
    avatarSection: {
      alignItems: "center",
      paddingVertical: spacing.md,
    },
    avatarContainer: {
      position: "relative",
    },
    cameraOverlay: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: palette.primary,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: palette.background,
    },
    avatarHint: {
      ...typography.caption,
      color: palette.textTertiary,
      marginTop: spacing.xs,
    },
    footer: {
      padding: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      backgroundColor: palette.background,
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
    saveButtonTablet: {
      maxWidth: 600,
      width: "100%",
      alignSelf: "center",
    },
    saveText: {
      ...typography.button,
      color: palette.textInverse,
      fontSize: 16,
    },
  });
