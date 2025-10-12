// frontend/src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Auth / public
import Registration from "./pages/Registration";
import Login from "./pages/Login";
import HomePage from "./pages/HomePage";

// Feature pages
import WardManagement from "./pages/WardManagement";
import DepartmentManagement from "./pages/DepartmentManagement";
import SupplierManagement from "./pages/SupplierManagement";

// Dashboards by role
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import PharmacistDashboard from "./pages/PharmacistDashboard";
import HospitalManagerDashboard from "./pages/HospitalManagerDashboard";
import LabAdminDashboard from "./pages/LabAdminDashboard";

// Existing new modules
import Inventory from "./pages/Inventory";
import Pharmacy from "./pages/Pharmacy";

// Health Check Packages flow
import ManagePackages from "./pages/ManagePackages";
import HealthcarePackages from "./pages/HealthcarePackages";
import Cart from "./pages/Cart";
import MyBookings from "./pages/MyBookings";

// Reports
import MyLabReports from "./pages/MyLabReports";
import PatientReportDownload from "./pages/PatientReportDownload";
import ReportAnalysisPage from "./pages/ReportAnalysisPage";
import CholesterolDashboard from "./pages/CholesterolDashboard";
import CholesterolTrendsPage from "./pages/CholesterolTrendsPage";

// Appointments (from dewduniMain)
import AppointmentSearchPage from "./pages/appointments/AppointmentSearchPage";
import PaymentSuccess from "./pages/appointments/PaymentSuccess";
import AppointmentDetails from "./pages/appointments/AppointmentDetails";
import PaymentCheckout from "./pages/appointments/PaymentCheckout";

// Patient Details (doctor view)
import PatientDetails from "./pages/record/PatientDetails";
import PatientDetailsPlaceholder from "./pages/record/PatientDetailsPlaceholder";

// ✅ NEW: Patient Medical Records (read-only)
import PatientMedicalRecords from "./pages/record/PatientMedicalRecords";

// Vaccination module
import DoctorVaccinatePage from "./pages/DoctorVaccinatePage";
import DoctorVaccinations from "./pages/DoctorVaccinations";
import PatientVaccinations from "./pages/PatientVaccinations";
import VaccinationDetail from "./pages/VaccinationDetail";
import DoctorVaccinationSearch from "./pages/DoctorVaccinationSearch";

// BMI (public)
import BMICalculator from "./pages/BMICalculator";
// ✅ NEW: About Us and Contact pages
import AboutUs from "./pages/AboutUs";
import Contact from "./pages/Contact";

// ✅ Persistent shell (Navbar + Footer) in safe mode
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";

/** -------- Small helpers (no UI) -------- */
function getCurrentUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null; // expects { userId, role, ... }
  } catch {
    return null;
  }
}

// Role guard (minimal)
function RoleRoute({ allowedRoles, children }) {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    return <div style={{ padding: 24, color: "#c00" }}>Unauthorized Role</div>;
  }
  return children;
}

// Switch dashboard component by role (passes userId)
function DashboardSwitch() {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  switch (user.role) {
    case "Patient":
      return <PatientDashboard userId={user.userId} />;
    case "Doctor":
      return <DoctorDashboard userId={user.userId} />;
    case "Pharmacist":
      return <PharmacistDashboard userId={user.userId} />;
    case "HospitalManager":
      return <HospitalManagerDashboard userId={user.userId} />;
    case "LabAdmin":
      return <LabAdminDashboard userId={user.userId} />;
    default:
      return <div style={{ padding: 24, color: "#c00" }}>Unauthorized Role</div>;
  }
}

