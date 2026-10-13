const express = require('express');
const router = express.Router();
const { updateProfile, addAddress, removeAddress } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.get('/profile', protect, (req, res) => res.json({ success: true, user: req.user }));
router.put('/profile', protect, updateProfile);
router.post('/addresses', protect, addAddress);
router.delete('/addresses/:id', protect, removeAddress);

module.exports = router;
