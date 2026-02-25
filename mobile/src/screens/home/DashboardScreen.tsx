import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HomeStackParamList } from "../../types/navigation";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type Props = NativeStackScreenProps<HomeStackParamList, "Dashboard">;

export default function DashboardScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Bienvenido a EventosApp</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Próximos Eventos</Text>
        <Text style={styles.placeholder}>— Se implementará en Fase 2 —</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen del Mes</Text>
        <Text style={styles.placeholder}>— Se implementará en Fase 2 —</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.light.text,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    ...typography.body,
    color: colors.light.textSecondary,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.light.text,
    marginBottom: spacing.sm,
  },
  placeholder: {
    ...typography.body,
    color: colors.light.textMuted,
    fontStyle: "italic",
  },
});
