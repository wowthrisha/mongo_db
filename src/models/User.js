const mongoose = require('mongoose');

const preferencesSchema = new mongoose.Schema(
  {
    language: { type: String, default: 'en' },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    voiceEnabled: { type: Boolean, default: false },
    offlineMode: { type: Boolean, default: false },
  },
  { _id: false }
);

const accessibilitySchema = new mongoose.Schema(
  {
    elderlyMode: { type: Boolean, default: false },
    highContrast: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    preferences: { type: preferencesSchema, default: () => ({}) },
    accessibility: { type: accessibilitySchema, default: () => ({}) },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);

