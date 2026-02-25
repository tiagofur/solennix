import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../types/navigation";
import SettingsScreen from "../screens/profile/SettingsScreen";
import PricingScreen from "../screens/profile/PricingScreen";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Atrás",
      }}
    >
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Ajustes" }}
      />
      <Stack.Screen
        name="Pricing"
        component={PricingScreen}
        options={{ title: "Planes" }}
      />
    </Stack.Navigator>
  );
}
