const mongoose = require('mongoose');
require('dotenv').config();

// URL database dari file .env
const dbURI = process.env.MONGODB_URI;

// Opsi koneksi
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

// Fungsi untuk koneksi ke database
const connectDB = async () => {
  try {
    await mongoose.connect(dbURI);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('Koneksi database gagal:', err.message);
    // Keluar dengan status error jika koneksi gagal
    process.exit(1);
  }
};

module.exports = connectDB; 