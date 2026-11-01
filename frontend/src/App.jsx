import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Public Pages
import HomePage from './pages/public/HomePage';
import AboutPage from './pages/public/AboutPage';
import ContactPage from './pages/public/ContactPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';

// Manager Dashboard Pages
import ProtectedRoute from './components/common/ProtectedRoute';
import MainDashboard from './pages/dashboard/MainDashboard';
import PropertiesPage from './pages/dashboard/PropertiesPage';
import EventsPage from './pages/dashboard/EventsPage';
import PricingPage from './pages/dashboard/PricingPage';
import ForecastLabPage from './pages/dashboard/ForecastLabPage';
import AnalyticsPage from './pages/dashboard/AnalyticsPage';
import DataManagementPage from './pages/dashboard/DataManagementPage';

// Customer / User Dashboard Pages
import CustomerLayout from './pages/customer/CustomerLayout';
import UserWelcomePage from './pages/customer/UserWelcomePage';
import UserPropertiesPage from './pages/customer/UserPropertiesPage';
import MyBookingsPage from './pages/customer/MyBookingsPage';
import UserProfilePage from './pages/customer/UserProfilePage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Website Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* User / Customer Dashboard Routes */}
          <Route element={<ProtectedRoute allowedRoles={['customer', 'user', 'hospitality_manager', 'administrator']} showSidebar={false} />}>
            <Route path="/user" element={<CustomerLayout />}>
              <Route index element={<UserWelcomePage />} />
              <Route path="properties" element={<UserPropertiesPage />} />
              <Route path="bookings" element={<MyBookingsPage />} />
              <Route path="profile" element={<UserProfilePage />} />
            </Route>
          </Route>

          {/* Hospitality Manager Dashboard Routes */}
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['hospitality_manager', 'administrator']} showSidebar={true} />}>
            <Route index element={<MainDashboard />} />
            <Route path="properties" element={<PropertiesPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="forecast" element={<ForecastLabPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="data" element={<DataManagementPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
