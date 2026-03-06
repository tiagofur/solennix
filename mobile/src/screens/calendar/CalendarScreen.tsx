import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";

// Parse a yyyy-MM-dd string as LOCAL date to avoid UTC midnight shifting the day in negative-offset timezones
const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};
import { es } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Search,
  List,
} from "lucide-react-native";
import { CalendarStackParamList } from "../../types/navigation";
import { Event } from "../../types/entities";
import { eventService } from "../../services/eventService";
import { useToast } from "../../hooks/useToast";
import { useTheme } from "../../hooks/useTheme";
import { logError } from "../../lib/errorHandler";
import { SegmentedControl } from "../../components/shared";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

type Props = NativeStackScreenProps<CalendarStackParamList, "CalendarView">;

type EventWithClient = Event & { clients?: { name: string } | null };

const STATUS_OPTIONS = [
  { key: "all", label: "Todos" },
  { key: "quoted", label: "Cotizado" },
  { key: "confirmed", label: "Confirmado" },
  { key: "completed", label: "Completado" },
  { key: "cancelled", label: "Cancelado" },
] as const;

const getStatusColors = (palette: typeof colors.light): Record<string, string> => ({
  quoted: palette.statusQuoted,
  confirmed: palette.statusConfirmed,
  completed: palette.statusCompleted,
  cancelled: palette.statusCancelled,
});

const getStatusBgColors = (palette: typeof colors.light): Record<string, string> => ({
  quoted: palette.statusQuotedBg,
  confirmed: palette.statusConfirmedBg,
  completed: palette.statusCompletedBg,
  cancelled: palette.statusCancelledBg,
});

const getStatusLabel = (status: string): string => {
  switch (status) {
    case "quoted": return "Cotizado";
    case "confirmed": return "Confirmado";
    case "completed": return "Completado";
    case "cancelled": return "Cancelado";
    default: return status;
  }
};

