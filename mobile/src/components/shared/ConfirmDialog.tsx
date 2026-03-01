import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { AppBottomSheet } from "./AppBottomSheet";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AppBottomSheet visible={visible} onClose={onCancel}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}

        <TouchableOpacity
          style={[
            styles.confirmButton,
            destructive && styles.destructiveButton,
          ]}
          onPress={onConfirm}
          activeOpacity={0.7}
        >
          <Text style={styles.confirmText}>{confirmLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>{cancelLabel}</Text>
        </TouchableOpacity>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  title: {
    ...typography.title3,
    color: colors.light.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.body,
    color: colors.light.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  confirmButton: {
    backgroundColor: colors.light.primary,
    borderRadius: spacing.borderRadius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  destructiveButton: {
    backgroundColor: colors.light.error,
  },
  confirmText: {
    ...typography.headline,
    color: colors.light.textInverse,
  },
  cancelButton: {
    backgroundColor: colors.light.surface,
    borderRadius: spacing.borderRadius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
  },
  cancelText: {
    ...typography.headline,
    color: colors.light.primary,
  },
});
