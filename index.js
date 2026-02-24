const express = require("express")
const mongoose = require("mongoose")

const User = require("./models/User")
const Memory = require("./models/Memory")
const Intent = require("./models/Intent")
const Habit = require("./models/Habit")

const app = express()

mongoose.connect("mongodb://127.0.0.1:27017/nixinAI")
  .then(async () => {
    console.log("MongoDB Connected")

    const userId = "23Z274"

    // ---------------- USER ----------------
    let user = await User.findOne({ userId })

    if (!user) {
      user = await User.create({
        userId,
        name: "Thrisha",
        preferences: {}
      })
      console.log("User created")
    }

    // ---------------- MEMORY ----------------
    const newMemory = await Memory.create({
      userId,
      role: "user",
      content: "Remind me at 6 PM",
      intent: "SET_REMINDER",
      entities: { time: "6 PM" },
      importanceScore: 0.8
    })

    console.log("Memory stored")

    // ---------------- INTENT LOGGING ----------------
    const intent = await Intent.findOneAndUpdate(
      { userId, intentType: "SET_REMINDER" },
      {
        $inc: { frequency: 1 },
        $set: { lastUsed: new Date(), entities: { time: "6 PM" } }
      },
      { returnDocument: "after", upsert: true }
    )

    console.log("Intent updated. Frequency:", intent.frequency)

    // ---------------- HABIT DETECTION ----------------
    if (intent.frequency >= 3) {
      const existingHabit = await Habit.findOne({
        userId,
        habitType: intent.intentType
      })

      if (!existingHabit) {
        await Habit.create({
          userId,
          habitType: intent.intentType,
          triggerPattern: intent.entities,
          confidence: 0.85
        })

        console.log("Habit Promoted 🚀")
      }
    }

    // ---------------- CONTEXT RETRIEVAL ----------------
    const recentMemories = await Memory.find({ userId })
      .sort({ timestamp: -1 })
      .limit(5)

    const detectedHabits = await Habit.find({ userId })

    const intentStats = await Intent.find({ userId })

    // ---------------- STRUCTURED RESPONSE ----------------
    const response = {
      userProfile: user,
      recentMemories,
      detectedHabits,
      intentStats
    }

    console.log("\n--- STRUCTURED CONTEXT RESPONSE ---")
    console.log(JSON.stringify(response, null, 2))

  })
  .catch(err => console.log(err))

app.listen(3000, () => {
  console.log("Server running on port 3000")
})