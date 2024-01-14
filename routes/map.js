const express = require('express');
const router = express.Router();
const setZipCodes = require('../controllers/map/setZipCodes');
const getZipCodes = require('../controllers/map/getZipCodes');

router.get('/:userId', getZipCodes);
router.post('/', setZipCodes);

module.exports = router;
