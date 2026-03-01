import React from "react";
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MainTabParamList } from "../types/navigation";
import HomeStack from "./HomeStack";
import CalendarStack from "./CalendarStack";
import ClientStack from "./ClientStack";
import {
  Home,
  CalendarDays,
  Users,
  Plus,
  Menu,
} from "lucide-react-native";
import { useTheme } from "../hooks/useTheme";
import { colors } from "../theme/colors";
import { DrawerActions, useNavigation } from "@react-navigation/native";

const Tab = createBottomTabNavigator<MainTabParamList>();

// Placeholder component — never rendered (tab press is intercepted)
function EmptyScreen() {
  return null;
}

export default function MainTabs() {
  const { isDark } = useTheme();
  const palette = isDark ? colors.dark : colors.light;

  return (
    <Tab.Navigator
      screenListeners={{
        tabPress: () => {
          if (Platform.OS === "ios") {
            Haptics.selectionAsync();
          }
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.tabBar.active,
        tabBarInactiveTintColor: palette.tabBar.inactive,
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: 0,
          backgroundColor: "transparent",
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
        ),
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
        name="NewEventPlaceholder"
        component={EmptyScreen}
        options={{
          tabBarLabel: "",
          tabBarIcon: () => (
            <View style={styles.fabContainer}>
              <View style={[styles.fab, { backgroundColor: palette.primary }]}>
                <Plus color="#fff" size={28} />
              </View>
            </View>
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              onPress={props.onPress}
              activeOpacity={0.8}
              style={styles.fabTouchable}
            >
              {props.children}
            </TouchableOpacity>
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            if (Platform.OS === "ios") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            (navigation as any).navigate("HomeTab", {
              screen: "EventForm",
              params: {},
            });
          },
        })}
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
        name="DrawerToggle"
        component={EmptyScreen}
        options={{
          tabBarLabel: "Menú",
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            if (Platform.OS === "ios") {
              Haptics.selectionAsync();
            }
            navigation.dispatch(DrawerActions.openDrawer());
          },
        })}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    top: -14,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  fabTouchable: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
