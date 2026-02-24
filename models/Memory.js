const mongoose = require("mongoose")

const memorySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  intent: String,
  entities: Object,
  importanceScore: {
    type: Number,
    default: 0.5
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model("Memory", memorySchema)