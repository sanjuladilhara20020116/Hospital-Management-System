
// src/components/CartButton.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Fab, Badge, Tooltip } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

// if you use a proxy, set to '' instead.
const API_BASE = 'http://localhost:5000';
const USER_ID = 'demo-user-1'; // TODO: replace with real logged-in user id

export default function CartButton() {
  const [count, setCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/cart`, {
        headers: { 'x-user-id': USER_ID }
      });
      const data = await res.json();
      const totalItems = (data.items || []).reduce((s, it) => s + (it.quantity || 0), 0);
      setCount(totalItems);
    } catch (e) {
      // ignore errors silently
    }
  }, []);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Listen for global "cart:updated" events to refresh count
  useEffect(() => {
    const handler = () => fetchCount();
    window.addEventListener('cart:updated', handler);
    return () => window.removeEventListener('cart:updated', handler);
  }, [fetchCount]);

  // Hide button on the actual cart page
  if (location.pathname === '/cart') return null;

  return (
    <Tooltip title="View Cart">
      <Fab
        color="primary"
        onClick={() => navigate('/cart')}
        sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1500 }}
        aria-label="view cart"
      >
        <Badge
          badgeContent={count}
          color="secondary"
          overlap="circular"
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <ShoppingCartIcon />
        </Badge>
      </Fab>
    </Tooltip>
  );
}
