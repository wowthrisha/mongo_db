const mongoose = require("mongoose")

const habitSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  habitType: {
    type: String,
    required: true
  },
  triggerPattern: Object,
  detectedAt: {
    type: Date,
    default: Date.now
  },
  confidence: {
    type: Number,
    default: 0.75
  }
})

module.exports = mongoose.model("Habit", habitSchema)