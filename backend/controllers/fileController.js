const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const ALLOWED_SUBJECTS = ['DS', 'DSD', 'AFL', 'PS', 'IND4', 'STW'];
const ALLOWED_CATEGORIES = ['Notes', 'PYQ'];

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or file is not a PDF' });
    }

    const { title, subject, category, unitTopic, year } = req.body;

    // Validate inputs
    if (!title || !subject || !category) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Title, Subject, and Category are required fields' });
    }

    if (!ALLOWED_SUBJECTS.includes(subject)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: `Invalid subject. Must be one of: ${ALLOWED_SUBJECTS.join(', ')}` });
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: `Invalid category. Must be 'Notes' or 'PYQ'` });
    }

    let yearNum = null;
    if (category === 'PYQ' && year) {
      yearNum = parseInt(year, 10);
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > new Date().getFullYear() + 2) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Invalid year specification for PYQ' });
      }
    }

    // Read the temp file buffer uploaded by Multer
    const fileBuffer = fs.readFileSync(req.file.path);

    // Upload file to Supabase Storage bucket
    const { data: uploadData, error: uploadError } = await db.client
      .storage
      .from('notes-pyq-bucket')
      .upload(req.file.filename, fileBuffer, {
        contentType: 'application/pdf',
        duplicative: false
      });

    if (uploadError) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: `Supabase Storage upload error: ${uploadError.message}. Make sure the bucket 'notes-pyq-bucket' is created.` });
    }

    // Clean up local temp file
    fs.unlinkSync(req.file.path);

    // Create file metadata
    const newFile = {
      id: uuidv4(),
      title: title.trim(),
      subject,
      category,
      unitTopic: unitTopic ? unitTopic.trim() : '',
      year: yearNum,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      fileSize: req.file.size,
      uploaderId: req.user.id,
      uploaderName: req.user.name,
      uploadedAt: new Date().toISOString(),
      downloadsCount: 0,
      viewsCount: 0,
      isPersonal: req.body.isPersonal === 'true',
      sharedWith: ''
    };

    // Save to PostgreSQL DB
    await db.createFile(newFile);

    return res.status(201).json({
      message: 'File uploaded successfully',
      file: newFile
    });
  } catch (error) {
    console.error('File Upload Error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ message: 'Internal Server Error during upload' });
  }
};

const getFiles = async (req, res) => {
  try {
    const { subject, category, search, year, sortBy } = req.query;
    let files = await db.getFiles();

    // Filter personal/private files
    const userEmail = req.user ? req.user.email.toLowerCase() : '';
    const userId = req.user ? req.user.id : '';
    const userRole = req.user ? req.user.role : '';
    const whitelistMap = await db.getUsersWhitelistMap();

    files = files.filter(f => {
      if (!f.isPersonal) return true; // public
      if (userId && f.uploaderId === userId) return true; // owner
      if (userRole === 'admin') return true; // admin
      
      // Direct share check
      if (userEmail && f.sharedWith) {
        const allowed = f.sharedWith.split(',').map(e => e.trim().toLowerCase());
        if (allowed.includes(userEmail)) return true;
      }

      // Whitelist check
      const uploaderWhitelist = whitelistMap[f.uploaderId];
      if (userEmail && uploaderWhitelist) {
        const whitelisted = uploaderWhitelist.split(',').map(e => e.trim().toLowerCase());
        if (whitelisted.includes(userEmail)) return true;
      }

      return false;
    });

    // Subject filter
    if (subject && ALLOWED_SUBJECTS.includes(subject)) {
      files = files.filter(f => f.subject === subject);
    }

    // Category filter
    if (category && ALLOWED_CATEGORIES.includes(category)) {
      files = files.filter(f => f.category === category);
    }

    // Year filter (for PYQs)
    if (year) {
      const yearNum = parseInt(year, 10);
      if (!isNaN(yearNum)) {
        files = files.filter(f => f.year === yearNum);
      }
    }

    // Search query filter (matches title, unitTopic, or uploaderName)
    if (search && search.trim() !== '') {
      const searchLower = search.toLowerCase().trim();
      files = files.filter(f => 
        f.title.toLowerCase().includes(searchLower) ||
        (f.unitTopic && f.unitTopic.toLowerCase().includes(searchLower)) ||
        f.uploaderName.toLowerCase().includes(searchLower)
      );
    }

    // Sort files
    if (sortBy === 'downloads') {
      files.sort((a, b) => (b.downloadsCount || 0) - (a.downloadsCount || 0));
    } else if (sortBy === 'views') {
      files.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
    } else {
      // Default: most recent
      files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    }

    return res.status(200).json(files);
  } catch (error) {
    console.error('Fetch Files Error:', error);
    return res.status(500).json({ message: 'Internal Server Error fetching files' });
  }
};

const downloadFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = await db.findFileById(fileId);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Access control for personal files
    if (file.isPersonal && file.uploaderId !== req.user.id && req.user.role !== 'admin') {
      const userEmail = req.user.email.toLowerCase();
      const allowed = file.sharedWith ? file.sharedWith.split(',').map(e => e.trim().toLowerCase()) : [];
      
      const uploader = await db.findUserById(file.uploaderId);
      const whitelisted = uploader && uploader.whitelist ? uploader.whitelist.split(',').map(e => e.trim().toLowerCase()) : [];

      if (!allowed.includes(userEmail) && !whitelisted.includes(userEmail)) {
        return res.status(403).json({ message: 'You do not have permission to download this personal note' });
      }
    }

    // Retrieve file buffer from Supabase Storage
    const { data: fileData, error: downloadError } = await db.client
      .storage
      .from('notes-pyq-bucket')
      .download(file.fileName);

    if (downloadError) {
      return res.status(404).json({ message: `Cloud storage read error: ${downloadError.message}` });
    }

    // Update download count in database
    await db.incrementDownloads(fileId);

    // Stream download buffer back to client
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    const buffer = Buffer.from(await fileData.arrayBuffer());
    return res.send(buffer);
  } catch (error) {
    console.error('Download File Error:', error);
    return res.status(500).json({ message: 'Internal Server Error downloading file' });
  }
};

const viewFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = await db.findFileById(fileId);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Access control for personal files
    if (file.isPersonal && file.uploaderId !== req.user.id && req.user.role !== 'admin') {
      const userEmail = req.user.email.toLowerCase();
      const allowed = file.sharedWith ? file.sharedWith.split(',').map(e => e.trim().toLowerCase()) : [];
      
      const uploader = await db.findUserById(file.uploaderId);
      const whitelisted = uploader && uploader.whitelist ? uploader.whitelist.split(',').map(e => e.trim().toLowerCase()) : [];

      if (!allowed.includes(userEmail) && !whitelisted.includes(userEmail)) {
        return res.status(403).json({ message: 'You do not have permission to view this personal note' });
      }
    }

    // Retrieve file buffer from Supabase Storage
    const { data: fileData, error: downloadError } = await db.client
      .storage
      .from('notes-pyq-bucket')
      .download(file.fileName);

    if (downloadError) {
      return res.status(404).json({ message: `Cloud storage read error: ${downloadError.message}` });
    }

    // Update view count in database
    await db.incrementViews(fileId);

    // Send PDF inline
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
    const buffer = Buffer.from(await fileData.arrayBuffer());
    return res.send(buffer);
  } catch (error) {
    console.error('View File Error:', error);
    return res.status(500).json({ message: 'Internal Server Error viewing file' });
  }
};

const deleteFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = await db.findFileById(fileId);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check authorization: User can only delete their own uploads, unless they are an admin
    if (file.uploaderId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to delete this file' });
    }

    // Delete from Supabase Storage bucket
    const { error: storageDeleteError } = await db.client
      .storage
      .from('notes-pyq-bucket')
      .remove([file.fileName]);

    if (storageDeleteError) {
      console.error('Warning: could not delete file from Supabase Storage bucket:', storageDeleteError);
    }

    // Delete from PostgreSQL database
    const success = await db.deleteFile(fileId);
    if (success) {
      return res.status(200).json({ message: 'File deleted successfully' });
    } else {
      return res.status(500).json({ message: 'Failed to delete file entry from database' });
    }
  } catch (error) {
    console.error('Delete File Error:', error);
    return res.status(500).json({ message: 'Internal Server Error deleting file' });
  }
};

const updateShares = async (req, res) => {
  try {
    const fileId = req.params.id;
    const { sharedWith } = req.body;
    const file = await db.findFileById(fileId);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (file.uploaderId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to manage this file\'s shares' });
    }

    const success = await db.updateFileShares(fileId, sharedWith || '');
    if (success) {
      return res.status(200).json({ message: 'Sharing settings updated successfully' });
    } else {
      return res.status(500).json({ message: 'Failed to update sharing settings' });
    }
  } catch (error) {
    console.error('Update Shares Error:', error);
    return res.status(500).json({ message: 'Internal Server Error updating shares' });
  }
};

const updateVisibility = async (req, res) => {
  try {
    const fileId = req.params.id;
    const { isPersonal } = req.body;
    const file = await db.findFileById(fileId);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (file.uploaderId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to change this file\'s visibility' });
    }

    const success = await db.updateFileVisibility(fileId, isPersonal === true || isPersonal === 'true');
    if (success) {
      return res.status(200).json({ message: 'Visibility updated successfully', isPersonal: isPersonal === true || isPersonal === 'true' });
    } else {
      return res.status(500).json({ message: 'Failed to update visibility settings' });
    }
  } catch (error) {
    console.error('Update Visibility Error:', error);
    return res.status(500).json({ message: 'Internal Server Error updating visibility' });
  }
};

module.exports = {
  uploadFile,
  getFiles,
  downloadFile,
  viewFile,
  deleteFile,
  updateShares,
  updateVisibility
};
