import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { useTheme } from "../../hooks/useTheme";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

function SkeletonBase({ width, height = 16, borderRadius = 8, style }: SkeletonProps) {
  const shimmer = useSharedValue(0);
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: palette.border,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function SkeletonLine({ width = "100%", height = 14, style }: SkeletonProps) {
  return <SkeletonBase width={width} height={height} borderRadius={4} style={style} />;
}

export function SkeletonCircle({ size = 44 }: { size?: number }) {
  return <SkeletonBase width={size} height={size} borderRadius={size / 2} />;
}

interface SkeletonCardProps {
  lines?: number;
  showAvatar?: boolean;
}

export function SkeletonCard({ lines = 2, showAvatar = false }: SkeletonCardProps) {
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const skeletonStyles = getSkeletonStyles(palette);

  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.cardRow}>
        {showAvatar && <SkeletonCircle size={44} />}
        <View style={skeletonStyles.cardContent}>
          <SkeletonLine width="70%" height={16} />
          {Array.from({ length: lines - 1 }).map((_, i) => (
            <SkeletonLine
              key={i}
              width={i === 0 ? "50%" : "30%"}
              height={12}
              style={{ marginTop: spacing.xs }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export function SkeletonList({ count = 5, showAvatar = false }: { count?: number; showAvatar?: boolean }) {
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const skeletonStyles = getSkeletonStyles(palette);

  return (
    <View style={skeletonStyles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} testID="skeleton-card">
          <SkeletonCard showAvatar={showAvatar} />
        </View>
      ))}
    </View>
  );
}

const getSkeletonStyles = (palette: typeof colors.light) => StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
