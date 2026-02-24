const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createInteraction,
  listInteractions,
  getInteractionById,
  deleteInteraction,
} = require('../controllers/interactionController');

const router = express.Router();

router.use(authMiddleware);

router.post('/', createInteraction);
router.get('/', listInteractions);
router.get('/:id', getInteractionById);
router.delete('/:id', deleteInteraction);

module.exports = router;

