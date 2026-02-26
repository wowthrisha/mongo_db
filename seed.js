// ARIA seed script — populate MongoDB with demo data
// Run: PORT=5001 npm run dev  (in one terminal)
// Then: npm run seed         (in another terminal)

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aria_intelligence';

// Schemas must match server.js
const userSchema = new mongoose.Schema({
  username:    { type: String, required: true, unique: true, trim: true },
  name:        { type: String, default: '' },
  email:       { type: String, default: '' },
  preferences: { type: mongoose.Schema.Types.Mixed, default: {} },
  sessionCount:{ type: Number, default: 0 },
  lastActive:  { type: Date, default: Date.now },
}, { timestamps: true });

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

const intentSchema = new mongoose.Schema({
  userId:     { type: String, index: true },
  intent:     { type: String, required: true },
  count:      { type: Number, default: 1 },
  confidence: { type: Number, default: 0.9 },
  entities:   { type: mongoose.Schema.Types.Mixed, default: {} },
  lastSeen:   { type: Date, default: Date.now },
}, { timestamps: true });
intentSchema.index({ userId: 1, intent: 1 }, { unique: true, sparse: true });

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

const User   = mongoose.model('User',   userSchema);
const Memory = mongoose.model('Memory', memorySchema);
const Intent = mongoose.model('Intent', intentSchema);
const Habit  = mongoose.model('Habit',  habitSchema);

async function upsertUser(seed) {
  const { username, ...rest } = seed;
  const user = await User.findOneAndUpdate(
    { username },
    { $setOnInsert: { username, ...rest } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return user;
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log(`Connected to ${MONGO_URI} — seeding ARIA demo data...`);

  // ── Users
  const userSeeds = [
    {
      username: 'demo_admin',
      name: 'Demo Admin',
      email: 'admin@example.com',
      preferences: { theme: 'dark', language: 'en', role: 'admin' }
    },
    {
      username: 'knowledge_worker',
      name: 'Knowledge Worker',
      email: 'knowledge@example.com',
      preferences: { theme: 'dark', language: 'en', role: 'analyst' }
    },
    {
      username: 'student_demo',
      name: 'Student Demo',
      email: 'student@example.com',
      preferences: { theme: 'dark', language: 'en', role: 'student' }
    }
  ];

  const users = [];
  for (const u of userSeeds) {
    const doc = await upsertUser(u);
    users.push(doc);
  }

  console.log(`Users ready: ${users.map(u => `${u.username} (${u._id})`).join(', ')}`);

  // Clear existing demo data only for memories/intents/habits (keep any extra users)
  await Memory.deleteMany({});
  await Intent.deleteMany({});
  await Habit.deleteMany({});

  const [admin, analyst, student] = users;

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24*60*60*1000);
  const lastWeek = new Date(now.getTime() - 7*24*60*60*1000);

  // ── Memories
  const memSeeds = [
    // Admin short-term chat
    { user: admin,   role: 'user',      content: 'Set a standup reminder every weekday at 9am.', intent: 'set_standup_reminder', entities: ['time:09:00', 'recurrence:weekday'], memoryType: 'short-term', timestamp: now },
    { user: admin,   role: 'assistant', content: 'I have scheduled a daily standup reminder at 9am.', intent: 'confirm_reminder',  entities: ['time:09:00'], memoryType: 'short-term', timestamp: now },

    // Analyst research trail
    { user: analyst, role: 'user',      content: 'Track weekly report for marketing metrics.', intent: 'track_report', entities: ['department:marketing','frequency:weekly'], memoryType: 'long-term', timestamp: lastWeek },
    { user: analyst, role: 'user',      content: 'Show me the top performing campaigns this month.', intent: 'query_campaigns', entities: ['timeframe:this_month'], memoryType: 'short-term', timestamp: yesterday },
    { user: analyst, role: 'assistant', content: 'Here are the top three campaigns ranked by conversions.', intent: 'answer_campaigns', entities: ['metric:conversions'], memoryType: 'short-term', timestamp: yesterday },

    // Student study habits
    { user: student, role: 'user',      content: 'Remind me to study algorithms every evening at 7pm.', intent: 'set_study_reminder', entities: ['topic:algorithms','time:19:00'], memoryType: 'long-term', timestamp: lastWeek },
    { user: student, role: 'user',      content: 'Add a task to review database notes tomorrow.', intent: 'add_task', entities: ['topic:databases','time:tomorrow'], memoryType: 'short-term', timestamp: yesterday },
    { user: student, role: 'assistant', content: 'I have scheduled your algorithms study reminder.', intent: 'confirm_study_reminder', entities: ['topic:algorithms'], memoryType: 'short-term', timestamp: now }
  ];

  await Memory.insertMany(memSeeds.map(m => ({
    userId: m.user._id.toString(),
    role: m.role,
    content: m.content,
    intent: m.intent,
    entities: m.entities,
    memoryType: m.memoryType,
    timestamp: m.timestamp
  })));

  console.log(`Memories seeded: ${memSeeds.length}`);

  // ── Intents with frequencies (for dashboard + habits)
  const intentSeeds = [
    // Admin
    { user: admin,   intent: 'set_standup_reminder', count: 5, confidence: 0.95, entities: { time: '09:00', recurrence: 'weekday' } },
    { user: admin,   intent: 'check_today_agenda',   count: 2, confidence: 0.9, entities: { timeframe: 'today' } },

    // Analyst
    { user: analyst, intent: 'track_report',         count: 4, confidence: 0.92, entities: { department: 'marketing', frequency: 'weekly' } },
    { user: analyst, intent: 'query_campaigns',      count: 3, confidence: 0.9, entities: { timeframe: 'this_month' } },

    // Student
    { user: student, intent: 'set_study_reminder',   count: 6, confidence: 0.96, entities: { topic: 'algorithms', time: '19:00' } },
    { user: student, intent: 'add_task',             count: 2, confidence: 0.88, entities: { type: 'study_task' } }
  ];

  const intents = [];
  for (const seed of intentSeeds) {
    const doc = await Intent.create({
      userId: seed.user._id.toString(),
      intent: seed.intent,
      count: seed.count,
      confidence: seed.confidence,
      entities: seed.entities,
      lastSeen: now
    });
    intents.push(doc);
  }

  console.log(`Intents seeded: ${intents.length}`);

  // ── Habits derived from high-frequency intents
  const habitSeeds = [
    { intent: 'set_standup_reminder', fromUser: admin,   sourceCount: 5, triggerPattern: 'weekday at 09:00', notes: 'Daily engineering standup.' },
    { intent: 'track_report',         fromUser: analyst, sourceCount: 4, triggerPattern: 'weekly on Monday', notes: 'Marketing performance overview.' },
    { intent: 'set_study_reminder',   fromUser: student, sourceCount: 6, triggerPattern: 'every evening at 19:00', notes: 'Algorithms deep work session.' }
  ];

  for (const h of habitSeeds) {
    await Habit.create({
      userId: h.fromUser._id.toString(),
      intent: h.intent,
      confidence: Math.min(0.99, 0.7 + h.sourceCount / 20),
      triggerPattern: h.triggerPattern,
      notes: h.notes,
      active: true,
      frequency: h.sourceCount,
      promotedFrom: 'seed-script'
    });
  }

  console.log(`Habits seeded: ${habitSeeds.length}`);

  console.log('ARIA seed completed successfully.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});

