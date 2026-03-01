import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { useTheme } from "../../hooks/useTheme";

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function SegmentedControl({
  segments,
  selectedIndex,
  onChange,
}: SegmentedControlProps) {
  const indicatorX = useSharedValue(0);
  const segmentWidth = useSharedValue(0);
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width / segments.length;
      segmentWidth.value = width;
      indicatorX.value = withSpring(selectedIndex * width, {
        damping: 20,
        stiffness: 300,
      });
    },
    [segments.length, selectedIndex]
  );

  const handlePress = useCallback(
    (index: number) => {
      if (index === selectedIndex) return;
      indicatorX.value = withSpring(index * segmentWidth.value, {
        damping: 20,
        stiffness: 300,
      });
      if (Platform.OS === "ios") {
        Haptics.selectionAsync();
      }
      onChange(index);
    },
    [selectedIndex, onChange, segmentWidth]
  );

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: segmentWidth.value,
  }));

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Animated.View style={[styles.indicator, indicatorStyle]} />
      {segments.map((segment, index) => (
        <TouchableOpacity
          key={index}
          style={styles.segment}
          onPress={() => handlePress(index)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.segmentText,
              selectedIndex === index && styles.segmentTextActive,
            ]}
          >
            {segment}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: palette.surface,
    borderRadius: spacing.borderRadius.md,
    padding: 2,
    position: "relative",
  },
  indicator: {
    position: "absolute",
    top: 2,
    bottom: 2,
    backgroundColor: palette.card,
    borderRadius: spacing.borderRadius.md - 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    zIndex: 1,
  },
  segmentText: {
    ...typography.caption,
    fontWeight: "500",
    color: palette.textSecondary,
  },
  segmentTextActive: {
    color: palette.text,
    fontWeight: "600",
  },
});
