import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

interface KPICardProps {
  icon: React.ReactNode;
  iconBgColor: string;
  title: string;
  value: string;
  loading?: boolean;
  footer?: string;
  onPress?: () => void;
  valueColor?: string;
}

export default function KPICard({
  icon,
  iconBgColor,
  title,
  value,
  loading,
  footer,
  onPress,
  valueColor,
}: KPICardProps) {
  const content = (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          {icon}
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text
            style={[
              styles.value,
              valueColor ? { color: valueColor } : undefined,
            ]}
          >
            {loading ? "..." : value}
          </Text>
        </View>
      </View>
      {footer ? (
        <View style={styles.footer}>
          <Text style={styles.footerText}>{footer}</Text>
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.light.card,
    borderRadius: spacing.borderRadius.lg,
    ...shadows.sm,
    overflow: "hidden",
    width: 170,
    marginRight: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  title: {
    ...typography.caption1,
    color: colors.light.textSecondary,
  },
  value: {
    ...typography.headline,
    color: colors.light.text,
    marginTop: 2,
  },
  footer: {
    backgroundColor: colors.light.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.light.separator,
  },
  footerText: {
    ...typography.caption1,
    color: colors.light.textMuted,
  },
});
