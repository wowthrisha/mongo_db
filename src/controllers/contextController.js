const User = require('../models/User');
const Memory = require('../models/Memory');
const Interaction = require('../models/Interaction');
const Task = require('../models/Task');

async function getContext(req, res, next) {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const recentMemories = await Memory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);

    if (recentMemories.length > 0) {
      const memoryIds = recentMemories.map((m) => m._id);
      await Memory.updateMany(
        { _id: { $in: memoryIds } },
        { $inc: { accessCount: 1 }, $set: { lastAccessed: new Date() } }
      );
    }

    const detectedHabits = await Memory.find({ userId, type: 'habit' })
      .sort({ createdAt: -1 })
      .limit(10);

    const intentAggregation = await Interaction.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$detectedIntent',
          count: { $sum: 1 },
        },
      },
    ]);

    const intentStats = intentAggregation
      .filter((agg) => agg._id)
      .map((agg) => ({
        intent: agg._id,
        count: agg.count,
      }));

    const tasks = await Task.find({ userId }).sort({ createdAt: -1 }).limit(20);

    return res.json({
      userProfile: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        accessibility: user.accessibility,
      },
      recentMemories,
      detectedHabits,
      intentStats,
      tasks,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getContext,
};

