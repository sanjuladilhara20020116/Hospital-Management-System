import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Registration from './pages/Registration';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WardManagement from './pages/WardManagement';
import DepartmentManagement from './pages/DepartmentManagement';
import HospitalManagerDashboard from './pages/HospitalManagerDashboard';
import SupplierManagement from './pages/SupplierManagement';
import HomePage from './pages/HomePage';

// Existing new modules
import Inventory from './pages/Inventory';
import Pharmacy from './pages/Pharmacy';

// Health Check Packages flow
import ManagePackages from './pages/ManagePackages';       // Manager CRUD
import HealthcarePackages from './pages/HealthcarePackages'; // Patient browse
import Cart from './pages/Cart';                           // Cart/checkout
import MyBookings from './pages/MyBookings';

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing */}
        <Route path="/" element={<HomePage />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Registration />} />

        {/* Core dashboards/features */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/manager-dashboard" element={<HospitalManagerDashboard />} />
        <Route path="/wards" element={<WardManagement />} />
        <Route path="/departments" element={<DepartmentManagement />} />
        <Route path="/supplier-management" element={<SupplierManagement />} />

        {/* Inventory & Pharmacy */}
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/pharmacy" element={<Pharmacy />} />

        {/* Health Check Packages */}
        <Route path="/manager-packages" element={<ManagePackages />} />
        <Route path="/packages" element={<HealthcarePackages />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/my-bookings" element={<MyBookings />} />
      </Routes>
    </Router>
  );
}

export default App;
