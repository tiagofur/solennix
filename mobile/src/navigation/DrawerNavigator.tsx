import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { DrawerParamList } from "../types/navigation";
import MainTabs from "./MainTabs";
import ProductStack from "./ProductStack";
import InventoryStack from "./InventoryStack";
import SettingsStack from "./SettingsStack";
import SearchScreen from "../screens/home/SearchScreen";
import CustomDrawerContent from "../components/navigation/CustomDrawerContent";
import DrawerMenuButton from "../components/navigation/DrawerMenuButton";

const Drawer = createDrawerNavigator<DrawerParamList>();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        drawerStyle: {
          width: 280,
        },
        swipeEnabled: true,
      }}
    >
      <Drawer.Screen name="TabsScreen" component={MainTabs} />
      <Drawer.Screen
        name="ProductStack"
        component={ProductStack}
        options={{ title: "Productos" }}
      />
      <Drawer.Screen
        name="InventoryStack"
        component={InventoryStack}
        options={{ title: "Inventario" }}
      />
      <Drawer.Screen
        name="SearchScreen"
        component={SearchScreen}
        options={{
          title: "Búsqueda",
          headerShown: true,
          headerLeft: () => <DrawerMenuButton />,
        }}
      />
      <Drawer.Screen
        name="SettingsStack"
        component={SettingsStack}
        options={{ title: "Configuración" }}
      />
    </Drawer.Navigator>
  );
}
