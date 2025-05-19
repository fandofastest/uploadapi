const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const File = require('../models/File');

// Upload file
exports.uploadFile = async (req, res) => {
  try {
    // Validasi input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Tidak ada file yang diupload'
      });
    }

    // Cek ukuran penyimpanan user
    const fileSize = req.file.size;
    const user = await User.findById(req.user.id);
    
    // Cek apakah melebihi batas penyimpanan
    if (user.storageUsed + fileSize > user.storageLimit) {
      // Hapus file yang sudah diupload
      fs.unlinkSync(req.file.path);
      
      return res.status(400).json({
        status: 'error',
        message: 'Penyimpanan tidak cukup. Hapus beberapa file atau upgrade paket Anda.'
      });
    }

    // Ambil parameter isPublic jika ada
    const isPublic = req.body.isPublic === 'true' || req.body.isPublic === true;

    // Buat record file baru
    const newFile = new File({
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: fileSize,
      path: req.file.path,
      owner: req.user.id,
      isPublic: isPublic
    });

    // Simpan file ke database
    await newFile.save();

    // Update penyimpanan user
    user.storageUsed += fileSize;
    user.files.push(newFile._id);
    await user.save();

    // Buat URL untuk akses file jika publik
    const fileUrl = isPublic 
      ? `${req.protocol}://${req.get('host')}/api/files/access/${newFile.filename}`
      : null;

    // Buat URL untuk download file (memerlukan autentikasi)
    const downloadUrl = `${req.protocol}://${req.get('host')}/api/files/download/${newFile._id}`;

    res.status(201).json({
      status: 'success',
      message: 'File berhasil diupload',
      data: {
        file: {
          id: newFile._id,
          filename: newFile.filename,
          originalname: newFile.originalname,
          mimetype: newFile.mimetype,
          size: newFile.size,
          isPublic: newFile.isPublic,
          createdAt: newFile.createdAt,
          accessUrl: fileUrl,
          downloadUrl: downloadUrl
        }
      }
    });
  } catch (error) {
    console.error('Error saat upload file:', error);
    
    // Hapus file jika terjadi error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan server'
    });
  }
};

// Mendapatkan list file user
exports.getMyFiles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filter berdasarkan query
    const filter = { owner: req.user.id };
    
    if (req.query.search) {
      filter.$or = [
        { originalname: { $regex: req.query.search, $options: 'i' } },
        { filename: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    if (req.query.mimetype) {
      filter.mimetype = { $regex: req.query.mimetype, $options: 'i' };
    }
    
    // Cari file milik user
    const files = await File.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Hitung total file
    const total = await File.countDocuments(filter);

    // Base URL untuk akses file
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.status(200).json({
      status: 'success',
      data: {
        files: files.map(file => ({
          id: file._id,
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          isPublic: file.isPublic,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
          downloadCount: file.downloadCount,
          accessUrl: file.isPublic ? `${baseUrl}/api/files/access/${file.filename}` : null,
          downloadUrl: `${baseUrl}/api/files/download/${file._id}`
        })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error saat mengambil file:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan server'
    });
  }
};

// Mendapatkan detail file
exports.getFileById = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File tidak ditemukan'
      });
    }
    
    // Cek apakah user adalah pemilik file atau file publik
    if (file.owner.toString() !== req.user.id && !file.isPublic) {
      // Cek apakah file dibagikan dengan user ini
      const isShared = file.sharedWith.some(share => 
        share.user.toString() === req.user.id
      );
      
      if (!isShared && req.user.role !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Anda tidak memiliki akses ke file ini'
        });
      }
    }

    // Buat URL untuk akses file jika publik
    const fileUrl = file.isPublic 
      ? `${req.protocol}://${req.get('host')}/api/files/access/${file.filename}`
      : null;

    // Buat URL untuk download file (memerlukan autentikasi)
    const downloadUrl = `${req.protocol}://${req.get('host')}/api/files/download/${file._id}`;
    
    res.status(200).json({
      status: 'success',
      data: {
        file: {
          id: file._id,
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          isPublic: file.isPublic,
          owner: file.owner,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
          downloadCount: file.downloadCount,
          sharedWith: file.sharedWith,
          accessUrl: fileUrl,
          downloadUrl: downloadUrl
        }
      }
    });
  } catch (error) {
    console.error('Error saat mengambil detail file:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan server'
    });
  }
};

// Download file
exports.downloadFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File tidak ditemukan'
      });
    }
    
    // Cek apakah user adalah pemilik file atau file publik
    if (file.owner.toString() !== req.user.id && !file.isPublic) {
      // Cek apakah file dibagikan dengan user ini
      const isShared = file.sharedWith.some(share => 
        share.user.toString() === req.user.id
      );
      
      if (!isShared && req.user.role !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Anda tidak memiliki akses ke file ini'
        });
      }
    }
    
    // Cek apakah file ada di disk
    if (!fs.existsSync(file.path)) {
      return res.status(404).json({
        status: 'error',
        message: 'File fisik tidak ditemukan'
      });
    }
    
    // Tambah download count
    file.downloadCount += 1;
    await file.save();
    
    // Set header untuk download
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalname}"`);
    res.setHeader('Content-Type', file.mimetype);
    
    // Kirim file
    const fileStream = fs.createReadStream(file.path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error saat download file:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan server'
    });
  }
};

