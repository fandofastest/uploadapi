const express = require('express');
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Rute untuk registrasi user baru
router.post(
  '/register',
  [
    check('username', 'Username diperlukan minimal 3 karakter').isLength({ min: 3 }),
    check('email', 'Email tidak valid').isEmail(),
    check('password', 'Password minimal 6 karakter').isLength({ min: 6 })
  ],
  authController.register
);

// Rute untuk login
router.post(
  '/login',
  [
    check('email', 'Email tidak valid').isEmail(),
    check('password', 'Password diperlukan').exists()
  ],
  authController.login
);

// Rute untuk mendapatkan profil user yang sedang login
router.get('/me', protect, authController.getMe);

// Rute untuk update profil
router.put(
  '/update-profile',
  protect,
  [
    check('username', 'Username minimal 3 karakter').optional().isLength({ min: 3 }),
    check('email', 'Email tidak valid').optional().isEmail()
  ],
  authController.updateProfile
);

// Rute untuk update password
router.put(
  '/update-password',
  protect,
  [
    check('currentPassword', 'Password saat ini diperlukan').exists(),
    check('newPassword', 'Password baru minimal 6 karakter').isLength({ min: 6 })
  ],
  authController.updatePassword
);

module.exports = router; 