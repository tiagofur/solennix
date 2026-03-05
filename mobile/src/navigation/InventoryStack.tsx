import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { InventoryStackParamList } from "../types/navigation";
import InventoryListScreen from "../screens/catalog/InventoryListScreen";
import InventoryDetailsScreen from "../screens/catalog/InventoryDetailsScreen";
import InventoryFormScreen from "../screens/catalog/InventoryFormScreen";
import DrawerMenuButton from "../components/navigation/DrawerMenuButton";

const Stack = createNativeStackNavigator<InventoryStackParamList>();

export default function InventoryStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="InventoryList"
        component={InventoryListScreen}
        options={{
          title: "Inventario",
          headerLeft: () => <DrawerMenuButton />,
        }}
      />
      <Stack.Screen
        name="InventoryDetail"
        component={InventoryDetailsScreen}
        options={{ title: "Detalle de Ítem" }}
      />
      <Stack.Screen
        name="InventoryForm"
        component={InventoryFormScreen}
        options={({ route }) => ({
          title: route.params?.id ? "Editar Item" : "Nuevo Item",
        })}
      />
    </Stack.Navigator>
  );
}