// Update file (rename, visibility)
exports.updateFile = async (req, res) => {
  try {
    // Validasi input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    const { originalname, isPublic } = req.body;
    const updateData = {};
    
    if (originalname) updateData.originalname = originalname;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    // Update file
    const file = await File.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File tidak ditemukan atau Anda bukan pemilik file'
      });
    }

    // Buat URL untuk akses file jika publik
    const fileUrl = file.isPublic 
      ? `${req.protocol}://${req.get('host')}/api/files/access/${file.filename}`
      : null;

    // Buat URL untuk download file (memerlukan autentikasi)
    const downloadUrl = `${req.protocol}://${req.get('host')}/api/files/download/${file._id}`;
    
    res.status(200).json({
      status: 'success',
      message: 'File berhasil diperbarui',
      data: {
        file: {
          id: file._id,
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          isPublic: file.isPublic,
          updatedAt: file.updatedAt,
          accessUrl: fileUrl,
          downloadUrl: downloadUrl
        }
      }
    });
  } catch (error) {
    console.error('Error saat update file:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan server'
    });
  }
};

// Hapus file
exports.deleteFile = async (req, res) => {
  try {
    // Cari file
    const file = await File.findOne({ 
      _id: req.params.id, 
      owner: req.user.id 
    });
    
    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File tidak ditemukan atau Anda bukan pemilik file'
      });
    }
    
    // Hapus file fisik
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    // Update penyimpanan user
    const user = await User.findById(req.user.id);
    user.storageUsed = Math.max(0, user.storageUsed - file.size);
    user.files = user.files.filter(fileId => fileId.toString() !== file._id.toString());
    await user.save();
    
    // Hapus file dari database
    await File.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      status: 'success',
      message: 'File berhasil dihapus'
    });
  } catch (error) {
    console.error('Error saat menghapus file:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan server'
    });
  }
};

// Bagikan file
exports.shareFile = async (req, res) => {
  try {
    // Validasi input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }
    
    const { userId, permission = 'read' } = req.body;
    
    // Cek apakah user yang akan dibagikan ada
    const shareWithUser = await User.findById(userId);
    if (!shareWithUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User tidak ditemukan'
      });
    }
    
    // Pastikan tidak membagikan kepada diri sendiri
    if (userId === req.user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Tidak dapat membagikan file kepada diri sendiri'
      });
    }
    
    // Cari file
    const file = await File.findOne({ 
      _id: req.params.id, 
      owner: req.user.id 
    });
    
    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File tidak ditemukan atau Anda bukan pemilik file'
      });
    }
    
    // Cek apakah sudah dibagikan dengan user ini
    const alreadyShared = file.sharedWith.find(share => 
      share.user.toString() === userId
    );
    
    if (alreadyShared) {
      // Update permission jika sudah dibagikan
      alreadyShared.permission = permission;
    } else {
      // Tambahkan share baru
      file.sharedWith.push({
        user: userId,
        permission
      });
    }
    
    await file.save();
    
    res.status(200).json({
      status: 'success',
      message: 'File berhasil dibagikan',
      data: {
        file: {
          id: file._id,
          originalname: file.originalname,
          sharedWith: file.sharedWith
        }
      }
    });
  } catch (error) {
    console.error('Error saat membagikan file:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan server'
    });
  }
};

// Batalkan berbagi file
exports.unshareFile = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Cari file
    const file = await File.findOne({ 
      _id: req.params.id, 
      owner: req.user.id 
    });
    
    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File tidak ditemukan atau Anda bukan pemilik file'
      });
    }
    
    // Cek apakah file dibagikan dengan user ini
    const sharedIndex = file.sharedWith.findIndex(share => 
      share.user.toString() === userId
    );
    
    if (sharedIndex === -1) {
      return res.status(400).json({
        status: 'error',
        message: 'File tidak dibagikan dengan user ini'
      });
    }
    
    // Hapus sharing
    file.sharedWith.splice(sharedIndex, 1);
    await file.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Berbagi file berhasil dibatalkan'
    });
  } catch (error) {
    console.error('Error saat membatalkan berbagi file:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan server'
    });
  }
};

// Mendapatkan list file yang dibagikan dengan user
exports.getSharedWithMe = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Cari file yang dibagikan dengan user
    const files = await File.find({
      'sharedWith.user': req.user.id
    })
      .populate('owner', 'username email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Hitung total file
    const total = await File.countDocuments({
      'sharedWith.user': req.user.id
    });

    // Base URL untuk akses file
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.status(200).json({
      status: 'success',
      data: {
        files: files.map(file => ({
          id: file._id,
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          isPublic: file.isPublic,
          owner: file.owner,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
          permission: file.sharedWith.find(share => 
            share.user.toString() === req.user.id
          ).permission,
          accessUrl: file.isPublic ? `${baseUrl}/api/files/access/${file.filename}` : null,
          downloadUrl: `${baseUrl}/api/files/download/${file._id}`
        })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error saat mengambil file yang dibagikan:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan server'
    });
  }
}; 