import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MainTabParamList } from "../types/navigation";
import HomeStack from "./HomeStack";
import CalendarStack from "./CalendarStack";
import ClientStack from "./ClientStack";
import CatalogStack from "./CatalogStack";
import ProfileStack from "./ProfileStack";
import {
  Home,
  CalendarDays,
  Users,
  Package,
  Settings,
} from "lucide-react-native";
import { useTheme } from "../hooks/useTheme";
import { colors } from "../theme/colors";

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.tabBar.active,
        tabBarInactiveTintColor: palette.tabBar.inactive,
        tabBarStyle: {
          backgroundColor: palette.tabBar.background,
          borderTopColor: palette.tabBarBorder,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: "Inicio",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarStack}
        options={{
          tabBarLabel: "Calendario",
          tabBarIcon: ({ color, size }) => (
            <CalendarDays color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="ClientTab"
        component={ClientStack}
        options={{
          tabBarLabel: "Clientes",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="CatalogTab"
        component={CatalogStack}
        options={{
          tabBarLabel: "Catálogo",
          tabBarIcon: ({ color, size }) => (
            <Package color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: "Más",
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
