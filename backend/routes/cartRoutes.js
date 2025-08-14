const express = require('express');
const Cart = require('../models/Cart');
const Package = require('../models/Package');
const router = express.Router();

// Simple user id getter (replace with real auth later)
function getUserId(req) {
  return req.headers['x-user-id'] || null;
}

// GET /api/cart  -> current cart
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req) || 'demo-user';
    const cart = await Cart.findOne({ userId }) || new Cart({ userId, items: [] });
    res.json(cart);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load cart' });
  }
});

// POST /api/cart/add  -> add package to cart
router.post('/add', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ message: 'Missing user id (x-user-id header)' });

    const { packageId, quantity = 1 } = req.body || {};
    if (!packageId) return res.status(400).json({ message: 'packageId is required' });

    const pkg = await Package.findById(packageId);
    if (!pkg) return res.status(404).json({ message: 'Package not found' });

    const q = Math.max(1, Number(quantity) || 1);
    const cart = (await Cart.findOne({ userId })) || new Cart({ userId, items: [] });

    const existing = cart.items.find(i => String(i.packageId) === String(packageId));
    if (existing) {
      existing.quantity += q;
    } else {
      cart.items.push({
        packageId: pkg._id,
        packageName: pkg.name,
        unitPrice: pkg.price,
        quantity: q
      });
    }

    await cart.save();
    res.status(201).json({ message: 'Added to cart', cart });
  } catch (e) {
    console.error('Add to cart error:', e);
    res.status(500).json({ message: e.message || 'Failed to add to cart' });
  }
});

// PUT /api/cart/item/:itemId -> change qty
router.put('/item/:itemId', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ message: 'Missing user id (x-user-id header)' });
    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const it = cart.items.id(req.params.itemId);
    if (!it) return res.status(404).json({ message: 'Item not found' });

    const q = Math.max(1, Number(req.body.quantity) || 1);
    it.quantity = q;
    await cart.save();
    res.json({ message: 'Quantity updated', cart });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update quantity' });
  }
});

// DELETE /api/cart/item/:itemId -> remove
router.delete('/item/:itemId', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ message: 'Missing user id (x-user-id header)' });
    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const it = cart.items.id(req.params.itemId);
    if (!it) return res.status(404).json({ message: 'Item not found' });

    it.deleteOne();
    await cart.save();
    res.json({ message: 'Item removed', cart });
  } catch (e) {
    res.status(500).json({ message: 'Failed to remove item' });
  }
});

module.exports = router;
