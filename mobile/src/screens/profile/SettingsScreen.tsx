import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  LogOut,
  User,
  Bell,
  Info,
  Building,
  FileText,
  CreditCard,
  ChevronRight,
  RefreshCw,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SettingsStackParamList } from "../../types/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { revenueCatService } from "../../services/revenueCatService";
import { useToast } from "../../hooks/useToast";
import { ConfirmDialog } from "../../components/shared";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
  trailing?: React.ReactNode;
  disabled?: boolean;
}

function SettingsRow({
  icon,
  label,
  subtitle,
  onPress,
  destructive,
  trailing,
  disabled,
}: SettingsRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress || disabled}
    >
      <View style={styles.rowLeft}>
        {icon}
        <View>
          <Text
            style={[
              styles.rowLabel,
              destructive && styles.destructiveText,
              disabled && styles.disabledText,
            ]}
          >
            {label}
          </Text>
          {subtitle ? (
            <Text style={styles.rowSubtitle}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {trailing}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { user, signOut, checkAuth } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { addToast } = useToast();
  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const planIsPro = user?.plan === "pro" || user?.plan === "premium";

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const { isPro } = await revenueCatService.restorePurchases();
      await checkAuth();
      if (isPro) {
        addToast("Compras restauradas exitosamente", "success");
      } else {
        addToast("No se encontraron compras anteriores", "info");
      }
    } catch (error) {
      console.error("Restore failed:", error);
      addToast("Error al restaurar compras", "error");
    } finally {
      setRestoring(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch {
      // AuthContext handles navigation
    } finally {
      setLoggingOut(false);
      setShowLogout(false);
    }
  };

  const chevron = <ChevronRight color={colors.light.textTertiary} size={18} />;

  const planLabel = planIsPro ? "Pro" : "Básico";

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Ajustes</Text>

        {/* User info card */}
        <View style={styles.card}>
          {user?.logo_url ? (
            <Image source={{ uri: user.logo_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User color={colors.light.primary} size={28} />
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || "Usuario"}</Text>
            <Text style={styles.userEmail}>{user?.email || ""}</Text>
          </View>
        </View>

        {/* Perfil section */}
        <Text style={styles.sectionTitle}>Perfil</Text>
        <View style={styles.section}>
          <SettingsRow
            icon={<User color={colors.light.textTertiary} size={20} />}
            label="Editar Perfil"
            onPress={() => navigation.navigate("EditProfile")}
            trailing={chevron}
          />
          <SettingsRow
            icon={<CreditCard color={colors.light.textTertiary} size={20} />}
            label="Planes y Precios"
            onPress={() => navigation.navigate("Pricing")}
            trailing={
              <View style={styles.rowTrailingGroup}>
                <View
                  style={[
                    styles.planBadge,
                    planIsPro && styles.planBadgePro,
                  ]}
                >
                  <Text
                    style={[
                      styles.planBadgeText,
                      planIsPro && styles.planBadgeTextPro,
                    ]}
                  >
                    {planLabel}
                  </Text>
                </View>
                <ChevronRight color={colors.light.textTertiary} size={18} />
              </View>
            }
          />
        </View>

        {/* Negocio section */}
        <Text style={styles.sectionTitle}>Negocio</Text>
        <View style={styles.section}>
          <SettingsRow
            icon={<Building color={colors.light.textTertiary} size={20} />}
            label="Configuración del Negocio"
            onPress={() => navigation.navigate("BusinessSettings")}
            trailing={chevron}
          />
          <SettingsRow
            icon={<FileText color={colors.light.textTertiary} size={20} />}
            label="Valores de Contrato"
            onPress={() => navigation.navigate("ContractDefaults")}
            trailing={chevron}
          />
        </View>

        {/* Otro section */}
        <Text style={styles.sectionTitle}>Otro</Text>
        <View style={styles.section}>
          <SettingsRow
            icon={<Bell color={colors.light.textTertiary} size={20} />}
            label="Notificaciones"
            disabled
            trailing={
              <Text style={styles.comingSoonText}>Próximamente</Text>
            }
          />
          <SettingsRow
            icon={<Info color={colors.light.textTertiary} size={20} />}
            label="Acerca de"
            onPress={() => navigation.navigate("About")}
            trailing={chevron}
          />
        </View>

        {/* Cuenta section */}
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.section}>
          {!planIsPro && (
            <SettingsRow
              icon={
                restoring ? (
                  <ActivityIndicator
                    color={colors.light.textTertiary}
                    size={20}
                  />
                ) : (
                  <RefreshCw color={colors.light.textTertiary} size={20} />
                )
              }
              label="Restaurar Compras"
              onPress={handleRestore}
              disabled={restoring}
            />
          )}
          <SettingsRow
            icon={
              loggingOut ? (
                <ActivityIndicator color={colors.light.error} size={20} />
              ) : (
                <LogOut color={colors.light.error} size={20} />
              )
            }
            label="Cerrar Sesión"
            onPress={() => setShowLogout(true)}
            destructive
          />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={showLogout}
        title="Cerrar Sesión"
        description="¿Estás seguro de que deseas cerrar sesión?"
        confirmLabel="Cerrar Sesión"
        onConfirm={handleLogout}
        onCancel={() => setShowLogout(false)}
        destructive
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.surfaceGrouped,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    ...typography.title1,
    color: colors.light.text,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.card,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.light.surface,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.light.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  userName: {
    ...typography.headline,
    color: colors.light.text,
  },
  userEmail: {
    ...typography.bodySmall,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.footnote,
    color: colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  section: {
    backgroundColor: colors.light.card,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.md,
    overflow: "hidden",
    ...shadows.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.separator,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowLabel: {
    ...typography.body,
    color: colors.light.text,
  },
  rowSubtitle: {
    ...typography.caption1,
    color: colors.light.textTertiary,
    marginTop: 2,
  },
  destructiveText: {
    color: colors.light.error,
  },
  disabledText: {
    color: colors.light.textTertiary,
  },
  rowTrailingGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  planBadge: {
    backgroundColor: colors.light.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: spacing.borderRadius.sm,
  },
  planBadgePro: {
    backgroundColor: colors.light.successBg,
  },
  planBadgeText: {
    ...typography.caption1,
    color: colors.light.textSecondary,
    fontWeight: "600",
  },
  planBadgeTextPro: {
    color: colors.light.success,
  },
  comingSoonText: {
    ...typography.caption1,
    color: colors.light.textTertiary,
  },
});
