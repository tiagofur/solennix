import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CatalogStackParamList } from "../types/navigation";
import ProductListScreen from "../screens/catalog/ProductListScreen";
import ProductFormScreen from "../screens/catalog/ProductFormScreen";
import ProductDetailScreen from "../screens/catalog/ProductDetailScreen";
import InventoryListScreen from "../screens/catalog/InventoryListScreen";
import InventoryFormScreen from "../screens/catalog/InventoryFormScreen";

const Stack = createNativeStackNavigator<CatalogStackParamList>();

export default function CatalogStack() {
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
        options={{ title: "Productos" }}
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
      <Stack.Screen
        name="InventoryList"
        component={InventoryListScreen}
        options={{ title: "Inventario" }}
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
