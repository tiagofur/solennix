import React, { useCallback } from "react";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  Theme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SplashScreen from "expo-splash-screen";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../hooks/useTheme";
import { RootStackParamList } from "../types/navigation";
import { colors } from "../theme/colors";
import AuthStack from "./AuthStack";
import DrawerNavigator from "./DrawerNavigator";

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking = {
  prefixes: ["solennix://"],
  config: {
    screens: {
      Auth: {
        screens: {
          ResetPassword: "reset-password",
        },
      },
    },
  },
};

export default function RootNavigator() {
  const { user, loading } = useAuth();
  const { isDark, loaded } = useTheme();

  const onLayoutReady = useCallback(() => {
    if (!loading && loaded) {
      SplashScreen.hideAsync();
    }
  }, [loading, loaded]);

  if (loading || !loaded) {
    return null;
  }

  const palette = isDark ? colors.dark : colors.light;

  const navTheme: Theme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: palette.primary,
      background: palette.background,
      card: palette.card,
      text: palette.text,
      border: palette.border,
      notification: palette.error,
    },
  };

  return (
    <NavigationContainer theme={navTheme} linking={linking} onReady={onLayoutReady}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={DrawerNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
