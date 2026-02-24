const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    type: {
      type: String,
      enum: ['reminder', 'alarm', 'message', 'schedule', 'note'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled', 'snoozed'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    scheduledTime: { type: Date },
    recurring: { type: Boolean, default: false },
    recurringPattern: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, type: 1 });
taskSchema.index({ userId: 1, priority: 1 });

module.exports = mongoose.model('Task', taskSchema);

