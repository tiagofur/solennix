import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react-native";
import { useToast, ToastType } from "../../hooks/useToast";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";
import { useTheme } from "../../hooks/useTheme";

const { width } = Dimensions.get("window");

const ICON_MAP: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle color="#ffffff" size={20} />,
  error: <AlertCircle color="#ffffff" size={20} />,
  info: <Info color="#ffffff" size={20} />,
};

function ToastItem({
  id,
  message,
  type,
  onDismiss,
  palette,
}: {
  id: string;
  message: string;
  type: ToastType;
  onDismiss: (id: string) => void;
  palette: typeof colors.light;
}) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const styles = getStyles(palette);

  const BG_MAP: Record<ToastType, string> = {
    success: palette.success,
    error: palette.error,
    info: palette.info,
  };

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: BG_MAP[type], transform: [{ translateY }], opacity },
      ]}
    >
      {ICON_MAP[type]}
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      <TouchableOpacity onPress={() => onDismiss(id)} hitSlop={8}>
        <X color="#ffffff" size={18} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={removeToast}
          palette={palette}
        />
      ))}
    </View>
  );
}

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
  container: {
    position: "absolute",
    bottom: spacing.xxxl,
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    width: width - spacing.md * 2,
    borderRadius: spacing.borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    marginBottom: spacing.sm,
    ...shadows.md,
  },
  message: {
    ...typography.body,
    color: "#ffffff",
    flex: 1,
    marginHorizontal: spacing.sm,
  },
});
