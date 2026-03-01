import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
} from "lucide-react-native";
import { Event } from "../types/entities";
import { eventService } from "../services/eventService";
import { logError } from "../lib/errorHandler";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { shadows } from "../theme/shadows";
import { useTheme } from "../hooks/useTheme";

type EventWithClient = Event & {
  client?: { name: string } | null;
};

export default function PendingEventsModal() {
  const [pendingEvents, setPendingEvents] = useState<EventWithClient[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);

  useEffect(() => {
    const fetchPendingEvents = async () => {
      try {
        const data = await eventService.getAll();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const pastConfirmed = (data || []).filter((e: any) => {
          if (e.status !== "confirmed") return false;
          const eventDate = new Date(e.event_date + "T00:00:00");
          return eventDate < today;
        });

        if (pastConfirmed.length > 0) {
          setPendingEvents(pastConfirmed);
          setIsOpen(true);
        }
      } catch (err) {
        logError("Error loading pending events", err);
      }
    };

    fetchPendingEvents();
  }, []);

  const handleUpdateStatus = async (
    eventId: string,
    newStatus: "completed" | "cancelled",
  ) => {
    try {
      setUpdatingId(eventId);
      await eventService.update(eventId, { status: newStatus as any });
      setPendingEvents((prev) => {
        const updated = prev.filter((e) => e.id !== eventId);
        if (updated.length === 0) {
          setIsOpen(false);
        }
        return updated;
      });
    } catch (err) {
      logError(`Error updating event ${eventId}`, err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isOpen || pendingEvents.length === 0) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setIsOpen(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <AlertCircle color={palette.primary} size={24} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.title}>Eventos Pendientes de Cierre</Text>
              <Text style={styles.subtitle}>
                Tienes {pendingEvents.length} evento(s) confirmados en una fecha
                pasada. Marca si ya fueron completados o cancelados.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsOpen(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X color={palette.textMuted} size={22} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {pendingEvents.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName} numberOfLines={1}>
                    {(event as any).client_name || event.service_type}
                  </Text>
                  <Text style={styles.eventDate}>
                    {format(
                      parseISO(event.event_date),
                      "dd 'de' MMMM, yyyy",
                      { locale: es },
                    )}
                  </Text>
                </View>
                <View style={styles.eventActions}>
                  <TouchableOpacity
                    style={styles.completeBtn}
                    onPress={() => handleUpdateStatus(event.id, "completed")}
                    disabled={updatingId === event.id}
                  >
                    {updatingId === event.id ? (
                      <ActivityIndicator color={palette.textInverse} size="small" />
                    ) : (
                      <>
                        <CheckCircle color={palette.textInverse} size={16} />
                        <Text style={styles.completeBtnText}>Completar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleUpdateStatus(event.id, "cancelled")}
                    disabled={updatingId === event.id}
                  >
                    <XCircle color={palette.textInverse} size={16} />
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setIsOpen(false)}
          >
            <Text style={styles.closeBtnText}>Cerrar por ahora</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  container: {
    backgroundColor: palette.card,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    ...shadows.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    ...typography.headline,
    color: palette.text,
  },
  subtitle: {
    ...typography.caption1,
    color: palette.textSecondary,
    marginTop: spacing.xxs,
  },
  list: {
    maxHeight: 300,
  },
  eventCard: {
    backgroundColor: palette.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  eventInfo: {
    marginBottom: spacing.sm,
  },
  eventName: {
    ...typography.subheadline,
    color: palette.text,
    fontWeight: "600",
  },
  eventDate: {
    ...typography.caption1,
    color: palette.textSecondary,
    marginTop: 2,
  },
  eventActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  completeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: palette.success,
    borderRadius: spacing.borderRadius.sm,
    paddingVertical: spacing.sm,
  },
  completeBtnText: {
    ...typography.caption1,
    color: palette.textInverse,
    fontWeight: "600",
  },
  cancelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: palette.error,
    borderRadius: spacing.borderRadius.sm,
    paddingVertical: spacing.sm,
  },
  cancelBtnText: {
    ...typography.caption1,
    color: palette.textInverse,
    fontWeight: "600",
  },
  closeBtn: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.separator,
  },
  closeBtnText: {
    ...typography.body,
    color: palette.textSecondary,
  },
});
