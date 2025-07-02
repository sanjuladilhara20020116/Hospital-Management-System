import React, { useEffect, useState } from 'react';
import DoctorDashboard from './DoctorDashboard';
import PatientDashboard from './PatientDashboard';
import PharmacistDashboard from './PharmacistDashboard';
import HospitalManagerDashboard from './HospitalManagerDashboard'; // import your manager dashboard

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // loading state

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (err) {
        console.error("Failed to parse user:", err);
        localStorage.removeItem('user'); // clear corrupted data
      }
    }
    setLoading(false); // stop loading in either case
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!user || !user.role || !user.userId) {
    return <div>⚠️ Invalid user session. Please log in again.</div>;
  }

  switch (user.role) {
    case 'Doctor':
      return <DoctorDashboard userId={user.userId} />;
    case 'Patient':
      return <PatientDashboard userId={user.userId} />;
    case 'Pharmacist':
      return <PharmacistDashboard userId={user.userId} />;
    case 'HospitalManager':  // handle manager role
     return <HospitalManagerDashboard userId={user.userId} />;
    default:
      return <div>🚫 Unauthorized Role</div>;
  }
}
