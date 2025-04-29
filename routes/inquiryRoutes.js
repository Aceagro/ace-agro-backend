
const express = require('express');
const router = express.Router();
const { createInquiry } = require('../controllers/inquiryController');

router.post('/', createInquiry);

module.exports = router;
