import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Zap } from "lucide-react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

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
            color={isLimitReached ? colors.light.warning : colors.light.primary}
            size={20}
          />
          <Text
            style={[
              styles.title,
              isLimitReached ? styles.limitTitle : styles.upsellTitle,
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

const styles = StyleSheet.create({
  container: {
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  limitReached: {
    backgroundColor: "#fffbeb",
    borderColor: "#fbbf24",
  },
  upsell: {
    backgroundColor: "#eff6ff",
    borderColor: "#93c5fd",
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
    ...typography.label,
  },
  limitTitle: {
    color: "#92400e",
  },
  upsellTitle: {
    color: "#1e40af",
  },
  description: {
    ...typography.bodySmall,
    color: colors.light.textSecondary,
  },
  button: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.borderRadius.md,
    marginTop: spacing.xs,
  },
  limitButton: {
    backgroundColor: "#f59e0b",
  },
  upsellButton: {
    backgroundColor: colors.light.primary,
  },
  buttonText: {
    ...typography.label,
    color: "#ffffff",
  },
});
