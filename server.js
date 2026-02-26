// ================================================================
//  ARIA — MongoDB Intelligence Backend
//  Features: User Memory | Conversation Memory | Context Retrieval
//            Intent Logging | Habit Detection | Unified API Output
// ================================================================

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aria_intelligence';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ──────────────────────────────────────────
//  SCHEMAS
// ──────────────────────────────────────────

// 1. USER PROFILE — Persistent user memory
const userSchema = new mongoose.Schema({
  username:    { type: String, required: true, unique: true, trim: true },
  name:        { type: String, default: '' },
  email:       { type: String, default: '' },
  preferences: { type: mongoose.Schema.Types.Mixed, default: {} },
  sessionCount:{ type: Number, default: 0 },
  lastActive:  { type: Date, default: Date.now },
}, { timestamps: true });

// 2. CONVERSATION MEMORY — Per-message storage
const memorySchema = new mongoose.Schema({
  userId:     { type: String, required: true, index: true },
  role:       { type: String, enum: ['user','assistant','system'], default: 'user' },
  content:    { type: String, required: true },
  intent:     { type: String, default: '' },
  entities:   [{ type: String }],
  memoryType: { type: String, enum: ['short-term','long-term'], default: 'short-term' },
  timestamp:  { type: Date, default: Date.now },
}, { timestamps: true });
memorySchema.index({ userId: 1, timestamp: -1 });

// 3. INTENT LOG — Frequency tracking with $inc
const intentSchema = new mongoose.Schema({
  userId:     { type: String, index: true },
  intent:     { type: String, required: true },
  count:      { type: Number, default: 1 },
  confidence: { type: Number, default: 0.9 },
  entities:   { type: mongoose.Schema.Types.Mixed, default: {} },
  lastSeen:   { type: Date, default: Date.now },
}, { timestamps: true });
intentSchema.index({ userId: 1, intent: 1 }, { unique: true, sparse: true });

// 4. HABIT — Promoted when intent count >= 3
const habitSchema = new mongoose.Schema({
  userId:         { type: String, index: true },
  intent:         { type: String, required: true },
  confidence:     { type: Number, default: 0.85 },
  triggerPattern: { type: String, default: '' },
  notes:          { type: String, default: '' },
  active:         { type: Boolean, default: true },
  frequency:      { type: Number, default: 0 },
  promotedFrom:   { type: String, default: 'manual' },
}, { timestamps: true });

const User    = mongoose.model('User',    userSchema);
const Memory  = mongoose.model('Memory',  memorySchema);
const Intent  = mongoose.model('Intent',  intentSchema);
const Habit   = mongoose.model('Habit',   habitSchema);

// ──────────────────────────────────────────
//  CONNECT
// ──────────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => console.log(`✅  MongoDB → ${MONGO_URI}`))
  .catch(err => { console.error('❌  MongoDB error:', err.message); process.exit(1); });

