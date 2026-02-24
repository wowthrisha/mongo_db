const Task = require('../models/Task');

async function createTask(req, res, next) {
  try {
    const {
      title,
      description,
      type,
      status,
      priority,
      scheduledTime,
      recurring,
      recurringPattern,
    } = req.body;

    if (!title || !type) {
      return res.status(400).json({ message: 'Title and type are required' });
    }

    const task = await Task.create({
      userId: req.user.id,
      title,
      description,
      type,
      status,
      priority,
      scheduledTime,
      recurring,
      recurringPattern,
    });

    return res.status(201).json(task);
  } catch (error) {
    return next(error);
  }
}

async function listTasks(req, res, next) {
  try {
    const { status, type, priority } = req.query;

    const filter = { userId: req.user.id };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;

    const tasks = await Task.find(filter).sort({ createdAt: -1 });

    return res.json(tasks);
  } catch (error) {
    return next(error);
  }
}

async function getTaskById(req, res, next) {
  try {
    const { id } = req.params;

    const task = await Task.findOne({ _id: id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.json(task);
  } catch (error) {
    return next(error);
  }
}

async function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      type,
      status,
      priority,
      scheduledTime,
      recurring,
      recurringPattern,
    } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (type !== undefined) updates.type = type;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (scheduledTime !== undefined) updates.scheduledTime = scheduledTime;
    if (recurring !== undefined) updates.recurring = recurring;
    if (recurringPattern !== undefined) updates.recurringPattern = recurringPattern;

    const task = await Task.findOneAndUpdate({ _id: id, userId: req.user.id }, updates, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.json(task);
  } catch (error) {
    return next(error);
  }
}

async function completeTask(req, res, next) {
  try {
    const { id } = req.params;

    const task = await Task.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { status: 'completed' },
      { returnDocument: 'after', runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.json(task);
  } catch (error) {
    return next(error);
  }
}

async function deleteTask(req, res, next) {
  try {
    const { id } = req.params;

    const task = await Task.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createTask,
  listTasks,
  getTaskById,
  updateTask,
  completeTask,
  deleteTask,
};

