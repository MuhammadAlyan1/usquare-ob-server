const express = require('express');
const router = express.Router();
const signin = require('../controllers/users/signin');
const signup = require('../controllers/users/signup');

router.get('/signin', signin);
router.post('/signup', signup);

module.exports = router;
