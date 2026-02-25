import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeStackParamList } from "../types/navigation";
import DashboardScreen from "../screens/home/DashboardScreen";
import SearchScreen from "../screens/home/SearchScreen";
import EventFormScreen from "../screens/events/EventFormScreen";
import EventDetailScreen from "../screens/events/EventDetailScreen";

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Atrás",
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: "Inicio" }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: "Buscar" }}
      />
      <Stack.Screen
        name="EventForm"
        component={EventFormScreen}
        options={({ route }) => ({
          title: route.params?.id ? "Editar Evento" : "Nuevo Evento",
        })}
      />
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ title: "Detalle del Evento" }}
      />
    </Stack.Navigator>
  );
}
