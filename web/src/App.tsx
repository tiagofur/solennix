import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { logError } from "@/lib/errorHandler";

// ── Lazy-loaded pages (code-split per route) ──
const Landing = React.lazy(() => import("@/pages/Landing").then((m) => ({ default: m.Landing })));
const Login = React.lazy(() => import("@/pages/Login").then((m) => ({ default: m.Login })));
const Register = React.lazy(() => import("@/pages/Register").then((m) => ({ default: m.Register })));
const ForgotPassword = React.lazy(() => import("@/pages/ForgotPassword").then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = React.lazy(() => import("@/pages/ResetPassword").then((m) => ({ default: m.ResetPassword })));
const About = React.lazy(() => import("@/pages/About").then((m) => ({ default: m.About })));
const Privacy = React.lazy(() => import("@/pages/Privacy").then((m) => ({ default: m.Privacy })));
const Terms = React.lazy(() => import("@/pages/Terms").then((m) => ({ default: m.Terms })));
const NotFound = React.lazy(() => import("@/pages/NotFound").then((m) => ({ default: m.NotFound })));

const Dashboard = React.lazy(() => import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const SearchPage = React.lazy(() => import("@/pages/Search").then((m) => ({ default: m.SearchPage })));
const Settings = React.lazy(() => import("@/pages/Settings").then((m) => ({ default: m.Settings })));
const Pricing = React.lazy(() => import("@/pages/Pricing").then((m) => ({ default: m.Pricing })));

const EventList = React.lazy(() => import("@/pages/Events/EventList").then((m) => ({ default: m.EventList })));
const EventForm = React.lazy(() => import("@/pages/Events/EventForm").then((m) => ({ default: m.EventForm })));
const EventSummary = React.lazy(() => import("@/pages/Events/EventSummary").then((m) => ({ default: m.EventSummary })));
const EventPaymentSuccess = React.lazy(() => import("@/pages/Events/EventPaymentSuccess"));

const ClientList = React.lazy(() => import("@/pages/Clients/ClientList").then((m) => ({ default: m.ClientList })));
const ClientForm = React.lazy(() => import("@/pages/Clients/ClientForm").then((m) => ({ default: m.ClientForm })));
const ClientDetails = React.lazy(() => import("@/pages/Clients/ClientDetails").then((m) => ({ default: m.ClientDetails })));

const ProductList = React.lazy(() => import("@/pages/Products/ProductList").then((m) => ({ default: m.ProductList })));
const ProductForm = React.lazy(() => import("@/pages/Products/ProductForm").then((m) => ({ default: m.ProductForm })));
const ProductDetails = React.lazy(() => import("@/pages/Products/ProductDetails").then((m) => ({ default: m.ProductDetails })));

const InventoryList = React.lazy(() => import("@/pages/Inventory/InventoryList").then((m) => ({ default: m.InventoryList })));
const InventoryForm = React.lazy(() => import("@/pages/Inventory/InventoryForm").then((m) => ({ default: m.InventoryForm })));
const InventoryDetails = React.lazy(() => import("@/pages/Inventory/InventoryDetails").then((m) => ({ default: m.InventoryDetails })));

const CalendarView = React.lazy(() => import("@/pages/Calendar/CalendarView").then((m) => ({ default: m.CalendarView })));
const QuickQuotePage = React.lazy(() => import("@/pages/QuickQuote/QuickQuotePage").then((m) => ({ default: m.QuickQuotePage })));
const PublicEventFormPage = React.lazy(() => import("@/pages/PublicEventForm/PublicEventFormPage").then((m) => ({ default: m.PublicEventFormPage })));

const EventFormLinksPage = React.lazy(() => import("@/pages/EventForms/EventFormLinksPage").then((m) => ({ default: m.EventFormLinksPage })));

const AdminDashboard = React.lazy(() => import("@/pages/Admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard })));
const AdminUsers = React.lazy(() => import("@/pages/Admin/AdminUsers").then((m) => ({ default: m.AdminUsers })));

// ── Loading fallback ──
function PageFallback() {
  return (
    <div className="flex justify-center items-center h-64 animate-fade-in" role="status" aria-live="polite">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-hidden="true" />
      <span className="sr-only">Cargando página...</span>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ErrorBoundary onError={(error, info) => logError('React ErrorBoundary', error)}>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/register" element={<Register />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/form/:token" element={<PublicEventFormPage />} />

              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/search" element={<SearchPage />} />

                <Route path="/calendar" element={<CalendarView />} />
                <Route path="/cotizacion-rapida" element={<QuickQuotePage />} />
                <Route path="/events" element={<EventList />} />
                <Route path="/events/new" element={<EventForm />} />
                <Route path="/events/:id/edit" element={<EventForm />} />
                <Route path="/events/:id/summary" element={<EventSummary />} />
                <Route path="/events/:id/payment-success" element={<EventPaymentSuccess />} />

                <Route path="/clients" element={<ClientList />} />
                <Route path="/clients/new" element={<ClientForm />} />
                <Route path="/clients/:id" element={<ClientDetails />} />
                <Route path="/clients/:id/edit" element={<ClientForm />} />

                <Route path="/products" element={<ProductList />} />
                <Route path="/products/new" element={<ProductForm />} />
                <Route path="/products/:id" element={<ProductDetails />} />
                <Route path="/products/:id/edit" element={<ProductForm />} />

                <Route path="/inventory" element={<InventoryList />} />
                <Route path="/inventory/new" element={<InventoryForm />} />
                <Route path="/inventory/:id" element={<InventoryDetails />} />
                <Route path="/inventory/:id/edit" element={<InventoryForm />} />

                <Route path="/event-forms" element={<EventFormLinksPage />} />
                <Route path="/settings" element={<Settings />} />

                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
              </Route>

              <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
