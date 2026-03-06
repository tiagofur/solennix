import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CalendarStackParamList } from "../types/navigation";
import CalendarScreen from "../screens/calendar/CalendarScreen";
import EventDetailScreen from "../screens/events/EventDetailScreen";
import EventFormScreen from "../screens/events/EventFormScreen";

const Stack = createNativeStackNavigator<CalendarStackParamList>();

export default function CalendarStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="CalendarView"
        component={CalendarScreen}
        options={{ title: "Calendario" }}
      />
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ title: "Detalle del Evento" }}
      />
      <Stack.Screen
        name="EventForm"
        component={EventFormScreen}
        options={({ route }) => ({
          title: route.params?.id ? "Editar Evento" : "Nuevo Evento",
        })}
      />
    </Stack.Navigator>
  );
}
