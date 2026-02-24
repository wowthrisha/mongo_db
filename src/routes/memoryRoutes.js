const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createMemory,
  listMemories,
  searchMemories,
  getMemoryById,
  updateMemory,
  deleteMemory,
} = require('../controllers/memoryController');

const router = express.Router();

router.use(authMiddleware);

router.post('/', createMemory);
router.get('/', listMemories);
router.get('/search', searchMemories);
router.get('/:id', getMemoryById);
router.put('/:id', updateMemory);
router.delete('/:id', deleteMemory);

module.exports = router;

