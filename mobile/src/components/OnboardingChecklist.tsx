import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { CheckCircle, ChevronRight, X } from "lucide-react-native";
import { clientService } from "../services/clientService";
import { productService } from "../services/productService";
import { eventService } from "../services/eventService";
import { useAuth } from "../contexts/AuthContext";
import { logError } from "../lib/errorHandler";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { shadows } from "../theme/shadows";

interface OnboardingChecklistProps {
  onNavigate: (target: "ClientForm" | "ProductForm" | "EventForm") => void;
}

const STEPS = [
  {
    id: "client",
    title: "Añade tu primer cliente",
    description: "Registra los datos básicos para poder cotizarle.",
    target: "ClientForm" as const,
  },
  {
    id: "product",
    title: "Crea tu primer producto",
    description: "Añade servicios o productos a tu catálogo.",
    target: "ProductForm" as const,
  },
  {
    id: "event",
    title: "Agenda un evento",
    description: "Usa a tu cliente y tus productos para crear tu primera reserva.",
    target: "EventForm" as const,
  },
];

export default function OnboardingChecklist({ onNavigate }: OnboardingChecklistProps) {
  const { user } = useAuth();
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const storageKey = `hideOnboarding_${user?.id || "unknown"}`;

  useEffect(() => {
    if (!user?.id) return;

    const checkState = async () => {
      try {
        const hidden = await SecureStore.getItemAsync(storageKey);
        if (hidden === "true") {
          setDismissed(true);
          setLoading(false);
          return;
        }

        const [clients, products, events] = await Promise.all([
          clientService.getAll().catch(() => []),
          productService.getAll().catch(() => []),
          eventService.getUpcoming(1).catch(() => []),
        ]);

        const state = {
          client: (clients || []).length > 0,
          product: (products || []).length > 0,
          event: (events || []).length > 0,
        };

        setCompleted(state);

        // Auto-dismiss if all complete
        if (state.client && state.product && state.event) {
          await SecureStore.setItemAsync(storageKey, "true");
          setDismissed(true);
        }
      } catch (err) {
        logError("Error loading onboarding state", err);
        setDismissed(true);
      } finally {
        setLoading(false);
      }
    };

    checkState();
  }, [user?.id, storageKey]);

  const handleDismiss = async () => {
    setDismissed(true);
    await SecureStore.setItemAsync(storageKey, "true");
  };

  if (loading || dismissed || !user) return null;

  const completedCount = Object.values(completed).filter(Boolean).length;
  const progress = (completedCount / STEPS.length) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Comienza a usar el sistema</Text>
          <Text style={styles.subtitle}>
            Completa estos 3 pasos sencillos para comenzar.
          </Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X color={colors.light.textTertiary} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressLabel}>
        {completedCount} de {STEPS.length} completados
      </Text>

      {STEPS.map((step) => {
        const isDone = !!completed[step.id];
        return (
          <TouchableOpacity
            key={step.id}
            style={styles.stepRow}
            onPress={() => !isDone && onNavigate(step.target)}
            activeOpacity={isDone ? 1 : 0.7}
            disabled={isDone}
          >
            <View style={[styles.stepIcon, isDone && styles.stepIconDone]}>
              {isDone ? (
                <CheckCircle color={colors.light.success} size={20} />
              ) : (
                <View style={styles.stepIconEmpty} />
              )}
            </View>
            <View style={styles.stepInfo}>
              <Text style={[styles.stepTitle, isDone && styles.stepTitleDone]}>
                {step.title}
              </Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
            {!isDone && <ChevronRight color={colors.light.textTertiary} size={18} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.light.card,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.headline,
    color: colors.light.text,
  },
  subtitle: {
    ...typography.caption1,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: spacing.xxs,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.light.success,
    borderRadius: 3,
  },
  progressLabel: {
    ...typography.caption1,
    color: colors.light.textSecondary,
    marginBottom: spacing.sm,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.light.separator,
    gap: spacing.sm,
  },
  stepIcon: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  stepIconDone: {},
  stepIconEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.light.separator,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    ...typography.subheadline,
    color: colors.light.text,
    fontWeight: "500",
  },
  stepTitleDone: {
    color: colors.light.textTertiary,
    textDecorationLine: "line-through",
  },
  stepDescription: {
    ...typography.caption1,
    color: colors.light.textSecondary,
    marginTop: 1,
  },
});
