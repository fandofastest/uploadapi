const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

// Fungsi untuk membuat token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '360d'
  });
};

// Registrasi user baru
exports.register = async (req, res) => {
  try {
    // Validasi input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    const { username, email, password } = req.body;

    // Cek apakah email sudah terdaftar
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        status: 'error',
        message: 'Email sudah terdaftar'
      });
    }

    // Cek apakah username sudah digunakan
    user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({
        status: 'error',
        message: 'Username sudah digunakan'
      });
    }

    // Buat user baru
    user = new User({
      username,
      email,
      password
    });

    // Simpan user ke database
    await user.save();

    // Buat token JWT
    const token = generateToken(user._id);

    res.status(201).json({
      status: 'success',
      message: 'Registrasi berhasil',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          storageUsed: user.storageUsed,
          storageLimit: user.storageLimit
        },
        token
      }
    });
  } catch (error) {
    console.error('Error saat registrasi:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan server'
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    // Validasi input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Cek apakah user ada
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Email atau password tidak valid'
      });
    }

    // Cek password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Email atau password tidak valid'
      });
    }

    // Buat token JWT
    const token = generateToken(user._id);

    res.status(200).json({
      status: 'success',
      message: 'Login berhasil',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          storageUsed: user.storageUsed,
          storageLimit: user.storageLimit
        },
        token
      }
    });
  } catch (error) {
    console.error('Error saat login:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan server'
    });
  }
};

// Mendapatkan profil user yang sedang login
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          storageUsed: user.storageUsed,
          storageLimit: user.storageLimit,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Error saat mengambil profil:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan server'
    });
  }
};

// Update profil user
exports.updateProfile = async (req, res) => {
  try {
    // Validasi input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    const { username, email } = req.body;
    const updateData = {};
    
    if (username) updateData.username = username;
    if (email) updateData.email = email;

    // Cek apakah username sudah digunakan
    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: req.user.id } });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Username sudah digunakan'
        });
      }
    }

    // Cek apakah email sudah terdaftar
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Email sudah terdaftar'
        });
      }
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      status: 'success',
      message: 'Profil berhasil diperbarui',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          storageUsed: user.storageUsed,
          storageLimit: user.storageLimit
        }
      }
    });
  } catch (error) {
    console.error('Error saat update profil:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan server'
    });
  }
};

// Update password
exports.updatePassword = async (req, res) => {
  try {
    // Validasi input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Ambil user dari database
    const user = await User.findById(req.user.id);

    // Cek password lama
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Password saat ini tidak valid'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Buat token JWT baru
    const token = generateToken(user._id);

    res.status(200).json({
      status: 'success',
      message: 'Password berhasil diperbarui',
      data: {
        token
      }
    });
  } catch (error) {
    console.error('Error saat update password:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan server'
    });
  }
}; 