import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SettingsStackParamList } from "../types/navigation";
import SettingsScreen from "../screens/profile/SettingsScreen";
import EditProfileScreen from "../screens/profile/EditProfileScreen";
import ChangePasswordScreen from "../screens/profile/ChangePasswordScreen";
import BusinessSettingsScreen from "../screens/profile/BusinessSettingsScreen";
import ContractDefaultsScreen from "../screens/profile/ContractDefaultsScreen";
import PricingScreen from "../screens/profile/PricingScreen";
import AboutScreen from "../screens/profile/AboutScreen";
import PrivacyPolicyScreen from "../screens/profile/PrivacyPolicyScreen";
import TermsScreen from "../screens/profile/TermsScreen";
import DrawerMenuButton from "../components/navigation/DrawerMenuButton";

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: "Ajustes",
          headerLeft: () => <DrawerMenuButton />,
        }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: "Editar Perfil" }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: "Cambiar Contraseña" }}
      />
      <Stack.Screen
        name="BusinessSettings"
        component={BusinessSettingsScreen}
        options={{ title: "Negocio" }}
      />
      <Stack.Screen
        name="ContractDefaults"
        component={ContractDefaultsScreen}
        options={{ title: "Contratos" }}
      />
      <Stack.Screen
        name="Pricing"
        component={PricingScreen}
        options={{ title: "Planes" }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Terms"
        component={TermsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
