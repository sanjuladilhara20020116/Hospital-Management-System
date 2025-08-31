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

// ✅ Your additional pages
import MyLabReports from './pages/MyLabReports';
import PatientReportDownload from './pages/PatientReportDownload';

import ReportAnalysisPage from "./pages/ReportAnalysisPage";
import CholesterolDashboard from "./pages/CholesterolDashboard";
import CholesterolTrendsPage from "./pages/CholesterolTrendsPage";

// ✅ Vaccination pages (added)
import DoctorVaccinatePage from './pages/DoctorVaccinatePage';
import DoctorVaccinations from './pages/DoctorVaccinations';
import PatientVaccinations from './pages/PatientVaccinations';
import VaccinationDetail from './pages/VaccinationDetail';
import DoctorVaccinationSearch from './pages/DoctorVaccinationSearch';

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

        {/* ✅ Your extra public route for report download page */}
        <Route path="/lab-report" element={<PatientReportDownload />} />

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

        {/* ✅ Your patient-only My Lab Reports route */}
        <Route
          path="/my-reports"
          element={
            <RoleRoute allowedRoles={['Patient']}>
              <MyLabReports />
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

        {/* Report analysis */}
        <Route path="/reports/:id/analysis" element={<ReportAnalysisPage />} />
        <Route path="/cholesterol/:id" element={<CholesterolDashboard />} />
        <Route path="/cholesterol-trends/:patientId" element={<CholesterolTrendsPage />} />

        {/* ✅ Vaccination routes (with role guards) */}
        <Route
          path="/vaccinations/new"
          element={
            <RoleRoute allowedRoles={['Doctor']}>
              <DoctorVaccinatePage />
            </RoleRoute>
          }
        />
        <Route
          path="/vaccinations/doctor"
          element={
            <RoleRoute allowedRoles={['Doctor']}>
              <DoctorVaccinations />
            </RoleRoute>
          }
        />
        <Route
          path="/vaccinations/mine"
          element={
            <RoleRoute allowedRoles={['Patient']}>
              <PatientVaccinations />
            </RoleRoute>
          }
        />
        <Route
          path="/vaccinations/:id"
          element={
            <RoleRoute allowedRoles={['Doctor', 'Patient']}>
              <VaccinationDetail />
            </RoleRoute>
          }
        />
        <Route
          path="/vaccinations/home"
          element={
            <RoleRoute allowedRoles={['Doctor']}>
              <DoctorVaccinationSearch />
            </RoleRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
