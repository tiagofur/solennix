import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogOut, User, Bell, Shield, Info } from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { ConfirmDialog } from "../../components/shared";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  destructive?: boolean;
  trailing?: React.ReactNode;
}

function SettingsRow({
  icon,
  label,
  onPress,
  destructive,
  trailing,
}: SettingsRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.rowLeft}>
        {icon}
        <Text style={[styles.rowLabel, destructive && styles.destructiveText]}>
          {label}
        </Text>
      </View>
      {trailing}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Ajustes</Text>

        {/* User info card */}
        <View style={styles.card}>
          <View style={styles.avatarPlaceholder}>
            <User color={colors.light.primary} size={28} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || "Usuario"}</Text>
            <Text style={styles.userEmail}>{user?.email || ""}</Text>
          </View>
        </View>

        {/* Settings sections */}
        <Text style={styles.sectionTitle}>General</Text>
        <View style={styles.section}>
          <SettingsRow
            icon={<User color={colors.light.textSecondary} size={20} />}
            label="Editar Perfil"
          />
          <SettingsRow
            icon={<Bell color={colors.light.textSecondary} size={20} />}
            label="Notificaciones"
          />
          <SettingsRow
            icon={<Shield color={colors.light.textSecondary} size={20} />}
            label="Privacidad"
          />
          <SettingsRow
            icon={<Info color={colors.light.textSecondary} size={20} />}
            label="Acerca de"
          />
        </View>

        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.section}>
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
    backgroundColor: colors.light.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    ...typography.h1,
    color: colors.light.text,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.card,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  userName: {
    ...typography.h3,
    color: colors.light.text,
  },
  userEmail: {
    ...typography.bodySmall,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.light.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  section: {
    backgroundColor: colors.light.card,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.border,
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
  destructiveText: {
    color: colors.light.error,
  },
});
