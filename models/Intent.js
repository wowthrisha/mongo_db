const mongoose = require("mongoose")

const intentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  intentType: {
    type: String,
    required: true
  },
  entities: Object,
  frequency: {
    type: Number,
    default: 1
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model("Intent", intentSchema)