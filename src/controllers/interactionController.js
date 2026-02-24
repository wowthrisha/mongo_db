const Interaction = require('../models/Interaction');

async function createInteraction(req, res, next) {
  try {
    const {
      sessionId,
      rawInput,
      assistantResponse,
      detectedIntent,
      entities,
      memoriesUsed,
      processingMode,
    } = req.body;

    if (!sessionId || !rawInput || !assistantResponse) {
      return res
        .status(400)
        .json({ message: 'sessionId, rawInput, and assistantResponse are required' });
    }

    const interaction = await Interaction.create({
      userId: req.user.id,
      sessionId,
      rawInput,
      assistantResponse,
      detectedIntent,
      entities: entities || [],
      memoriesUsed: memoriesUsed || [],
      processingMode,
    });

    return res.status(201).json(interaction);
  } catch (error) {
    return next(error);
  }
}

async function listInteractions(req, res, next) {
  try {
    const { sessionId, intent, limit } = req.query;

    const filter = { userId: req.user.id };
    if (sessionId) {
      filter.sessionId = sessionId;
    }
    if (intent) {
      filter.detectedIntent = intent;
    }

    const limitNum = Number(limit) > 0 ? Math.min(Number(limit), 200) : 50;

    const interactions = await Interaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(limitNum);

    return res.json(interactions);
  } catch (error) {
    return next(error);
  }
}

async function getInteractionById(req, res, next) {
  try {
    const { id } = req.params;

    const interaction = await Interaction.findOne({ _id: id, userId: req.user.id });
    if (!interaction) {
      return res.status(404).json({ message: 'Interaction not found' });
    }

    return res.json(interaction);
  } catch (error) {
    return next(error);
  }
}

async function deleteInteraction(req, res, next) {
  try {
    const { id } = req.params;

    const interaction = await Interaction.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!interaction) {
      return res.status(404).json({ message: 'Interaction not found' });
    }

    return res.json({ message: 'Interaction deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createInteraction,
  listInteractions,
  getInteractionById,
  deleteInteraction,
};

