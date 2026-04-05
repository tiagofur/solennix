import React from "react";
import { Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { Landing } from "@/pages/Landing";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
import { Dashboard } from "@/pages/Dashboard";
import { SearchPage } from "@/pages/Search";
import { ClientList } from "@/pages/Clients/ClientList";
import { ClientForm } from "@/pages/Clients/ClientForm";
import { ClientDetails } from "@/pages/Clients/ClientDetails";
import { ProductList } from "@/pages/Products/ProductList";
import { ProductForm } from "@/pages/Products/ProductForm";
import { InventoryList } from "@/pages/Inventory/InventoryList";
import { InventoryForm } from "@/pages/Inventory/InventoryForm";
import { InventoryDetails } from "@/pages/Inventory/InventoryDetails";
import { ProductDetails } from "@/pages/Products/ProductDetails";
import { CalendarView } from "@/pages/Calendar/CalendarView";
import { EventList } from "@/pages/Events/EventList";
import { EventForm } from "@/pages/Events/EventForm";
import { EventSummary } from "@/pages/Events/EventSummary";
import EventPaymentSuccess from "@/pages/Events/EventPaymentSuccess";
import { Settings } from "@/pages/Settings";
import { Pricing } from "@/pages/Pricing";
import { ForgotPassword } from "@/pages/ForgotPassword";
import { ResetPassword } from "@/pages/ResetPassword";
import { About } from "@/pages/About";
import { Privacy } from "@/pages/Privacy";
import { Terms } from "@/pages/Terms";
import { NotFound } from "@/pages/NotFound";
import { AdminDashboard } from "@/pages/Admin/AdminDashboard";
import { AdminUsers } from "@/pages/Admin/AdminUsers";
import { QuickQuotePage } from "@/pages/QuickQuote/QuickQuotePage";

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/search" element={<SearchPage />} />

            {/* Rutas de Calendario y Eventos */}
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/cotizacion-rapida" element={<QuickQuotePage />} />
            <Route path="/events" element={<EventList />} />
            <Route path="/events/new" element={<EventForm />} />
            <Route path="/events/:id/edit" element={<EventForm />} />
            <Route path="/events/:id/summary" element={<EventSummary />} />
            <Route
              path="/events/:id/payment-success"
              element={<EventPaymentSuccess />}
            />

            {/* Rutas de Clientes */}
            <Route path="/clients" element={<ClientList />} />
            <Route path="/clients/new" element={<ClientForm />} />
            <Route path="/clients/:id" element={<ClientDetails />} />
            <Route path="/clients/:id/edit" element={<ClientForm />} />

            {/* Rutas de Productos */}
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/new" element={<ProductForm />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route path="/products/:id/edit" element={<ProductForm />} />

            {/* Rutas de Inventario */}
            <Route path="/inventory" element={<InventoryList />} />
            <Route path="/inventory/new" element={<InventoryForm />} />
            <Route path="/inventory/:id" element={<InventoryDetails />} />
            <Route path="/inventory/:id/edit" element={<InventoryForm />} />

            <Route path="/settings" element={<Settings />} />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              }
            />
          </Route>
          <Route
            path="/pricing"
            element={
              <ProtectedRoute>
                <Pricing />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