export default function CalendarScreen({ navigation }: Props) {
  const addToast = useToast((s) => s.addToast);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventWithClient[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState(0); // 0 = calendar, 1 = list
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;
  const styles = getStyles(palette);
  const statusColors = getStatusColors(palette);
  const statusBgColors = getStatusBgColors(palette);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("EventForm", {
              eventDate: selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined,
            })
          }
          style={{ marginRight: 8 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Plus color={palette.primary} size={22} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, selectedDate, palette.primary]);

  const loadEvents = useCallback(async () => {
    try {
      const now = new Date();
      const start = format(startOfMonth(subMonths(now, 6)), "yyyy-MM-dd");
      const end = format(endOfMonth(addMonths(now, 6)), "yyyy-MM-dd");
      const data = await eventService.getByDateRange(start, end);
      setEvents(data || []);
    } catch (err) {
      logError("Error loading calendar events", err);
      addToast("Error al cargar eventos", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadEvents();
    }, [loadEvents]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  const getEventsForDate = (date: Date) => {
    return events.filter((e) => isSameDay(parseLocalDate(e.event_date), date));
  };

  const currentMonthEvents = useMemo(() => {
    return events.filter((e) => {
      const d = parseLocalDate(e.event_date);
      return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
  }, [events, currentDate]);

  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const firstDayOfMonth = startOfMonth(currentDate).getDay();
  const daysToRender = Array(firstDayOfMonth).fill(null).concat(monthDays);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleGoToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const filteredListEvents = useMemo(() => {
    return events
      .filter((e) => {
        const matchesSearch =
          !searchTerm ||
          (e.client?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.service_type || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.location || "").toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" || e.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => b.event_date.localeCompare(a.event_date));
  }, [events, searchTerm, statusFilter]);

  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const renderEventCard = (event: EventWithClient) => (
    <TouchableOpacity
      key={event.id}
      style={styles.eventCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate("EventDetail", { id: event.id })}
    >
      <View
        style={[
          styles.eventDotFull,
          { backgroundColor: statusColors[event.status] || palette.textTertiary },
        ]}
      />
      <View style={styles.eventInfo}>
        {event.clients?.name ? (
          <Text style={styles.eventName}>{event.clients.name}</Text>
        ) : null}
        <Text style={event.clients?.name ? styles.eventDetail : styles.eventName}>
          {event.service_type}
        </Text>
        <Text style={styles.eventDetail}>
          {format(parseLocalDate(event.event_date), "d MMM yyyy", { locale: es })}
          {" \u2022 "}
          {event.num_people} personas
          {event.location ? ` \u2022 ${event.location}` : ""}
        </Text>
      </View>
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: statusBgColors[event.status] || palette.surface },
        ]}
      >
        <Text
          style={[
            styles.statusBadgeText,
            { color: statusColors[event.status] || palette.textSecondary },
          ]}
        >
          {getStatusLabel(event.status)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* View mode toggle */}
      <View style={styles.toggleRow}>
        <SegmentedControl
          segments={["Calendario", "Lista"]}
          selectedIndex={viewMode}
          onChange={setViewMode}
        />
      </View>

      {viewMode === 0 ? (
        /* ========== CALENDAR VIEW ========== */
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
              <ChevronLeft color={palette.textTertiary} size={24} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {format(currentDate, "MMMM yyyy", { locale: es }).toUpperCase()}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <TouchableOpacity onPress={handleGoToToday} style={styles.todayButton}>
                <Text style={styles.todayButtonText}>Hoy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
                <ChevronRight color={palette.textTertiary} size={24} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.weekDays}>
            {weekDays.map((day) => (
              <View key={day} style={styles.weekDayCell}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.calendar}>
            {daysToRender.map((day, index) => {
              if (!day) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }

              const dayEvents = getEventsForDate(day);
              const hasEvents = dayEvents.length > 0;
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                  onPress={() => setSelectedDate(day)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isToday && !isSelected && styles.dayTextToday,
                    ]}
                  >
                    {format(day, "d")}
                  </Text>
                  {hasEvents && (
                    <View style={styles.eventDots}>
                      {dayEvents.slice(0, 3).map((e, i) => (
                        <View
                          key={i}
                          style={[
                            styles.eventDot,
                            { backgroundColor: statusColors[e.status] || palette.textTertiary },
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.eventsList}>
            <Text style={styles.eventsTitle}>
              {selectedDate
                ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es })
                : "Selecciona un día"}
            </Text>

            {selectedDateEvents.length === 0 ? (
              <View style={styles.emptyDay}>
                <CalendarIcon color={palette.textTertiary} size={32} />
                <Text style={styles.emptyDayText}>
                  No hay eventos programados
                </Text>
                {selectedDate && (
                  <TouchableOpacity
                    style={styles.createEventButton}
                    activeOpacity={0.7}
                    onPress={() =>
                      (navigation as any).navigate("HomeTab", {
                        screen: "EventForm",
                        params: { eventDate: format(selectedDate, "yyyy-MM-dd") },
                      })
                    }
                  >
                    <Plus color={palette.textInverse} size={16} />
                    <Text style={styles.createEventText}>Crear Evento</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <ScrollView
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
              >
                {selectedDateEvents.map(renderEventCard)}
              </ScrollView>
            )}
          </View>
        </>
      ) : (
        /* ========== LIST VIEW ========== */
        <View style={styles.listContainer}>
          {/* Search */}
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Search color={palette.textMuted} size={16} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por cliente o servicio..."
                placeholderTextColor={palette.textMuted}
                value={searchTerm}
                onChangeText={setSearchTerm}
                autoCapitalize="none"
                returnKeyType="search"
              />
            </View>
          </View>

          {/* Status filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
            contentContainerStyle={styles.filterContent}
          >
            {STATUS_OPTIONS.map((opt) => {
              const isActive = statusFilter === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.filterChip,
                    isActive && styles.filterChipActive,
                  ]}
                  onPress={() => setStatusFilter(opt.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && styles.filterChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Results count */}
          <Text style={styles.resultCount}>
            {filteredListEvents.length} evento{filteredListEvents.length !== 1 ? "s" : ""}
          </Text>

          {/* Event list */}
          {filteredListEvents.length === 0 ? (
            <View style={styles.emptyDay}>
              <List color={palette.textTertiary} size={32} />
              <Text style={styles.emptyDayText}>
                No se encontraron eventos
              </Text>
              <Text style={[styles.emptyDayText, { fontSize: 14 }]}>
                Intenta ajustar los filtros de búsqueda
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredListEvents}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => renderEventCard(item)}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: spacing.xxxl }}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surfaceGrouped,
  },
  toggleRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.card,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.sm,
  },
  todayButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: palette.primary,
  },
  todayButtonText: {
    ...typography.caption1,
    color: palette.primary,
    fontWeight: "600",
  },
  monthTitle: {
    ...typography.headline,
    color: palette.text,
  },
  weekDays: {
    flexDirection: "row",
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  weekDayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  weekDayText: {
    ...typography.caption1,
    color: palette.textTertiary,
    fontWeight: "600",
  },
  calendar: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.sm,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
  },
  dayCellSelected: {
    backgroundColor: palette.primary,
    borderRadius: spacing.borderRadius.full,
  },
  dayCellToday: {
    backgroundColor: palette.primaryLight,
    borderRadius: spacing.borderRadius.full,
    borderWidth: 2,
    borderColor: palette.primary,
  },
  dayText: {
    ...typography.body,
    color: palette.text,
  },
  dayTextSelected: {
    color: "#ffffff", // Always white — selected background is always orange (#ff6b35) in both themes
    fontWeight: "700",
  },
  dayTextToday: {
    color: palette.primary,
    fontWeight: "700",
  },
  eventDots: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  eventsList: {
    flex: 1,
    backgroundColor: palette.card,
    marginTop: spacing.md,
    borderTopLeftRadius: spacing.borderRadius.xl,
    borderTopRightRadius: spacing.borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  eventsTitle: {
    ...typography.headline,
    color: palette.text,
    marginBottom: spacing.md,
    textTransform: "capitalize",
  },
  emptyDay: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyDayText: {
    ...typography.body,
    color: palette.textSecondary,
  },
  createEventButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.full,
    marginTop: spacing.sm,
  },
  createEventText: {
    ...typography.subheadline,
    color: palette.textInverse,
    fontWeight: "600",
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.card,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    ...shadows.sm,
  },
  eventDotFull: {
    width: 8,
    height: 40,
    borderRadius: 4,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    ...typography.subheadline,
    fontWeight: "600",
    color: palette.text,
  },
  eventDetail: {
    ...typography.caption1,
    color: palette.textSecondary,
  },
  eventStatus: {
    ...typography.caption1,
    color: palette.textSecondary,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: spacing.borderRadius.full,
  },
  statusBadgeText: {
    ...typography.caption1,
    fontWeight: "600",
  },
  // List view styles
  listContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  searchRow: {
    marginBottom: spacing.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    ...typography.body,
    flex: 1,
    color: palette.text,
    paddingVertical: spacing.sm + 2,
  },
  filterRow: {
    maxHeight: 40,
    marginBottom: spacing.sm,
  },
  filterContent: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.borderRadius.full,
    backgroundColor: palette.surface,
  },
  filterChipActive: {
    backgroundColor: palette.primary,
  },
  filterChipText: {
    ...typography.caption1,
    color: palette.textSecondary,
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: palette.textInverse,
    fontWeight: "600",
  },
  resultCount: {
    ...typography.caption1,
    color: palette.textMuted,
    marginBottom: spacing.sm,
  },
});
