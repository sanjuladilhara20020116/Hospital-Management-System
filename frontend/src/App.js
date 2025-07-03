import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Registration from './pages/Registration';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WardManagement from './pages/WardManagement';
import DepartmentManagement from './pages/DepartmentManagement';
import HospitalManagerDashboard from './pages/HospitalManagerDashboard';
import SupplierManagement from './pages/SupplierManagement';
import HomePage from './pages/HomePage'; // ✅ Import advanced homepage

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />               {/* ✅ Now the landing page */}
        <Route path="/login" element={<Login />} />             {/* 🔁 Changed login to /login */}
        <Route path="/register" element={<Registration />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/wards" element={<WardManagement />} />
        <Route path="/departments" element={<DepartmentManagement />} />
        <Route path="/manager-dashboard" element={<HospitalManagerDashboard />} />
        <Route path="/supplier-management" element={<SupplierManagement />} />
      </Routes>
    </Router>
  );
}

export default App;
