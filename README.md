# Cloud File Hosting Multi-User

API untuk layanan cloud file hosting dengan fitur multi-user.

## Fitur

- Manajemen user (registrasi, login, update profil)
- Upload dan download file
- Berbagi file dengan user lain
- Pengaturan file publik/privat
- Batasan penyimpanan per user
- Histori download

## Persiapan

1. Pastikan MongoDB terinstall dan berjalan
2. Clone repositori ini
3. Salin file `.env.example` menjadi `.env` dan sesuaikan konfigurasi

## Instalasi

```bash
# Install dependencies
npm install

# Jalankan server dalam mode development
npm run dev

# Jalankan server dalam mode production
npm start
```

## API Endpoints

### Auth Routes

- `POST /api/auth/register` - Registrasi user baru
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Mendapatkan profil user yang login
- `PUT /api/auth/update-profile` - Update profil user
- `PUT /api/auth/update-password` - Update password user

### File Routes

- `POST /api/files/upload` - Upload file baru
- `GET /api/files/my-files` - Mendapatkan list file user
- `GET /api/files/:id` - Mendapatkan detail file
- `GET /api/files/download/:id` - Download file
- `PUT /api/files/:id` - Update file (rename, visibility)
- `DELETE /api/files/:id` - Hapus file
- `POST /api/files/:id/share` - Berbagi file dengan user lain
- `DELETE /api/files/:id/share/:userId` - Batalkan berbagi file
- `GET /api/files/shared/with-me` - List file yang dibagikan dengan user

## Struktur Project

```
cloud-file-api/
├── uploads/                   # Folder simpan file
├── server.js                  # File utama server
├── routes/                    # API routes
│   ├── fileRoutes.js         # Rute untuk manajemen file
│   └── authRoutes.js         # Rute untuk autentikasi
├── controllers/               # Controller
│   ├── fileController.js     # Controller untuk manajemen file
│   └── authController.js     # Controller untuk autentikasi
├── models/                    # Model database
│   ├── File.js               # Model untuk file
│   └── User.js               # Model untuk user
├── middleware/                # Middleware
│   └── authMiddleware.js     # Middleware untuk autentikasi
├── utils/                     # Utilitas
│   └── db.js                 # Koneksi database
```

## Teknologi yang Digunakan

- Node.js dan Express.js untuk backend
- MongoDB dan Mongoose untuk database
- JSON Web Token (JWT) untuk autentikasi
- Multer untuk upload file#   u p l o a d a p i  
 