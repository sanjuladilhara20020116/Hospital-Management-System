
import React from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar, Divider } from '@mui/material';
import { Dashboard, Description, LocalHospital, Logout, Assignment } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';

const drawerWidth = 240;

export default function Sidebar({ role }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const links = {
    Doctor: [
      { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
      { text: 'Appointments', icon: <Assignment />, path: '/appointments' },
    ],
    Patient: [
      { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
      { text: 'Medical Reports', icon: <Description />, path: '/medical-reports' },
      { text: 'Lab Reports', icon: <Description />, path: '/lab-reports' },
      { text: 'Prescriptions', icon: <LocalHospital />, path: '/prescriptions' },
      { text: 'Appointments', icon: <Assignment />, path: '/appointments' },
    ],
    Pharmacist: [
      { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
      { text: 'Prescriptions', icon: <LocalHospital />, path: '/prescriptions' },
    ],
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: '#f5f5f5',
        },
      }}
    >
      <Toolbar />
      <List>
        {(links[role] || []).map(({ text, icon, path }) => (
          <ListItem button component={Link} to={path} key={text}>
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText primary={text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem button onClick={handleLogout}>
          <ListItemIcon><Logout /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </Drawer>
  );
}
