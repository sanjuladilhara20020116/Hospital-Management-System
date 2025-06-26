// frontend/src/components/DashboardLayout.js
import React from 'react';
import {
  Box, Typography, Card, CardContent, CardActions, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, Avatar
} from '@mui/material';
import Sidebar from './Sidebar';

export default function DashboardLayout({
  title,
  user,
  imagePreview,
  editMode,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  deleteDialogOpen,
  onDeleteConfirm,
  onDeleteCancel,
  alert,
  onAlertClose,
  children
}) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>{title}</Typography>

        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={imagePreview}
              sx={{ width: 80, height: 80 }}
            />
            <Box>
              <Typography variant="h6">{user.firstName} {user.lastName}</Typography>
              <Typography>User ID: {user.userId}</Typography>
              <Typography>Email: {user.email}</Typography>
            </Box>
          </CardContent>

          <CardContent>{children}</CardContent>

          <CardActions>
            {editMode ? (
              <>
                <Button variant="contained" color="primary" onClick={onSave}>Save</Button>
                <Button variant="outlined" color="secondary" onClick={onCancel}>Cancel</Button>
              </>
            ) : (
              <>
                <Button variant="contained" onClick={onEdit}>Edit Profile</Button>
                <Button variant="outlined" color="error" onClick={onDelete}>Delete Profile</Button>
              </>
            )}
          </CardActions>
        </Card>

        <Snackbar open={alert.open} autoHideDuration={4000} onClose={onAlertClose}>
          <Alert severity={alert.severity} variant="filled" sx={{ width: '100%' }}>
            {alert.message}
          </Alert>
        </Snackbar>

        <Dialog open={deleteDialogOpen} onClose={onDeleteCancel}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            Are you sure you want to delete your profile? This action cannot be undone.
          </DialogContent>
          <DialogActions>
            <Button onClick={onDeleteCancel}>Cancel</Button>
            <Button color="error" onClick={onDeleteConfirm}>Delete</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
