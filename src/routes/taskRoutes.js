const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createTask,
  listTasks,
  getTaskById,
  updateTask,
  completeTask,
  deleteTask,
} = require('../controllers/taskController');

const router = express.Router();

router.use(authMiddleware);

router.post('/', createTask);
router.get('/', listTasks);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.patch('/:id/complete', completeTask);
router.delete('/:id', deleteTask);

module.exports = router;