/** -------- App routes -------- */
function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Registration />} />
        
        {/* ✅ NEW: About Us and Contact pages (public routes) */}
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<Contact />} />

        {/* ✅ Public wellness tool */}
        <Route path="/bmi" element={<BMICalculator />} />

        {/* Appointment flow (public entry + checkout + success + details) */}
        <Route path="/appointments" element={<AppointmentSearchPage />} />
        <Route path="/appointments/checkout" element={<PaymentCheckout />} />
        <Route path="/appointments/success" element={<PaymentSuccess />} />
        <Route path="/appointments/details" element={<AppointmentDetails />} />

        {/* Public route for report download */}
        <Route path="/lab-report" element={<PatientReportDownload />} />

        {/* Unified dashboard route with role guard + switch */}
        <Route
          path="/dashboard"
          element={
            <RoleRoute
              allowedRoles={[
                "Patient",
                "Doctor",
                "Pharmacist",
                "HospitalManager",
                "LabAdmin",
              ]}
            >
              <DashboardSwitch />
            </RoleRoute>
          }
        />

        {/* Patient-only My Lab Reports */}
        <Route
          path="/my-reports"
          element={
            <RoleRoute allowedRoles={["Patient"]}>
              <MyLabReports />
            </RoleRoute>
          }
        />

        {/* ✅ NEW: Patient-only Medical Records (read-only) */}
        <Route
          path="/patient/medical-records"
          element={
            <RoleRoute allowedRoles={["Patient"]}>
              <PatientMedicalRecords />
            </RoleRoute>
          }
        />

        {/* Doctor-only Patient Details routes */}
        <Route
          path="/doctor/patients"
          element={
            <RoleRoute allowedRoles={["Doctor"]}>
              <PatientDetailsPlaceholder />
            </RoleRoute>
          }
        />
        <Route
          path="/doctor/patients/:patientId"
          element={
            <RoleRoute allowedRoles={["Doctor"]}>
              <PatientDetails />
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

        {/* Vaccination routes */}
        <Route
          path="/vaccinations/new"
          element={
            <RoleRoute allowedRoles={["Doctor"]}>
              <DoctorVaccinatePage />
            </RoleRoute>
          }
        />

        {/* 🔁 CHANGED: this list page is now for Hospital Managers */}
        <Route
          path="/vaccinations/doctor"
          element={
            <RoleRoute allowedRoles={["HospitalManager"]}>
              <DoctorVaccinations />
            </RoleRoute>
          }
        />

        <Route
          path="/vaccinations/mine"
          element={
            <RoleRoute allowedRoles={["Patient"]}>
              <PatientVaccinations />
            </RoleRoute>
          }
        />

        {/* 🔁 CHANGED: allow Hospital Manager to open details too */}
        <Route
          path="/vaccinations/:id"
          element={
            <RoleRoute allowedRoles={["Doctor", "Patient", "HospitalManager"]}>
              <VaccinationDetail />
            </RoleRoute>
          }
        />

        <Route
          path="/vaccinations/home"
          element={
            <RoleRoute allowedRoles={["Doctor"]}>
              <DoctorVaccinationSearch />
            </RoleRoute>
          }
        />
        {/* SAFE MODE: All routes wrapped with Layout to inject Navbar + Footer without altering page logic */}
        <Route element={<Layout />}>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Registration />} />

          {/* ✅ NEW: About Us and Contact pages (public routes) */}
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<Contact />} />

          {/* ✅ Public wellness tool */}
          <Route path="/bmi" element={<BMICalculator />} />

          {/* Appointment flow (public entry + checkout + success + details) */}
          <Route path="/appointments" element={<AppointmentSearchPage />} />
          <Route path="/appointments/checkout" element={<PaymentCheckout />} />
          <Route path="/appointments/success" element={<PaymentSuccess />} />
          <Route path="/appointments/details" element={<AppointmentDetails />} />

          {/* Public route for report download */}
          <Route path="/lab-report" element={<PatientReportDownload />} />

          {/* Unified dashboard route with role guard + switch */}
          <Route
            path="/dashboard"
            element={
              <RoleRoute
                allowedRoles={[
                  "Patient",
                  "Doctor",
                  "Pharmacist",
                  "HospitalManager",
                  "LabAdmin",
                ]}
              >
                <DashboardSwitch />
              </RoleRoute>
            }
          />

          {/* Patient-only My Lab Reports */}
          <Route
            path="/my-reports"
            element={
              <RoleRoute allowedRoles={["Patient"]}>
                <MyLabReports />
              </RoleRoute>
            }
          />

          {/* ✅ NEW: Patient-only Medical Records (read-only) */}
          <Route
            path="/patient/medical-records"
            element={
              <RoleRoute allowedRoles={["Patient"]}>
                <PatientMedicalRecords />
              </RoleRoute>
            }
          />

          {/* Doctor-only Patient Details routes */}
          <Route
            path="/doctor/patients"
            element={
              <RoleRoute allowedRoles={["Doctor"]}>
                <PatientDetailsPlaceholder />
              </RoleRoute>
            }
          />
          <Route
            path="/doctor/patients/:patientId"
            element={
              <RoleRoute allowedRoles={["Doctor"]}>
                <PatientDetails />
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

          {/* Vaccination routes (keep current hub as /vaccinations/home) */}
          <Route
            path="/vaccinations/new"
            element={
              <RoleRoute allowedRoles={["Doctor"]}>
                <DoctorVaccinatePage />
              </RoleRoute>
            }
          />
          <Route
            path="/vaccinations/doctor"
            element={
              <RoleRoute allowedRoles={["Doctor"]}>
                <DoctorVaccinations />
              </RoleRoute>
            }
          />
          <Route
            path="/vaccinations/mine"
            element={
              <RoleRoute allowedRoles={["Patient"]}>
                <PatientVaccinations />
              </RoleRoute>
            }
          />
          <Route
            path="/vaccinations/:id"
            element={
              <RoleRoute allowedRoles={["Doctor", "Patient"]}>
                <VaccinationDetail />
              </RoleRoute>
            }
          />
          <Route
            path="/vaccinations/home"
            element={
              <RoleRoute allowedRoles={["Doctor"]}>
                <DoctorVaccinationSearch />
              </RoleRoute>
            }
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
