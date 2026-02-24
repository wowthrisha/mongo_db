const Memory = require('../models/Memory');

async function createMemory(req, res, next) {
  try {
    const { key, value, type, tags, confidenceScore } = req.body;

    if (!key || !value || !type) {
      return res.status(400).json({ message: 'Key, value, and type are required' });
    }

    const memory = await Memory.create({
      userId: req.user.id,
      key,
      value,
      type,
      tags: tags || [],
      confidenceScore: confidenceScore !== undefined ? confidenceScore : undefined,
    });

    return res.status(201).json(memory);
  } catch (error) {
    return next(error);
  }
}

async function listMemories(req, res, next) {
  try {
    const { type, tags } = req.query;

    const filter = { userId: req.user.id };
    if (type) {
      filter.type = type;
    }
    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : String(tags).split(',').map((t) => t.trim());
      filter.tags = { $all: tagsArray.filter(Boolean) };
    }

    const memories = await Memory.find(filter).sort({ createdAt: -1 });

    if (memories.length > 0) {
      const ids = memories.map((m) => m._id);
      await Memory.updateMany(
        { _id: { $in: ids } },
        { $inc: { accessCount: 1 }, $set: { lastAccessed: new Date() } }
      );
    }

    return res.json(memories);
  } catch (error) {
    return next(error);
  }
}

async function searchMemories(req, res, next) {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Query parameter q is required' });
    }

    const regex = new RegExp(q, 'i');
    const filter = {
      userId: req.user.id,
      $or: [{ key: regex }, { value: regex }],
    };

    const memories = await Memory.find(filter).sort({ createdAt: -1 });

    if (memories.length > 0) {
      const ids = memories.map((m) => m._id);
      await Memory.updateMany(
        { _id: { $in: ids } },
        { $inc: { accessCount: 1 }, $set: { lastAccessed: new Date() } }
      );
    }

    return res.json(memories);
  } catch (error) {
    return next(error);
  }
}

async function getMemoryById(req, res, next) {
  try {
    const { id } = req.params;

    const memory = await Memory.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { $inc: { accessCount: 1 }, $set: { lastAccessed: new Date() } },
      { returnDocument: 'after' }
    );

    if (!memory) {
      return res.status(404).json({ message: 'Memory not found' });
    }

    return res.json(memory);
  } catch (error) {
    return next(error);
  }
}

async function updateMemory(req, res, next) {
  try {
    const { id } = req.params;
    const { key, value, type, tags, confidenceScore } = req.body;

    const updates = {};
    if (key !== undefined) updates.key = key;
    if (value !== undefined) updates.value = value;
    if (type !== undefined) updates.type = type;
    if (tags !== undefined) updates.tags = tags;
    if (confidenceScore !== undefined) updates.confidenceScore = confidenceScore;

    const memory = await Memory.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      updates,
      { returnDocument: 'after', runValidators: true }
    );

    if (!memory) {
      return res.status(404).json({ message: 'Memory not found' });
    }

    return res.json(memory);
  } catch (error) {
    return next(error);
  }
}

async function deleteMemory(req, res, next) {
  try {
    const { id } = req.params;

    const memory = await Memory.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!memory) {
      return res.status(404).json({ message: 'Memory not found' });
    }

    return res.json({ message: 'Memory deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createMemory,
  listMemories,
  searchMemories,
  getMemoryById,
  updateMemory,
  deleteMemory,
};

