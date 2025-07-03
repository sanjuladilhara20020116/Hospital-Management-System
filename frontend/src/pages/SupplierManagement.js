import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Typography, Paper, Grid,
  Snackbar, Alert, IconButton
} from '@mui/material';
import axios from 'axios';
import DeleteIcon from '@mui/icons-material/Delete';

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState({
    name: '', contactPerson: '', phone: '', email: '', address: '',
    items: [{ code: '', description: '', quantity: '', unitPrice: '', date: '' }]
  });
  const [editId, setEditId] = useState(null);
  const [alert, setAlert] = useState({ open: false, severity: 'info', message: '' });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/suppliers/');
      setSuppliers(res.data);
    } catch {
      showAlert('error', 'Failed to load suppliers');
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index, e) => {
    const updated = [...form.items];
    updated[index][e.target.name] = e.target.value;

    const quantity = parseFloat(updated[index].quantity || 0);
    const unitPrice = parseFloat(updated[index].unitPrice || 0);
    updated[index].price = quantity * unitPrice;

    setForm({ ...form, items: updated });
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { code: '', description: '', quantity: '', unitPrice: '', date: '', price: '' }]
    });
  };

  const removeItem = (index) => {
    const updated = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: updated });
  };

  const handleSubmit = async () => {
    try {
      const totalPrice = form.items.reduce((sum, item) => sum + (item.price || 0), 0);

      const dataToSend = {
        ...form,
        totalPrice,
        items: form.items.map(item => ({
          ...item,
          price: item.quantity * item.unitPrice
        }))
      };

      if (editId) {
        await axios.put(`http://localhost:5000/api/suppliers/${editId}`, dataToSend);
        showAlert('success', 'Supplier updated');
      } else {
        await axios.post('http://localhost:5000/api/suppliers/', dataToSend);
        showAlert('success', 'Supplier added');
      }

      fetchSuppliers();
      setForm({
        name: '', contactPerson: '', phone: '', email: '', address: '',
        items: [{ code: '', description: '', quantity: '', unitPrice: '', date: '', price: '' }]
      });
      setEditId(null);
    } catch (err) {
      showAlert('error', 'Failed to save supplier');
    }
  };

  const handleEdit = (supplier) => {
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      items: supplier.items || []
    });
    setEditId(supplier._id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/suppliers/${id}`);
      showAlert('info', 'Supplier deleted');
      fetchSuppliers();
    } catch {
      showAlert('error', 'Delete failed');
    }
  };

  const showAlert = (severity, message) => {
    setAlert({ open: true, severity, message });
  };

  return (
    <Box p={4}>
      <Typography variant="h5" gutterBottom>📦 Medical Supplier Management</Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2}>
          {['name', 'contactPerson', 'phone', 'email', 'address'].map(field => (
            <Grid item xs={12} sm={6} key={field}>
              <TextField
                label={field.replace(/([A-Z])/g, ' $1')}
                fullWidth name={field} value={form[field]} onChange={handleChange}
              />
            </Grid>
          ))}
        </Grid>

        <Typography mt={2}>📋 Supply Items</Typography>
        {form.items.map((item, i) => (
          <Grid container spacing={2} key={i} alignItems="center" sx={{ mb: 1 }}>
            <Grid item xs={12} sm={2}>
              <TextField label="Code" name="code" value={item.code} onChange={(e) => handleItemChange(i, e)} fullWidth />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField label="Description" name="description" value={item.description} onChange={(e) => handleItemChange(i, e)} fullWidth />
            </Grid>
            <Grid item xs={6} sm={1.5}>
              <TextField label="Qty" type="number" name="quantity" value={item.quantity} onChange={(e) => handleItemChange(i, e)} fullWidth />
            </Grid>
            <Grid item xs={6} sm={1.5}>
              <TextField label="Unit Price" type="number" name="unitPrice" value={item.unitPrice} onChange={(e) => handleItemChange(i, e)} fullWidth />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField label="Date" type="date" name="date" value={item.date} onChange={(e) => handleItemChange(i, e)} fullWidth InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6} sm={1}>
              <IconButton onClick={() => removeItem(i)}><DeleteIcon color="error" /></IconButton>
            </Grid>
          </Grid>
        ))}

        <Button onClick={addItem}>➕ Add Item</Button>

        <Button variant="contained" onClick={handleSubmit} sx={{ mt: 2 }}>
          {editId ? 'Update Supplier' : 'Add Supplier'}
        </Button>
      </Paper>

      {/* Display List */}
      <Grid container spacing={2}>
        {suppliers.map(s => (
          <Grid item xs={12} md={6} key={s._id}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">{s.name}</Typography>
              <Typography variant="body2">Contact: {s.contactPerson} | {s.phone}</Typography>
              <Typography variant="body2">Email: {s.email}</Typography>
              <Typography variant="subtitle2" mt={1}>Items:</Typography>
              {s.items.map((item, idx) => (
                <Typography key={idx} sx={{ fontSize: '0.85rem', ml: 1 }}>
                  🔹 {item.code} | {item.description} | {item.quantity} × {item.unitPrice} = {item.price?.toFixed(2)} | {new Date(item.date).toLocaleDateString()}
                </Typography>
              ))}
              <Typography variant="subtitle2" mt={1}>Total Price: Rs. {s.totalPrice?.toFixed(2)}</Typography>
              <Box mt={1}>
                <Button size="small" onClick={() => handleEdit(s)}>✏️ Edit</Button>
                <Button size="small" color="error" onClick={() => handleDelete(s._id)}>🗑 Delete</Button>
                <Button
                  size="small"
                  onClick={() => window.open(`http://localhost:5000/api/suppliers/${s._id}/pdf`, '_blank')}
                >
                  🧾 Download PDF
                </Button>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Snackbar open={alert.open} autoHideDuration={4000} onClose={() => setAlert({ ...alert, open: false })}>
        <Alert severity={alert.severity} variant="filled" sx={{ width: '100%' }}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
