const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    rawInput: { type: String, required: true },
    assistantResponse: { type: String, required: true },
    detectedIntent: { type: String },
    entities: [{ type: mongoose.Schema.Types.Mixed }],
    memoriesUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Memory' }],
    processingMode: { type: String, enum: ['cloud', 'on-device'], default: 'cloud' },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

interactionSchema.index({ userId: 1, detectedIntent: 1 });
interactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Interaction', interactionSchema);

