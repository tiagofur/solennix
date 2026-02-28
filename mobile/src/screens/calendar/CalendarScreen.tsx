import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react-native";
import { CalendarStackParamList } from "../../types/navigation";
import { Event } from "../../types/entities";
import { eventService } from "../../services/eventService";
import { useToast } from "../../hooks/useToast";
import { logError } from "../../lib/errorHandler";
import { EmptyState } from "../../components/shared";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

type Props = NativeStackScreenProps<CalendarStackParamList, "CalendarView">;

const statusColors: Record<string, string> = {
  quoted: colors.light.statusQuoted,
  confirmed: colors.light.statusConfirmed,
  completed: colors.light.statusCompleted,
  cancelled: colors.light.statusCancelled,
};

export default function CalendarScreen({ navigation }: Props) {
  const addToast = useToast((s) => s.addToast);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      const start = format(startOfMonth(currentDate), "yyyy-MM-dd");
      const end = format(endOfMonth(currentDate), "yyyy-MM-dd");
      const data = await eventService.getByDateRange(start, end);
      setEvents(data || []);
    } catch (err) {
      logError("Error loading calendar events", err);
      addToast("Error al cargar eventos", "error");
    } finally {
      setLoading(false);
    }
  }, [currentDate, addToast]);

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
    return events.filter((e) => isSameDay(parseISO(e.event_date), date));
  };

  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const firstDayOfMonth = startOfMonth(currentDate).getDay();
  const daysToRender = Array(firstDayOfMonth).fill(null).concat(monthDays);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
          <ChevronLeft color={colors.light.textTertiary} size={24} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {format(currentDate, "MMMM yyyy", { locale: es }).toUpperCase()}
        </Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
          <ChevronRight color={colors.light.textTertiary} size={24} />
        </TouchableOpacity>
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
                        { backgroundColor: statusColors[e.status] || colors.light.textTertiary },
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
            <CalendarIcon color={colors.light.textTertiary} size={32} />
            <Text style={styles.emptyDayText}>
              No hay eventos programados
            </Text>
          </View>
        ) : (
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {selectedDateEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate("EventDetail", { id: event.id })}
              >
                <View
                  style={[
                    styles.eventDotFull,
                    { backgroundColor: statusColors[event.status] || colors.light.textTertiary },
                  ]}
                />
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName}>{event.service_type}</Text>
                  <Text style={styles.eventDetail}>
                    {event.num_people} personas
                    {event.location ? ` \u2022 ${event.location}` : ""}
                  </Text>
                </View>
                <Text style={styles.eventStatus}>
                  {event.status === "quoted"
                    ? "Cotizado"
                    : event.status === "confirmed"
                    ? "Confirmado"
                    : event.status === "completed"
                    ? "Completado"
                    : "Cancelado"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.surfaceGrouped,
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
    backgroundColor: colors.light.card,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.sm,
  },
  monthTitle: {
    ...typography.headline,
    color: colors.light.text,
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
    color: colors.light.textTertiary,
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
    backgroundColor: colors.light.primary,
    borderRadius: spacing.borderRadius.full,
  },
  dayCellToday: {
    backgroundColor: colors.light.primaryLight,
    borderRadius: spacing.borderRadius.full,
    borderWidth: 2,
    borderColor: colors.light.primary,
  },
  dayText: {
    ...typography.body,
    color: colors.light.text,
  },
  dayTextSelected: {
    color: colors.light.textInverse,
    fontWeight: "700",
  },
  dayTextToday: {
    color: colors.light.primary,
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
    backgroundColor: colors.light.card,
    marginTop: spacing.md,
    borderTopLeftRadius: spacing.borderRadius.xl,
    borderTopRightRadius: spacing.borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  eventsTitle: {
    ...typography.headline,
    color: colors.light.text,
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
    color: colors.light.textSecondary,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.card,
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
    color: colors.light.text,
  },
  eventDetail: {
    ...typography.caption1,
    color: colors.light.textSecondary,
  },
  eventStatus: {
    ...typography.caption1,
    color: colors.light.textSecondary,
    fontWeight: "600",
  },
});
