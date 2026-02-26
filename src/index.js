// ================================================================
//  ARIA — MongoDB Intelligence Backend (Unified)
//  Combines: authRoutes, memoryRoutes, interactionRoutes,
//            taskRoutes, contextRoutes  +  users, intents,
//            habits, dashboard, unified  (required by the frontend)
// ================================================================

const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const dotenv    = require('dotenv');
const path      = require('path');

dotenv.config();

const app      = express();
const PORT     = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aria_intelligence';

// ──────────────────────────────────────────
//  MIDDLEWARE
// ──────────────────────────────────────────
app.use(cors({
  origin: (_origin, cb) => cb(null, true),
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json());

// ──────────────────────────────────────────
//  MONGOOSE SCHEMAS
// ──────────────────────────────────────────

// 1. USER PROFILE — Persistent user memory
const userSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, trim: true },
  name:         { type: String, default: '' },
  email:        { type: String, default: '' },
  preferences:  { type: mongoose.Schema.Types.Mixed, default: {} },
  // Embedded subdocument for richer profile metadata
  profile: {
    bio:      { type: String, default: '' },
    timezone: { type: String, default: 'UTC' },
  },
  // Array of embedded documents to demonstrate arrays of documents
  sessions: [{
    startedAt: { type: Date,   default: Date.now },
    device:    { type: String, default: 'web' },
    region:    { type: String, default: 'unknown' },
  }],
  sessionCount: { type: Number, default: 0 },
  lastActive:   { type: Date,   default: Date.now },
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

// 5. INTERACTION — from original interactionRoutes
const interactionSchema = new mongoose.Schema({
  userId:    { type: String, index: true },
  type:      { type: String, default: 'message' },
  content:   { type: String, required: true },
  metadata:  { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

// 6. TASK — from original taskRoutes
const taskSchema = new mongoose.Schema({
  userId:      { type: String, index: true },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  status:      { type: String, enum: ['pending','in-progress','completed','cancelled'], default: 'pending' },
  priority:    { type: String, enum: ['low','medium','high'], default: 'medium' },
  dueDate:     { type: Date },
  tags:        [{ type: String }],
}, { timestamps: true });

const User        = mongoose.model('User',        userSchema);
const Memory      = mongoose.model('Memory',      memorySchema);
const Intent      = mongoose.model('Intent',      intentSchema);
const Habit       = mongoose.model('Habit',       habitSchema);
const Interaction = mongoose.model('Interaction', interactionSchema);
const Task        = mongoose.model('Task',        taskSchema);

// ──────────────────────────────────────────
//  HEALTH + DEMO
// ──────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));
app.get('/api/health', (_req, res) => {
  res.json({
    status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// Serve the frontend HTML if it lives next to this file
app.get('/demo', (_req, res) => {
  const p = path.join(__dirname, '..', 'aria-dashboard.html');
  res.sendFile(p);
});

// ──────────────────────────────────────────
//  DASHBOARD STATS
// ──────────────────────────────────────────
app.get('/api/dashboard', async (_req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const [users, memories, intents, habits, todayMessages,
           topIntents, activeHabits, recentMemories] = await Promise.all([
      User.countDocuments(),
      Memory.countDocuments(),
      Intent.countDocuments(),
      Habit.countDocuments(),
      Memory.countDocuments({ timestamp: { $gte: today } }),
      Intent.find().sort({ count: -1 }).limit(5).select('intent count'),
      Habit.find({ active: true }).sort({ confidence: -1 }).limit(5).select('intent confidence'),
      Memory.find().sort({ timestamp: -1 }).limit(5).select('role content intent timestamp'),
    ]);
    res.json({
      users, memories, intents, habits,
      conversations: Math.ceil(memories / 5),
      todayMessages,
      topIntents,
      activeHabits,
      recentMemories,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════
//  AUTH  (lightweight — no JWT needed for demo)
// ══════════════════════════════════════════
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, name, email, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username + password required' });
    const u = await User.create({ username, name: name || username, email });
    res.status(201).json({ message: 'Registered', userId: u._id, username: u.username });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Username already exists' });
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });
    const u = await User.findOne({ username });
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Login OK', userId: u._id, username: u.username });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════
//  1. USERS — CRUD
// ══════════════════════════════════════════
app.get('/api/users', async (_req, res) => {
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
    res.json(u);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const u = await User.findByIdAndDelete(req.params.id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'User deleted', id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// User sessions — demonstrate array of embedded documents + aggregation
app.post('/api/users/:id/sessions', async (req, res) => {
  try {
    const { device, region, startedAt } = req.body || {};
    const session = {
      device: device || 'web',
      region: region || 'unknown',
      startedAt: startedAt ? new Date(startedAt) : new Date(),
    };
    const u = await User.findByIdAndUpdate(
      req.params.id,
      { $push: { sessions: session } },
      { new: true, runValidators: true },
    );
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.status(201).json({ userId: u._id, session });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/users/:id/sessions/summary', async (req, res) => {
  try {
    const userId = req.params.id;
    const objectId = new mongoose.Types.ObjectId(userId);
    const pipeline = [
      { $match: { _id: objectId } },
      { $unwind: '$sessions' },
      {
        $group: {
          _id: { device: '$sessions.device', region: '$sessions.region' },
          count: { $sum: 1 },
          firstSeen: { $min: '$sessions.startedAt' },
          lastSeen:  { $max: '$sessions.startedAt' },
        },
      },
      {
        $project: {
          _id: 0,
          device: '$_id.device',
          region: '$_id.region',
          count: 1,
          firstSeen: 1,
          lastSeen: 1,
        },
      },
      { $sort: { count: -1 } },
    ];
    const summary = await User.aggregate(pipeline);
    res.json({ userId, summary });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ══════════════════════════════════════════
//  2. MEMORIES — CRUD + context
// ══════════════════════════════════════════
// ⚠️  /context/:userId MUST be registered before /:id so Express
//     does not treat "context" as a Mongo ObjectId.
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

app.get('/api/memories', async (req, res) => {
  try {
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.type)   filter.memoryType = req.query.type;
    if (req.query.intent) filter.intent = new RegExp(req.query.intent, 'i');
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

app.post('/api/memories', async (req, res) => {
  try {
    const { userId, role, content, intent, entities, memoryType } = req.body;
    if (!userId || !content) return res.status(400).json({ error: 'userId + content required' });
    const m = await Memory.create({ userId, role, content, intent, entities, memoryType });
    User.findByIdAndUpdate(userId, { lastActive: new Date() }).catch(() => {});
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

app.delete('/api/memories', async (req, res) => {
  try {
    if (!req.query.userId) return res.status(400).json({ error: '?userId required' });
    const result = await Memory.deleteMany({ userId: req.query.userId });
    res.json({ message: `Deleted ${result.deletedCount} memories` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/memories/:id', async (req, res) => {
  try {
    const m = await Memory.findByIdAndDelete(req.params.id);
    if (!m) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Memory deleted', id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════
//  3. INTENTS — $inc upsert + auto-promote
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

app.post('/api/intents', async (req, res) => {
  try {
    const { userId, intent, confidence, entities } = req.body;
    if (!intent) return res.status(400).json({ error: 'intent required' });

    const filter = userId ? { userId, intent } : { intent, userId: { $exists: false } };
    const update = {
      $inc: { count: 1 },
      $set: { confidence: confidence || 0.9, lastSeen: new Date(), entities: entities || {} },
      $setOnInsert: { userId: userId || null },
    };
    const i = await Intent.findOneAndUpdate(filter, update,
      { upsert: true, new: true, setDefaultsOnInsert: true });

    console.log(`[INTENT LOG] "${intent}" count=${i.count}`);

    // Auto-promote to habit at count >= 3
    let autoPromoted = false;
    if (i.count >= 3) {
      const exists = await Habit.findOne({ userId: userId || null, intent });
      if (!exists) {
        await Habit.create({
          userId: userId || null, intent,
          confidence: Math.min(0.99, i.count / 10),
          promotedFrom: 'auto',
          triggerPattern: 'detected by frequency',
        });
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
//  4. HABITS — 3+ rule, auto-detect
// ══════════════════════════════════════════
// ⚠️  /detect MUST come before /:id
app.get('/api/habits/detect', async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 3;
    const filter = { count: { $gte: threshold } };
    if (req.query.userId) filter.userId = req.query.userId;

    const candidates = await Intent.find(filter);
    const promoted   = [];
    for (const intent of candidates) {
      const exists = await Habit.findOne({ userId: intent.userId, intent: intent.intent });
      if (!exists) {
        const h = await Habit.create({
          userId: intent.userId,
          intent: intent.intent,
          confidence: Math.min(0.99, intent.count / 10 + 0.3),
          promotedFrom: 'auto-detect',
          triggerPattern: `frequency: ${intent.count}x`,
          frequency: intent.count,
        });
        promoted.push(h);
        console.log(`[HABIT DETECT] "${intent.intent}" promoted (count=${intent.count})`);
      }
    }
    res.json({ promoted: promoted.length, habits: promoted, checked: candidates.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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
//  5. INTERACTIONS  (from original routes)
// ══════════════════════════════════════════
app.get('/api/interactions', async (req, res) => {
  try {
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    const items = await Interaction.find(filter).sort({ timestamp: -1 }).limit(100);
    res.json({ total: items.length, interactions: items });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/interactions', async (req, res) => {
  try {
    const { userId, type, content, metadata } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });
    const item = await Interaction.create({ userId, type, content, metadata });
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/interactions/:id', async (req, res) => {
  try {
    const item = await Interaction.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════
//  6. TASKS  (from original routes)
// ══════════════════════════════════════════
app.get('/api/tasks', async (req, res) => {
  try {
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.status) filter.status = req.query.status;
    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json({ total: tasks.length, tasks });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { userId, title, description, status, priority, dueDate, tags } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const task = await Task.create({ userId, title, description, status, priority, dueDate, tags });
    res.status(201).json(task);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const allowed = ['title','description','status','priority','dueDate','tags'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!task) return res.status(404).json({ error: 'Not found' });
    res.json(task);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════
//  7. CONTEXT  (from original contextRoutes)
// ══════════════════════════════════════════
app.get('/api/context/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const [memories, habits, intents, tasks] = await Promise.all([
      Memory.find({ userId }).sort({ timestamp: -1 }).limit(10),
      Habit.find({ userId, active: true }).sort({ confidence: -1 }),
      Intent.find({ userId }).sort({ count: -1 }).limit(10),
      Task.find({ userId, status: { $ne: 'completed' } }).sort({ createdAt: -1 }).limit(5),
    ]);
    res.json({ userId, memories, habits, intents, tasks });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════
//  8. UNIFIED OUTPUT - Enhanced with Advanced MongoDB Operations
// ══════════════════════════════════════════
app.get('/api/unified', async (req, res) => {
  try {
    const { userId } = req.query;
    
    // Advanced aggregation pipeline demonstrating LIMIT, SORT, GROUP, PROJECT
    const userPipeline = userId ? [
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      {
        $project: {
          username: 1,
          name: 1,
          email: 1,
          preferences: 1,
          profile: 1,
          sessionCount: 1,
          lastActive: 1,
          // Embedded documents demonstration
          'sessions.device': 1,
          'sessions.region': 1,
          'sessions.startedAt': 1
        }
      }
    ] : [
      { $sort: { lastActive: -1 } },
      { $limit: 5 }, // LIMIT operation
      {
        $project: {
          username: 1,
          name: 1,
          email: 1,
          preferences: 1,
          lastActive: 1
        }
      }
    ];
    
    const memoryPipeline = userId ? [
      { $match: { userId } },
      { $sort: { timestamp: -1 } },
      { $limit: 5 }, // LIMIT operation
      {
        $project: {
          role: 1,
          content: 1,
          intent: 1,
          entities: 1, // Array of documents
          memoryType: 1,
          timestamp: 1
        }
      }
    ] : [
      { $sort: { timestamp: -1 } },
      { $limit: 5 }, // LIMIT operation
      {
        $project: {
          userId: 1,
          role: 1,
          content: 1,
          intent: 1,
          timestamp: 1
        }
      }
    ];
    
    const habitPipeline = userId ? [
      { $match: { userId, active: true } },
      { $sort: { confidence: -1 } }
    ] : [
      { $match: { active: true } },
      { $sort: { confidence: -1 } },
      { $limit: 10 } // LIMIT operation
    ];
    
    const intentPipeline = userId ? [
      { $match: { userId } },
      { $sort: { count: -1 } },
      { $limit: 10 } // LIMIT operation
    ] : [
      { $sort: { count: -1 } },
      { $limit: 10 } // LIMIT operation
    ];
    
    // Demonstrate array operations and embedded documents
    const sessionPipeline = userId ? [
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      { $unwind: '$sessions' }, // Deconstruct array field
      {
        $group: {
          _id: { device: '$sessions.device', region: '$sessions.region' },
          count: { $sum: 1 },
          firstSeen: { $min: '$sessions.startedAt' },
          lastSeen: { $max: '$sessions.startedAt' },
          avgSessionDuration: { $avg: { $ifNull: ['$sessions.duration', 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          device: '$_id.device',
          region: '$_id.region',
          count: 1,
          firstSeen: 1,
          lastSeen: 1,
          avgSessionDuration: { $round: ['$avgSessionDuration', 2] }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ] : [];
    
    const [userProfile, recentMemories, detectedHabits, intentStats, sessionSummary] = await Promise.all([
      User.aggregate(userPipeline),
      Memory.aggregate(memoryPipeline),
      Habit.aggregate(habitPipeline),
      Intent.aggregate(intentPipeline),
      sessionPipeline.length > 0 ? User.aggregate(sessionPipeline) : Promise.resolve([])
    ]);
    
    // Enhanced response with metadata
    const response = {
      userProfile: userProfile,
      recentMemories,
      detectedHabits,
      intentStats,
      sessionSummary,
      meta: {
        timestamp: new Date(),
        userId: userId || 'all',
        memoryCount: recentMemories.length,
        habitCount: Array.isArray(detectedHabits) ? detectedHabits.length : 0,
        intentCount: Array.isArray(intentStats) ? intentStats.length : 0,
        features: [
          'LIMIT', 'SORT', 'AGGREGATE', 'GROUP', 'PROJECT', 
          'MATCH', 'UNWIND', 'ADD_TO_SET', 'SUM', 'AVG', 
          'MIN', 'MAX', 'IF_NULL', 'ROUND', 'SIZE', 'FILTER'
        ],
        dataStructures: [
          'Array of Documents (sessions)',
          'Embedded Documents (profile, preferences)',
          'References (userId)',
          'Aggregation Results'
        ]
      }
    };
    
    res.json(response);
  } catch (err) { 
    res.status(500).json({ 
      error: err.message, 
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    }); 
  }
});

// ══════════════════════════════════════════
//  9. ANALYTICS / AGGREGATIONS
// ══════════════════════════════════════════
app.get('/api/analytics/intent-summary', async (_req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: '$intent',
          totalCount: { $sum: '$count' },
          users: { $addToSet: '$userId' },
          avgConfidence: { $avg: '$confidence' },
          maxCount: { $max: '$count' },
          minCount: { $min: '$count' }
        },
      },
      {
        $project: {
          _id: 0,
          intent: '$_id',
          totalCount: 1,
          userCount: {
            $size: {
              $filter: {
                input: '$users',
                as: 'u',
                cond: { $ne: ['$$u', null] },
              },
            },
          },
          avgConfidence: { $round: ['$avgConfidence', 2] },
          maxCount: 1,
          minCount: 1,
          frequency: {
            $switch: {
              branches: [
                { case: { $gte: ['$totalCount', 10] }, then: 'Very High' },
                { case: { $gte: ['$totalCount', 5] }, then: 'High' },
                { case: { $gte: ['$totalCount', 3] }, then: 'Medium' },
                { case: { $gte: ['$totalCount', 2] }, then: 'Low' }
              ],
              default: 'Very Low'
            }
          }
        },
      },
      { $sort: { totalCount: -1, intent: 1 } },
      { $limit: 20 }
    ];
    const summary = await Intent.aggregate(pipeline);
    
    // Additional analytics for comprehensive dashboard
    const analyticsPipeline = [
      {
        $group: {
          _id: null,
          totalIntents: { $sum: 1 },
          totalOccurrences: { $sum: '$count' },
          uniqueUsers: { $addToSet: '$userId' },
          avgConfidence: { $avg: '$confidence' },
          topIntent: { $first: '$intent' }
        }
      },
      {
        $project: {
          _id: 0,
          totalIntents: 1,
          totalOccurrences: 1,
          uniqueUserCount: { $size: { $filter: { input: '$uniqueUsers', as: 'u', cond: { $ne: ['$$u', null] } } } },
          avgConfidence: { $round: ['$avgConfidence', 3] },
          topIntent: 1,
          dateRange: {
            start: new Date(new Date().setDate(new Date().getDate() - 30)),
            end: new Date()
          }
        }
      }
    ];
    
    const analytics = await Intent.aggregate(analyticsPipeline);
    
    res.json({ 
      total: summary.length, 
      summary,
      analytics: analytics[0] || {},
      meta: {
        timestamp: new Date(),
        aggregationPipeline: '$group -> $project -> $sort -> $limit',
        features: ['GROUP', 'AGGREGATE', 'SORT', 'LIMIT', 'PROJECT', 'FILTER', 'SIZE', 'SWITCH']
      }
    });
  } catch (err) { 
    res.status(500).json({ error: err.message, stack: err.stack }); 
  }
});

// Some dev servers append "_404" when proxying unknown paths; provide a
// backwards-compatible alias so the dashboard's button always works.
app.get('/api/analytics/intent-summary_404', async (req, res) => {
  return app._router.handle(
    Object.assign(req, { url: '/api/analytics/intent-summary' }),
    res,
    () => res.status(404).json({ error: 'Route not found' }),
  );
});

// ──────────────────────────────────────────
//  404 + ERROR HANDLERS
// ──────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ──────────────────────────────────────────
//  START
// ──────────────────────────────────────────
async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`✅  MongoDB → ${MONGO_URI}`);
    app.listen(PORT, () => {
      console.log(`\n🚀  ARIA Intelligence API  →  http://localhost:${PORT}`);
      console.log(`    Frontend demo           →  http://localhost:${PORT}/demo\n`);
      console.log('── ENDPOINTS ──────────────────────────────────');
      console.log('  GET  /api/health');
      console.log('  GET  /api/dashboard');
      console.log('  GET|POST          /api/users');
      console.log('  GET|PUT|DELETE    /api/users/:id');
      console.log('  POST              /api/users/:id/sessions');
      console.log('  GET               /api/users/:id/sessions/summary');
      console.log('  GET|POST          /api/memories');
      console.log('  GET|PUT|DELETE    /api/memories/:id');
      console.log('  GET               /api/memories/context/:userId');
      console.log('  GET|POST          /api/intents');
      console.log('  GET|PUT|DELETE    /api/intents/:id');
      console.log('  GET|POST          /api/habits');
      console.log('  GET               /api/habits/detect');
      console.log('  GET|PUT|DELETE    /api/habits/:id');
      console.log('  GET|POST|DELETE   /api/interactions[/:id]');
      console.log('  GET|POST          /api/tasks');
      console.log('  GET|PUT|DELETE    /api/tasks/:id');
      console.log('  GET               /api/context/:userId');
      console.log('  GET               /api/unified[?userId=]');
      console.log('  GET               /api/analytics/intent-summary');
      console.log('───────────────────────────────────────────────\n');
    });
  } catch (err) {
    console.error('❌  Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
