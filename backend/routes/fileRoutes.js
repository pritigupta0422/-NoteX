const express = require('express');
const { uploadFile, getFiles, downloadFile, viewFile, deleteFile, updateShares, updateVisibility } = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Protected download and preview endpoints
router.get('/download/:id', protect, downloadFile);
router.get('/view/:id', protect, viewFile);

// Filterable file lists (protected to filter personal files)
router.get('/', protect, getFiles);

// Protected uploads, deletes, and sharing
router.post('/upload', protect, upload.single('pdf'), uploadFile);
router.delete('/:id', protect, deleteFile);
router.put('/:id/share', protect, updateShares);
router.put('/:id/visibility', protect, updateVisibility);

module.exports = router;
