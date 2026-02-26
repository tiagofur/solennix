import React from "react";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

interface LoadingSpinnerProps {
  message?: string;
  size?: "small" | "large";
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  message,
  size = "large",
  fullScreen = true,
}: LoadingSpinnerProps) {
  const content = (
    <>
      <ActivityIndicator size={size} color={colors.light.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </>
  );

  if (fullScreen) {
    return <View style={styles.fullScreen}>{content}</View>;
  }

  return <View style={styles.inline}>{content}</View>;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.light.background,
  },
  inline: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  message: {
    ...typography.body,
    color: colors.light.textSecondary,
    marginTop: spacing.sm,
  },
});
