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
  Moon,
  Lock,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SettingsStackParamList } from "../../types/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { revenueCatService } from "../../services/revenueCatService";
import { useToast } from "../../hooks/useToast";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import { api } from "../../lib/api";
import { ConfirmDialog } from "../../components/shared";
import { useTheme } from "../../hooks/useTheme";
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
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);
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
  const { isDark, toggleTheme } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);
  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const {
    eventsThisMonth,
    limit: eventLimit,
    clientsCount,
    clientLimit,
    isBasicPlan,
  } = usePlanLimits();

  const planIsPro = user?.plan === "pro" || user?.plan === "premium";

  const handleChangePassword = () => {
    navigation.navigate("ChangePassword" as any);
  };

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

  const chevron = <ChevronRight color={palette.textTertiary} size={18} />;

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
              <User color={palette.primary} size={28} />
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
            icon={<User color={palette.textTertiary} size={20} />}
            label="Editar Perfil"
            onPress={() => navigation.navigate("EditProfile")}
            trailing={chevron}
          />
          <SettingsRow
            icon={<Lock color={palette.textTertiary} size={20} />}
            label="Cambiar Contraseña"
            onPress={handleChangePassword}
            trailing={chevron}
          />
          <SettingsRow
            icon={<CreditCard color={palette.textTertiary} size={20} />}
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
                <ChevronRight color={palette.textTertiary} size={18} />
              </View>
            }
          />
        </View>

        {/* Plan usage card */}
        <Text style={styles.sectionTitle}>Uso del Plan</Text>
        <View style={styles.usageCard}>
          {isBasicPlan ? (
            <>
              <View style={styles.usageRow}>
                <Text style={styles.usageLabel}>Eventos este mes</Text>
                <Text style={styles.usageValue}>{eventsThisMonth} / {eventLimit}</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min((eventsThisMonth / eventLimit) * 100, 100)}%` },
                  ]}
                />
              </View>
              <View style={[styles.usageRow, { marginTop: spacing.sm }]}>
                <Text style={styles.usageLabel}>Clientes</Text>
                <Text style={styles.usageValue}>{clientsCount} / {clientLimit}</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFillGreen,
                    { width: `${Math.min((clientsCount / clientLimit) * 100, 100)}%` },
                  ]}
                />
              </View>
            </>
          ) : (
            <Text style={styles.unlimitedText}>
              Plan Pro — eventos y clientes ilimitados
            </Text>
          )}
        </View>

        {/* Negocio section */}
        <Text style={styles.sectionTitle}>Negocio</Text>
        <View style={styles.section}>
          <SettingsRow
            icon={<Building color={palette.textTertiary} size={20} />}
            label="Configuración del Negocio"
            onPress={() => navigation.navigate("BusinessSettings")}
            trailing={chevron}
          />
          <SettingsRow
            icon={<FileText color={palette.textTertiary} size={20} />}
            label="Valores de Contrato"
            onPress={() => navigation.navigate("ContractDefaults")}
            trailing={chevron}
          />
        </View>

        {/* Apariencia section */}
        <Text style={styles.sectionTitle}>Apariencia</Text>
        <View style={styles.section}>
          <SettingsRow
            icon={<Moon color={palette.textTertiary} size={20} />}
            label="Modo Oscuro"
            trailing={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: palette.separator, true: palette.primary }}
                thumbColor={palette.card}
              />
            }
          />
        </View>

        {/* Otro section */}
        <Text style={styles.sectionTitle}>Otro</Text>
        <View style={styles.section}>
          <SettingsRow
            icon={<Bell color={palette.textTertiary} size={20} />}
            label="Notificaciones"
            disabled
            trailing={
              <Text style={styles.comingSoonText}>Próximamente</Text>
            }
          />
          <SettingsRow
            icon={<Info color={palette.textTertiary} size={20} />}
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
                    color={palette.textTertiary}
                    size={20}
                  />
                ) : (
                  <RefreshCw color={palette.textTertiary} size={20} />
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
                <ActivityIndicator color={palette.error} size={20} />
              ) : (
                <LogOut color={palette.error} size={20} />
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

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surfaceGrouped,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    ...typography.title1,
    color: palette.text,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.card,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.surface,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  userName: {
    ...typography.headline,
    color: palette.text,
  },
  userEmail: {
    ...typography.bodySmall,
    color: palette.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.footnote,
    color: palette.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  section: {
    backgroundColor: palette.card,
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
    borderBottomColor: palette.separator,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowLabel: {
    ...typography.body,
    color: palette.text,
  },
  rowSubtitle: {
    ...typography.caption1,
    color: palette.textTertiary,
    marginTop: 2,
  },
  destructiveText: {
    color: palette.error,
  },
  disabledText: {
    color: palette.textTertiary,
  },
  rowTrailingGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  planBadge: {
    backgroundColor: palette.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: spacing.borderRadius.sm,
  },
  planBadgePro: {
    backgroundColor: palette.successBg,
  },
  planBadgeText: {
    ...typography.caption1,
    color: palette.textSecondary,
    fontWeight: "600",
  },
  planBadgeTextPro: {
    color: palette.success,
  },
  comingSoonText: {
    ...typography.caption1,
    color: palette.textTertiary,
  },
  usageCard: {
    backgroundColor: palette.card,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  usageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  usageLabel: {
    ...typography.caption1,
    color: palette.textSecondary,
  },
  usageValue: {
    ...typography.caption1,
    color: palette.text,
    fontWeight: "600",
  },
  progressBar: {
    height: 6,
    backgroundColor: palette.surface,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: "100%",
    backgroundColor: palette.primary,
    borderRadius: 3,
  },
  progressFillGreen: {
    height: "100%",
    backgroundColor: palette.success,
    borderRadius: 3,
  },
  unlimitedText: {
    ...typography.caption1,
    color: palette.textSecondary,
  },
});
