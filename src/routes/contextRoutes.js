const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { getContext } = require('../controllers/contextController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getContext);

module.exports = router;

