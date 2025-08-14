// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Auth / public
import Registration from './pages/Registration';
import Login from './pages/Login';
import HomePage from './pages/HomePage';

// Feature pages
import WardManagement from './pages/WardManagement';
import DepartmentManagement from './pages/DepartmentManagement';
import SupplierManagement from './pages/SupplierManagement';

// Dashboards by role
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import PharmacistDashboard from './pages/PharmacistDashboard';
import HospitalManagerDashboard from './pages/HospitalManagerDashboard';
import LabAdminDashboard from './pages/LabAdminDashboard';

// Existing new modules
import Inventory from './pages/Inventory';
import Pharmacy from './pages/Pharmacy';

// Health Check Packages flow
import ManagePackages from './pages/ManagePackages';
import HealthcarePackages from './pages/HealthcarePackages';
import Cart from './pages/Cart';
import MyBookings from './pages/MyBookings';

/** -------- Small helpers (no UI) -------- */
function getCurrentUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null; // expects { userId, role, ... }
  } catch {
    return null;
  }
}

// Role guard (kept minimal; blocks if not logged in or role not allowed)
function RoleRoute({ allowedRoles, children }) {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    return <div style={{ padding: 24, color: '#c00' }}>Unauthorized Role</div>;
  }
  return children;
}

// Switch dashboard component by role (now passes userId)
function DashboardSwitch() {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'Patient':
      return <PatientDashboard userId={user.userId} />;          // ✅ pass userId
    case 'Doctor':
      return <DoctorDashboard userId={user.userId} />;            // (safe to pass)
    case 'Pharmacist':
      return <PharmacistDashboard userId={user.userId} />;        // (safe to pass)
    case 'HospitalManager':
      return <HospitalManagerDashboard userId={user.userId} />;   // (safe to pass)
    case 'LabAdmin':
      return <LabAdminDashboard userId={user.userId} />;          // (safe to pass)
    default:
      return <div style={{ padding: 24, color: '#c00' }}>Unauthorized Role</div>;
  }
}

/** -------- App routes -------- */
function App() {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Registration />} />

        {/* Unified dashboard route with role guard + switch */}
        <Route
          path="/dashboard"
          element={
            <RoleRoute
              allowedRoles={[
                'Patient',
                'Doctor',
                'Pharmacist',
                'HospitalManager',
                'LabAdmin',
              ]}
            >
              <DashboardSwitch />
            </RoleRoute>
          }
        />

        {/* Manager-only pages */}
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
