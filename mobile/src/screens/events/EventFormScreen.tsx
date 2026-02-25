import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export default function EventFormScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>
        Formulario de Evento — Se implementará en Fase 1
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  placeholder: {
    ...typography.body,
    color: colors.light.textMuted,
    fontStyle: "italic",
  },
});
