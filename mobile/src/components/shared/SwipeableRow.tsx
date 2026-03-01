import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { Edit2, Trash2 } from "lucide-react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { useTheme } from "../../hooks/useTheme";

interface SwipeAction {
  label: string;
  icon: "edit" | "delete";
  color: string;
  backgroundColor: string;
  onPress: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  rightActions?: SwipeAction[];
}

export function SwipeableRow({
  children,
  onEdit,
  onDelete,
  rightActions,
}: SwipeableRowProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);

  const close = useCallback(() => {
    swipeableRef.current?.close();
  }, []);

  const handleAction = useCallback(
    (action: () => void) => {
      close();
      if (Platform.OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      action();
    },
    [close]
  );

  const renderRightActions = useCallback(() => {
    const actions = rightActions || [];

    if (!rightActions) {
      if (onEdit) {
        actions.push({
          label: "Editar",
          icon: "edit",
          color: "#fff",
          backgroundColor: palette.primary,
          onPress: onEdit,
        });
      }
      if (onDelete) {
        actions.push({
          label: "Eliminar",
          icon: "delete",
          color: "#fff",
          backgroundColor: palette.error,
          onPress: onDelete,
        });
      }
    }

    if (actions.length === 0) return null;

    return (
      <View style={styles.actionsContainer}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.actionButton, { backgroundColor: action.backgroundColor }]}
            onPress={() => handleAction(action.onPress)}
            activeOpacity={0.8}
          >
            {action.icon === "edit" ? (
              <Edit2 color={action.color} size={18} />
            ) : (
              <Trash2 color={action.color} size={18} />
            )}
            <Text style={[styles.actionLabel, { color: action.color }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [rightActions, onEdit, onDelete, handleAction, palette, styles]);

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      {children}
    </Swipeable>
  );
}

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
  actionsContainer: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  actionButton: {
    width: 72,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xxs,
  },
  actionLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "600",
  },
});
