const multer = require('multer');
const path = require('path');
const fs = require('fs');

const os = require('os');

// Use OS temp directory in production (e.g. Vercel Serverless Functions) to avoid read-only filesystem errors
const UPLOADS_DIR = process.env.NODE_ENV === 'production'
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(__dirname, '..', 'uploads');

// Ensure uploads folder exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique file name to avoid collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  }
});

// File filter to restrict to PDF only
const fileFilter = (req, file, cb) => {
  const filetypes = /pdf/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only PDF files are allowed!'), false);
};

// Multer upload configurations (max size: 10MB)
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter
});

module.exports = upload;
