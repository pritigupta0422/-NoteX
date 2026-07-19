const express = require('express');
const { signup, login, getMe, updateWhitelist } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/whitelist', protect, updateWhitelist);

module.exports = router;
