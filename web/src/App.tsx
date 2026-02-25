import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { SearchPage } from './pages/Search';
import { ClientList } from './pages/Clients/ClientList';
import { ClientForm } from './pages/Clients/ClientForm';
import { ClientDetails } from './pages/Clients/ClientDetails';
import { ProductList } from './pages/Products/ProductList';
import { ProductForm } from './pages/Products/ProductForm';
import { InventoryList } from './pages/Inventory/InventoryList';
import { InventoryForm } from './pages/Inventory/InventoryForm';
import { CalendarView } from './pages/Calendar/CalendarView';
import { EventForm } from './pages/Events/EventForm';
import { EventSummary } from './pages/Events/EventSummary';
// import EventPaymentSuccess from './pages/Events/EventPaymentSuccess'; // HIDDEN: Requires per-user Stripe config
import { Settings } from './pages/Settings';
import { Pricing } from './pages/Pricing';
import { ForgotPassword } from './pages/ForgotPassword';
import { NotFound } from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/register" element={<Register />} />
        
        <Route element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/search" element={<SearchPage />} />
          
          {/* Rutas de Calendario y Eventos */}
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/events/new" element={<EventForm />} />
          <Route path="/events/:id/edit" element={<EventForm />} />
          <Route path="/events/:id/summary" element={<EventSummary />} />
          {/* <Route path="/events/:id/payment-success" element={<EventPaymentSuccess />} /> */}
          {/* HIDDEN: Event payment via Stripe requires per-user Stripe configuration */}

          {/* Rutas de Clientes */}
          <Route path="/clients" element={<ClientList />} />
          <Route path="/clients/new" element={<ClientForm />} />
          <Route path="/clients/:id" element={<ClientDetails />} />
          <Route path="/clients/:id/edit" element={<ClientForm />} />

          {/* Rutas de Productos */}
          <Route path="/products" element={<ProductList />} />
          <Route path="/products/new" element={<ProductForm />} />
          <Route path="/products/:id/edit" element={<ProductForm />} />

          {/* Rutas de Inventario */}
          <Route path="/inventory" element={<InventoryList />} />
          <Route path="/inventory/new" element={<InventoryForm />} />
          <Route path="/inventory/:id/edit" element={<InventoryForm />} />

          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="/pricing" element={
          <ProtectedRoute>
            <Pricing />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
