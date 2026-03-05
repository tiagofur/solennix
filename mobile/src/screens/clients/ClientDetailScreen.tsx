import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Edit2,
  Trash2,
  StickyNote,
  ChevronRight,
  DollarSign,
  Plus,
  TrendingUp,
} from "lucide-react-native";
import { ClientStackParamList } from "../../types/navigation";
import { Client, Event } from "../../types/entities";
import { clientService } from "../../services/clientService";
import { eventService } from "../../services/eventService";
import { useToast } from "../../hooks/useToast";
import { logError } from "../../lib/errorHandler";
import {
  LoadingSpinner,
  ConfirmDialog,
  EmptyState,
  Avatar,
} from "../../components/shared";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

type Props = NativeStackScreenProps<ClientStackParamList, "ClientDetail">;

const statusLabels: Record<string, string> = {
  quoted: "Cotizado",
  confirmed: "Confirmado",
  completed: "Completado",
  cancelled: "Cancelado",
};

export default function ClientDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const addToast = useToast((s) => s.addToast);
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);

  const statusColors: Record<string, { bg: string; text: string }> = {
    quoted: { bg: palette.statusQuotedBg, text: palette.statusQuoted },
    confirmed: { bg: palette.statusConfirmedBg, text: palette.statusConfirmed },
    completed: { bg: palette.statusCompletedBg, text: palette.statusCompleted },
    cancelled: { bg: palette.statusCancelledBg, text: palette.statusCancelled },
  };

  const [client, setClient] = useState<Client | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [clientData, eventsData] = await Promise.all([
        clientService.getById(id),
        eventService.getByClientId(id),
      ]);
      setClient(clientData);
      const sorted = (eventsData || []).sort(
        (a, b) =>
          new Date(b.event_date).getTime() - new Date(a.event_date).getTime(),
      );
      setEvents(sorted);
    } catch (err) {
      logError("Error loading client detail", err);
      addToast("Error al cargar cliente", "error");
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleDelete = useCallback(async () => {
    try {
      await clientService.delete(id);
      addToast("Cliente eliminado", "success");
      navigation.goBack();
    } catch (err) {
      logError("Error deleting client", err);
      addToast("Error al eliminar cliente", "error");
    } finally {
      setShowDelete(false);
    }
  }, [id, addToast, navigation]);

  const handleCall = useCallback(() => {
    if (client?.phone) {
      Linking.openURL(`tel:${client.phone}`);
    }
  }, [client]);

  const handleEmail = useCallback(() => {
    if (client?.email) {
      Linking.openURL(`mailto:${client.email}`);
    }
  }, [client]);

  const formatCurrency = (n: number | null) =>
    n != null
      ? `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
      : "$0.00";

  if (loading) return <LoadingSpinner />;
  if (!client) {
    return (
      <EmptyState
        title="Cliente no encontrado"
        description="No se pudo cargar la información del cliente."
      />
    );
  }

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Client Header Card */}
        <View style={styles.headerCard}>
          <View style={{ marginBottom: spacing.sm }}>
            <Avatar name={client.name} photoUrl={client.photo_url} size={72} />
          </View>
          <Text style={styles.clientName}>{client.name}</Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Calendar color={palette.primary} size={16} />
              <Text style={styles.statValue}>{client.total_events ?? 0}</Text>
              <Text style={styles.statLabel}>Eventos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <DollarSign color={palette.success} size={16} />
              <Text style={styles.statValue}>
                {formatCurrency(client.total_spent)}
              </Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            {(client.total_events ?? 0) > 0 && (client.total_spent ?? 0) > 0 && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <TrendingUp color={palette.warning} size={16} />
                  <Text style={styles.statValue}>
                    {formatCurrency((client.total_spent ?? 0) / (client.total_events ?? 1))}
                  </Text>
                  <Text style={styles.statLabel}>Promedio</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de Contacto</Text>

          <TouchableOpacity style={styles.infoRow} onPress={handleCall}>
            <View style={[styles.infoIcon, { backgroundColor: palette.successBg }]}>
              <Phone color={palette.success} size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Teléfono</Text>
              <Text style={styles.infoValue}>{client.phone}</Text>
            </View>
          </TouchableOpacity>

          {client.email && (
            <TouchableOpacity style={styles.infoRow} onPress={handleEmail}>
              <View style={[styles.infoIcon, { backgroundColor: palette.infoBg }]}>
                <Mail color={palette.info} size={16} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{client.email}</Text>
              </View>
            </TouchableOpacity>
          )}

          {client.address && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: palette.warningBg }]}>
                <MapPin color={palette.warning} size={16} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Dirección</Text>
                <Text style={styles.infoValue}>
                  {client.address}
                  {client.city ? `, ${client.city}` : ""}
                </Text>
              </View>
            </View>
          )}

          {client.notes && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: "#f3e8ff" }]}>
                <StickyNote color="#7c3aed" size={16} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Notas</Text>
                <Text style={styles.infoValue}>{client.notes}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.primaryActionBtn]}
            onPress={() => {
              (navigation as any).navigate("HomeTab", {
                screen: "EventForm",
                params: { clientId: id },
              });
            }}
          >
            <Plus color="#fff" size={18} />
            <Text style={styles.primaryActionText}>
              Crear Evento
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate("ClientForm", { id })}
          >
            <Edit2 color={palette.primary} size={18} />
            <Text style={[styles.actionText, { color: palette.primary }]}>
              Editar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => setShowDelete(true)}
          >
            <Trash2 color={palette.error} size={18} />
            <Text style={[styles.actionText, { color: palette.error }]}>
              Eliminar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Event History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Historial de Eventos ({events.length})
          </Text>

          {events.length === 0 ? (
            <Text style={styles.emptyText}>
              Este cliente aún no tiene eventos registrados.
            </Text>
          ) : (
            events.map((event) => {
              const sColor = statusColors[event.status] || statusColors.quoted;
              return (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    (navigation as any).navigate("HomeTab", {
                      screen: "EventDetail",
                      params: { id: event.id },
                    });
                  }}
                >
                  <View style={styles.eventDateBox}>
                    <Text style={styles.eventMonth}>
                      {format(parseISO(event.event_date), "MMM", {
                        locale: es,
                      }).toUpperCase()}
                    </Text>
                    <Text style={styles.eventDay}>
                      {format(parseISO(event.event_date), "d")}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventTypeText}>{event.service_type}</Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: spacing.xs,
                      }}
                    >
                      <Text style={styles.eventPax}>
                        {event.num_people} personas
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: sColor.bg },
                        ]}
                      >
                        <Text
                          style={[styles.statusText, { color: sColor.text }]}
                        >
                          {statusLabels[event.status] || event.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.eventTotal}>
                    {formatCurrency(event.total_amount)}
                  </Text>
                  <ChevronRight color={palette.textTertiary} size={16} />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={showDelete}
        title="Eliminar cliente"
        description={`¿Eliminar a "${client.name}"? Se perderán todos los datos asociados.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </SafeAreaView>
  );
}

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surfaceGrouped,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  // Header card
  headerCard: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderRadius: spacing.borderRadius.xl,
    ...shadows.md,
    padding: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  avatarLargeText: {
    color: palette.textInverse,
    fontWeight: "700",
    fontSize: 28,
  },
  clientName: {
    ...typography.title2,
    color: palette.text,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  statBox: {
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    ...typography.headline,
    color: palette.text,
  },
  statLabel: {
    ...typography.caption1,
    color: palette.textTertiary,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: palette.separator,
  },
  // Section
  section: {
    backgroundColor: palette.card,
    borderRadius: spacing.borderRadius.lg,
    ...shadows.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headline,
    color: palette.text,
    marginBottom: spacing.sm,
  },
  // Info rows
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.separator,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  infoLabel: {
    ...typography.caption1,
    color: palette.textTertiary,
  },
  infoValue: {
    ...typography.body,
    color: palette.text,
  },
  // Actions
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 4,
    backgroundColor: palette.card,
    borderRadius: spacing.borderRadius.md,
    ...shadows.sm,
  },
  primaryActionBtn: {
    backgroundColor: palette.primary,
  },
  primaryActionText: {
    ...typography.headline,
    fontSize: 14,
    color: palette.textInverse,
  },
  deleteBtn: {
    backgroundColor: palette.errorBg,
  },
  actionText: {
    ...typography.headline,
    fontSize: 14,
  },
  emptyText: {
    ...typography.body,
    color: palette.textTertiary,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  // Event cards
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.separator,
    gap: spacing.sm,
  },
  eventDateBox: {
    width: 40,
    height: 40,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: palette.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  eventMonth: {
    fontSize: 8,
    fontWeight: "700",
    color: palette.primary,
    letterSpacing: 0.3,
  },
  eventDay: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.primary,
    lineHeight: 17,
  },
  eventTypeText: {
    ...typography.headline,
    fontSize: 13,
    color: palette.text,
  },
  eventPax: {
    ...typography.caption1,
    color: palette.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: spacing.borderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  eventTotal: {
    ...typography.headline,
    fontSize: 13,
    color: palette.text,
  },
});
