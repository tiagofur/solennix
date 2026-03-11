import React from "react";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { useTheme } from "../../hooks/useTheme";

interface LoadingSpinnerProps {
  message?: string;
  size?: "small" | "large";
  fullScreen?: boolean;
  testID?: string;
}

export default function LoadingSpinner({
  message,
  size = "large",
  fullScreen = true,
  testID,
}: LoadingSpinnerProps) {
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);

  const content = (
    <>
      <ActivityIndicator size={size} color={palette.primary} testID={testID} />
      {message && <Text style={styles.message}>{message}</Text>}
    </>
  );

  if (fullScreen) {
    return <View style={styles.fullScreen}>{content}</View>;
  }

  return <View style={styles.inline}>{content}</View>;
}

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.background,
  },
  inline: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  message: {
    ...typography.body,
    color: palette.textSecondary,
    marginTop: spacing.sm,
  },
});
