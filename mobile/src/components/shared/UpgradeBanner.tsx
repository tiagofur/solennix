import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Zap } from "lucide-react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";
import { useTheme } from "../../hooks/useTheme";

interface UpgradeBannerProps {
  type: "limit-reached" | "upsell";
  resource?: string;
  currentUsage?: number;
  limit?: number;
  onUpgrade?: () => void;
}

export default function UpgradeBanner({
  type,
  resource,
  currentUsage,
  limit,
  onUpgrade,
}: UpgradeBannerProps) {
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);

  const isLimitReached = type === "limit-reached";

  const title = isLimitReached
    ? `Límite alcanzado${resource ? ` (${resource})` : ""}`
    : "Desbloquea más con Pro";

  const description = isLimitReached
    ? `Has usado ${currentUsage ?? "?"} de ${limit ?? "?"}. Actualiza tu plan para continuar.`
    : "Obtén eventos ilimitados, más clientes y todas las funcionalidades.";

  return (
    <View
      style={[
        styles.container,
        isLimitReached ? styles.limitReached : styles.upsell,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconRow}>
          <Zap
            color={isLimitReached ? palette.warning : palette.primary}
            size={20}
          />
          <Text
            style={[
              styles.title,
              { color: isLimitReached ? palette.warning : palette.info },
            ]}
          >
            {title}
          </Text>
        </View>
        <Text style={styles.description}>{description}</Text>
        {onUpgrade && (
          <TouchableOpacity
            style={[
              styles.button,
              isLimitReached ? styles.limitButton : styles.upsellButton,
            ]}
            onPress={onUpgrade}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Ver planes</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
  container: {
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  limitReached: {
    backgroundColor: palette.warningBg,
  },
  upsell: {
    backgroundColor: palette.infoBg,
  },
  content: {
    gap: spacing.xs,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    ...typography.headline,
    fontSize: 14,
  },
  description: {
    ...typography.subheadline,
    color: palette.textSecondary,
  },
  button: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.borderRadius.md,
    marginTop: spacing.xs,
  },
  limitButton: {
    backgroundColor: palette.warning,
  },
  upsellButton: {
    backgroundColor: palette.primary,
  },
  buttonText: {
    ...typography.headline,
    fontSize: 14,
    color: palette.textInverse,
  },
});
