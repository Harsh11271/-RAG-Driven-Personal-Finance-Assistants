const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
// middleware import would go here

const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;
