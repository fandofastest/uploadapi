const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware untuk verifikasi token JWT
exports.protect = async (req, res, next) => {
  let token;
  
  // Cek header authorization dengan format "Bearer [token]"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // Jika token tidak ada
  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Anda tidak memiliki akses, silakan login terlebih dahulu'
    });
  }
  
  try {
    // Verifikasi token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Cek apakah user masih ada di database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Token tidak valid, user tidak ditemukan'
      });
    }
    
    // Set user di request object untuk digunakan di route berikutnya
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Token tidak valid'
    });
  }
};

// Middleware untuk membatasi akses berdasarkan role
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Anda tidak memiliki izin untuk melakukan operasi ini'
      });
    }
    next();
  };
};

// Middleware untuk cek kepemilikan file
exports.checkFileOwnership = async (req, res, next) => {
  try {
    const file = await require('../models/File').findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File tidak ditemukan'
      });
    }
    
    // Cek apakah user adalah pemilik file atau admin
    if (file.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Anda tidak memiliki akses ke file ini'
      });
    }
    
    req.file = file;
    next();
  } catch (error) {
    console.error('Error saat memeriksa kepemilikan file:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan server'
    });
  }
}; 