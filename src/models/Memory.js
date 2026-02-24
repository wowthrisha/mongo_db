const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true },
    type: {
      type: String,
      enum: ['habit', 'preference', 'fact', 'routine', 'location', 'contact'],
      required: true,
    },
    tags: [{ type: String, trim: true }],
    confidenceScore: { type: Number, min: 0, max: 1, default: 1 },
    accessCount: { type: Number, default: 0 },
    lastAccessed: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

memorySchema.index({ userId: 1, type: 1 });
memorySchema.index({ userId: 1, tags: 1 });

module.exports = mongoose.model('Memory', memorySchema);

