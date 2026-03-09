import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  TouchableOpacityProps,
  StyleProp,
  ViewStyle,
  TextStyle,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { shadows } from "../../theme/shadows";

interface PremiumButtonProps extends TouchableOpacityProps {
  label: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "small" | "medium" | "large";
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  loading?: boolean;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  label,
  icon,
  variant = "primary",
  size = "medium",
  style,
  textStyle,
  loading = false,
  disabled,
  ...props
}) => {
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;

  const getContainerStyle = (): StyleProp<ViewStyle> => {
    switch (size) {
      case "small":
        return { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 };
      case "large":
        return { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16 };
      case "medium":
      default:
        return { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 };
    }
  };

  const getTextStyle = (): StyleProp<TextStyle> => {
    switch (size) {
      case "small":
        return { fontSize: 14, fontWeight: "600" };
      case "large":
        return { fontSize: 18, fontWeight: "700" };
      case "medium":
      default:
        return { fontSize: 16, fontWeight: "600" };
    }
  };

  const internalDisabled = disabled || loading;

  if (variant === "primary") {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={internalDisabled}
        style={[
          styles.baseButton,
          getContainerStyle(),
          shadows.sm,
          style,
          internalDisabled && styles.disabled,
        ]}
        {...props}
      >
        <LinearGradient
          colors={[palette.primary, palette.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
          // Using a subtle border radius inside the gradient to match the button
        />
        <View style={styles.contentContainer}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text
            style={[styles.text, styles.primaryText, getTextStyle(), textStyle]}
          >
            {loading ? "Cargando..." : label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Handle other variants (secondary, outline, ghost)
  const variantStyles = {
    secondary: { backgroundColor: palette.surfaceAlt },
    outline: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: palette.border,
    },
    ghost: { backgroundColor: "transparent" },
  };

  const variantTextStyles = {
    secondary: { color: palette.text },
    outline: { color: palette.primary },
    ghost: { color: palette.primary },
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={internalDisabled}
      style={[
        styles.baseButton,
        getContainerStyle(),
        variantStyles[variant],
        style,
        internalDisabled && styles.disabled,
      ]}
      {...props}
    >
      <View style={styles.contentContainer}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text
          style={[
            styles.text,
            variantTextStyles[variant],
            getTextStyle(),
            textStyle,
          ]}
        >
          {loading ? "Cargando..." : label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden", // to clip the absolute gradient
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1, // keep content above gradient
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    textAlign: "center",
  },
  primaryText: {
    color: "#ffffff", // Ensures text on gold gradient is always white
  },
  disabled: {
    opacity: 0.5,
  },
});
