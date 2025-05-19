const express = require('express');
const multer = require('multer');
const path = require('path');
const { check } = require('express-validator');
const fileController = require('../controllers/fileController');
const { protect, checkFileOwnership } = require('../middleware/authMiddleware');

const router = express.Router();

// Konfigurasi storage untuk multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Buat nama file unik dengan timestamp dan random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Filter file yang diupload
const fileFilter = (req, file, cb) => {
  // Accept all files for now, you can add restrictions later
  cb(null, true);
};

// Inisialisasi upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: fileFilter
});

// Rute untuk upload file
router.post(
  '/upload',
  protect,
  upload.single('file'),
  [
    check('isPublic', 'isPublic harus boolean').optional().isBoolean()
  ],
  fileController.uploadFile
);

// Rute untuk mendapatkan list file user
router.get('/my-files', protect, fileController.getMyFiles);

// Rute untuk mendapatkan detail file
router.get('/:id', protect, fileController.getFileById);

// Rute untuk download file
router.get('/download/:id', protect, fileController.downloadFile);

// Rute untuk update file (rename, visibility)
router.put(
  '/:id',
  protect,
  [
    check('originalname', 'Nama file diperlukan').optional(),
    check('isPublic', 'isPublic harus boolean').optional().isBoolean()
  ],
  fileController.updateFile
);

// Rute untuk delete file
router.delete('/:id', protect, fileController.deleteFile);

// Rute untuk berbagi file
router.post(
  '/:id/share',
  protect,
  [
    check('userId', 'User ID diperlukan').notEmpty(),
    check('permission', 'Permission harus read atau write').optional().isIn(['read', 'write'])
  ],
  fileController.shareFile
);

// Rute untuk membatalkan berbagi file
router.delete('/:id/share/:userId', protect, fileController.unshareFile);

// Rute untuk mendapatkan list file yang dibagikan dengan user
router.get('/shared/with-me', protect, fileController.getSharedWithMe);

module.exports = router; 