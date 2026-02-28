import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ProductStackParamList } from "../types/navigation";
import ProductListScreen from "../screens/catalog/ProductListScreen";
import ProductFormScreen from "../screens/catalog/ProductFormScreen";
import ProductDetailScreen from "../screens/catalog/ProductDetailScreen";
import DrawerMenuButton from "../components/navigation/DrawerMenuButton";

const Stack = createNativeStackNavigator<ProductStackParamList>();

export default function ProductStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Atrás",
      }}
    >
      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
        options={{
          title: "Productos",
          headerLeft: () => <DrawerMenuButton />,
        }}
      />
      <Stack.Screen
        name="ProductForm"
        component={ProductFormScreen}
        options={({ route }) => ({
          title: route.params?.id ? "Editar Producto" : "Nuevo Producto",
        })}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: "Detalle del Producto" }}
      />
    </Stack.Navigator>
  );
}
