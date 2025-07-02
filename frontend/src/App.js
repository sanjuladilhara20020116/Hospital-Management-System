import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Registration from './pages/Registration';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WardManagement from './pages/WardManagement'; // ✅ Only once
import DepartmentManagement from './pages/DepartmentManagement';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Registration />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/wards" element={<WardManagement />} />
        <Route path="/departments" element={<DepartmentManagement />} />
      </Routes>
    </Router>
  );
}

export default App;
