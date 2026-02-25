import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ClientStackParamList } from "../types/navigation";
import ClientListScreen from "../screens/clients/ClientListScreen";
import ClientFormScreen from "../screens/clients/ClientFormScreen";
import ClientDetailScreen from "../screens/clients/ClientDetailScreen";

const Stack = createNativeStackNavigator<ClientStackParamList>();

export default function ClientStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Atrás",
      }}
    >
      <Stack.Screen
        name="ClientList"
        component={ClientListScreen}
        options={{ title: "Clientes" }}
      />
      <Stack.Screen
        name="ClientForm"
        component={ClientFormScreen}
        options={({ route }) => ({
          title: route.params?.id ? "Editar Cliente" : "Nuevo Cliente",
        })}
      />
      <Stack.Screen
        name="ClientDetail"
        component={ClientDetailScreen}
        options={{ title: "Detalle del Cliente" }}
      />
    </Stack.Navigator>
  );
}