// ──────────────────────────────────────────
//  HEALTH
// ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// ──────────────────────────────────────────
//  DASHBOARD STATS
// ──────────────────────────────────────────
app.get('/api/dashboard', async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const [users, memories, intents, habits, todayMessages, topIntents, activeHabits, recentMemories] = await Promise.all([
      User.countDocuments(),
      Memory.countDocuments(),
      Intent.countDocuments(),
      Habit.countDocuments(),
      Memory.countDocuments({ timestamp: { $gte: today } }),
      Intent.find().sort({ count: -1 }).limit(5).select('intent count'),
      Habit.find({ active: true }).sort({ confidence: -1 }).limit(5).select('intent confidence'),
      Memory.find().sort({ timestamp: -1 }).limit(5).select('role content intent timestamp')
    ]);
    res.json({
      users, memories, intents, habits,
      conversations: Math.ceil(memories / 5),
      todayMessages,
      topIntents,
      activeHabits,
      recentMemories
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════
//  1. USER MEMORY — CRUD
// ══════════════════════════════════════════
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ total: users.length, users });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json(u);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username, name, email, preferences } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });
    const u = await User.create({ username, name, email, preferences });
    console.log(`[USER CREATE] ${u.username}`);
    res.status(201).json(u);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Username already exists' });
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const allowed = ['name','email','preferences','sessionCount','lastActive'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const u = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!u) return res.status(404).json({ error: 'Not found' });
    console.log(`[USER UPDATE] ${u.username}`);
    res.json(u);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const u = await User.findByIdAndDelete(req.params.id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    console.log(`[USER DELETE] ${u.username}`);
    res.json({ message: 'User deleted', id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════
//  2. CONVERSATION MEMORY STORAGE — CRUD
// ══════════════════════════════════════════
app.get('/api/memories', async (req, res) => {
  try {
    const filter = {};
    if (req.query.userId)  filter.userId = req.query.userId;
    if (req.query.type)    filter.memoryType = req.query.type;
    if (req.query.intent)  filter.intent = new RegExp(req.query.intent, 'i');
    const memories = await Memory.find(filter).sort({ timestamp: -1 }).limit(200);
    res.json({ total: memories.length, memories });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/memories/:id', async (req, res) => {
  try {
    const m = await Memory.findById(req.params.id);
    if (!m) return res.status(404).json({ error: 'Not found' });
    res.json(m);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. CONTEXT RETRIEVAL — Last 5 memories
app.get('/api/memories/context/:userId', async (req, res) => {
  try {
    const filter = { userId: req.params.userId };
    if (req.query.type) filter.memoryType = req.query.type;
    const memories = await Memory.find(filter)
      .sort({ timestamp: -1 })
      .limit(5)
      .select('role content intent entities timestamp memoryType');
    res.json({ userId: req.params.userId, count: memories.length, memories });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/memories', async (req, res) => {
  try {
    const { userId, role, content, intent, entities, memoryType } = req.body;
    if (!userId || !content) return res.status(400).json({ error: 'userId + content required' });
    const m = await Memory.create({ userId, role, content, intent, entities, memoryType });
    // Bump user lastActive
    User.findByIdAndUpdate(userId, { lastActive: new Date() }).catch(() => {});
    console.log(`[MEM STORE] user:${userId} role:${role} intent:${intent}`);
    res.status(201).json(m);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/memories/:id', async (req, res) => {
  try {
    const allowed = ['content','intent','entities','memoryType'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const m = await Memory.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!m) return res.status(404).json({ error: 'Not found' });
    res.json(m);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/memories/:id', async (req, res) => {
  try {
    const m = await Memory.findByIdAndDelete(req.params.id);
    if (!m) return res.status(404).json({ error: 'Not found' });
    console.log(`[MEM DELETE] ${m._id}`);
    res.json({ message: 'Memory deleted', id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Bulk delete by userId
app.delete('/api/memories', async (req, res) => {
  try {
    if (!req.query.userId) return res.status(400).json({ error: '?userId required' });
    const result = await Memory.deleteMany({ userId: req.query.userId });
    res.json({ message: `Deleted ${result.deletedCount} memories` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════
//  4. INTENT LOGGING — with $inc
// ══════════════════════════════════════════
app.get('/api/intents', async (req, res) => {
  try {
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    const intents = await Intent.find(filter).sort({ count: -1 });
    res.json({ total: intents.length, intents });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/intents/:id', async (req, res) => {
  try {
    const i = await Intent.findById(req.params.id);
    if (!i) return res.status(404).json({ error: 'Not found' });
    res.json(i);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Log intent — upsert with $inc for frequency tracking
app.post('/api/intents', async (req, res) => {
  try {
    const { userId, intent, confidence, entities } = req.body;
    if (!intent) return res.status(400).json({ error: 'intent required' });

    const filter = userId ? { userId, intent } : { intent, userId: { $exists: false } };
    const update = {
      $inc: { count: 1 },            // ← KEY: increment frequency
      $set: { confidence: confidence || 0.9, lastSeen: new Date(), entities: entities || {} },
      $setOnInsert: { userId: userId || null }
    };

    const i = await Intent.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true });
    console.log(`[INTENT LOG] "${intent}" count=${i.count}`);

    // Auto-check for habit promotion (3+ rule)
    let autoPromoted = false;
    if (i.count >= 3) {
      const exists = await Habit.findOne({ userId: userId||null, intent });
      if (!exists) {
        await Habit.create({ userId: userId||null, intent, confidence: Math.min(0.99, i.count / 10), promotedFrom: 'auto', triggerPattern: 'detected by frequency' });
        autoPromoted = true;
        console.log(`[HABIT AUTO] "${intent}" promoted (count=${i.count})`);
      }
    }

    res.status(201).json({ ...i.toObject(), autoPromoted });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/intents/:id', async (req, res) => {
  try {
    const allowed = ['intent','confidence','entities'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const i = await Intent.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!i) return res.status(404).json({ error: 'Not found' });
    res.json(i);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/intents/:id', async (req, res) => {
  try {
    const i = await Intent.findByIdAndDelete(req.params.id);
    if (!i) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════
//  5. HABIT DETECTION — 3+ Rule
// ══════════════════════════════════════════
app.get('/api/habits', async (req, res) => {
  try {
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.active !== undefined) filter.active = req.query.active === 'true';
    const habits = await Habit.find(filter).sort({ confidence: -1 });
    res.json({ total: habits.length, habits });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/habits/:id', async (req, res) => {
  try {
    const h = await Habit.findById(req.params.id);
    if (!h) return res.status(404).json({ error: 'Not found' });
    res.json(h);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Auto-detect habits from intent frequency
app.get('/api/habits/detect', async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 3;
    const filter = { count: { $gte: threshold } };
    if (req.query.userId) filter.userId = req.query.userId;

    const candidates = await Intent.find(filter);
    const promoted = [];

    for (const intent of candidates) {
      const exists = await Habit.findOne({ userId: intent.userId, intent: intent.intent });
      if (!exists) {
        const h = await Habit.create({
          userId: intent.userId,
          intent: intent.intent,
          confidence: Math.min(0.99, intent.count / 10 + 0.3),
          promotedFrom: 'auto-detect',
          triggerPattern: `frequency: ${intent.count}x`,
          frequency: intent.count
        });
        promoted.push(h);
        console.log(`[HABIT DETECT] "${intent.intent}" promoted (count=${intent.count})`);
      }
    }

    res.json({ promoted: promoted.length, habits: promoted, checked: candidates.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/habits', async (req, res) => {
  try {
    const { userId, intent, confidence, triggerPattern, notes } = req.body;
    if (!intent) return res.status(400).json({ error: 'intent required' });
    const h = await Habit.create({ userId, intent, confidence, triggerPattern, notes });
    console.log(`[HABIT PROMOTE] "${intent}"`);
    res.status(201).json(h);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/habits/:id', async (req, res) => {
  try {
    const allowed = ['intent','confidence','triggerPattern','notes','active','frequency'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const h = await Habit.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!h) return res.status(404).json({ error: 'Not found' });
    res.json(h);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/habits/:id', async (req, res) => {
  try {
    const h = await Habit.findByIdAndDelete(req.params.id);
    if (!h) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════
//  6. UNIFIED API OUTPUT
//  Returns: { userProfile, recentMemories, detectedHabits, intentStats }
// ══════════════════════════════════════════
app.get('/api/unified', async (req, res) => {
  try {
    const { userId } = req.query;

    // Parallel fetch of all data
    const [userProfile, recentMemories, detectedHabits, intentStats] = await Promise.all([
      userId
        ? User.findById(userId).catch(() => null)
        : User.find().sort({ lastActive: -1 }).limit(5),
      userId
        ? Memory.find({ userId }).sort({ timestamp: -1 }).limit(5)
        : Memory.find().sort({ timestamp: -1 }).limit(5),
      userId
        ? Habit.find({ userId, active: true }).sort({ confidence: -1 })
        : Habit.find({ active: true }).sort({ confidence: -1 }).limit(10),
      userId
        ? Intent.find({ userId }).sort({ count: -1 }).limit(10)
        : Intent.find().sort({ count: -1 }).limit(10)
    ]);

    const response = {
      userProfile,
      recentMemories,
      detectedHabits,
      intentStats,
      meta: {
        timestamp: new Date(),
        userId: userId || 'all',
        memoryCount: recentMemories.length,
        habitCount: Array.isArray(detectedHabits) ? detectedHabits.length : 0,
        intentCount: Array.isArray(intentStats) ? intentStats.length : 0
      }
    };

    res.json(response);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ──────────────────────────────────────────
//  START
// ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  ARIA Intelligence API → http://localhost:${PORT}\n`);
  console.log('── HEALTH');
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/dashboard\n`);
  console.log('── USERS  (Persistent Memory)');
  console.log(`  GET   POST              /api/users`);
  console.log(`  GET   PUT   DELETE      /api/users/:id\n`);
  console.log('── MEMORIES  (Conversation Storage + Context)');
  console.log(`  GET   POST              /api/memories`);
  console.log(`  GET   PUT   DELETE      /api/memories/:id`);
  console.log(`  GET                     /api/memories/context/:userId  ← Last 5\n`);
  console.log('── INTENTS  (Logging + $inc Frequency)');
  console.log(`  GET   POST              /api/intents`);
  console.log(`  GET   PUT   DELETE      /api/intents/:id\n`);
  console.log('── HABITS  (3+ Rule Auto-Promote)');
  console.log(`  GET   POST              /api/habits`);
  console.log(`  GET   PUT   DELETE      /api/habits/:id`);
  console.log(`  GET                     /api/habits/detect  ← auto-detect\n`);
  console.log('── UNIFIED OUTPUT');
  console.log(`  GET  /api/unified`);
  console.log(`  GET  /api/unified?userId=<id>\n`);
});

