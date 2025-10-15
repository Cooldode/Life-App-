// functions/index.js - compatibility layer implementing Base44-like API for emulator
const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Very small auth helper: accepts emulator-token or verifies Firebase ID tokens
async function verifyToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 1) {
    const token = parts[0];
    if (token === 'emulator-token') return { uid: 'emulator-user', email: 'emulator@local' };
    try { return await admin.auth().verifyIdToken(token); } catch (e) { return null; }
  }
  if (parts.length === 2) {
    const scheme = parts[0]; const token = parts[1];
    if (!/^Bearer$/i.test(scheme)) return null;
    if (token === 'emulator-token') return { uid: 'emulator-user', email: 'emulator@local' };
    try { return await admin.auth().verifyIdToken(token); } catch (e) { return null; }
  }
  return null;
}

const requireAuth = (handler) => wrap(async (req, res, next) => {
  const decoded = await verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });
  req.user = decoded;
  return handler(req, res, next);
});

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// Apps
app.get('/api/apps', wrap(async (req, res) => {
  const limit = parseInt(req.query.limit || '10', 10) || 10;
  const snap = await db.collection('apps').limit(limit).get();
  return res.json({ items: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
}));

app.get('/api/apps/:id', wrap(async (req, res) => {
  const doc = await db.collection('apps').doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: 'Not found' });
  return res.json({ id: doc.id, ...doc.data() });
}));

app.post('/api/apps', requireAuth(wrap(async (req, res) => {
  const ref = await db.collection('apps').add(req.body || {});
  const doc = await ref.get();
  return res.json({ id: ref.id, ...doc.data() });
})));

// Agents
app.get('/api/apps/:appId/agents', wrap(async (req, res) => {
  const snap = await db.collection('apps').doc(req.params.appId).collection('agents').get();
  return res.json({ items: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
}));

app.get('/api/apps/:appId/agents/:agentId', wrap(async (req, res) => {
  const doc = await db.collection('apps').doc(req.params.appId).collection('agents').doc(req.params.agentId).get();
  if (!doc.exists) return res.status(404).json({ error: 'Agent not found' });
  return res.json({ id: doc.id, ...doc.data() });
}));

app.post('/api/apps/:appId/agents', requireAuth(wrap(async (req, res) => {
  const ref = await db.collection('apps').doc(req.params.appId).collection('agents').add(req.body || {});
  const doc = await ref.get();
  return res.json({ id: ref.id, ...doc.data() });
})));

app.put('/api/apps/:appId/agents/:agentId', requireAuth(wrap(async (req, res) => {
  await db.collection('apps').doc(req.params.appId).collection('agents').doc(req.params.agentId).set(req.body || {}, { merge: true });
  const doc = await db.collection('apps').doc(req.params.appId).collection('agents').doc(req.params.agentId).get();
  return res.json({ id: doc.id, ...doc.data() });
})));

// Conversations & messages
app.get('/api/apps/:appId/agents/:agentId/conversations', wrap(async (req, res) => {
  const snap = await db.collection('apps').doc(req.params.appId).collection('agents').doc(req.params.agentId).collection('conversations').limit(50).get();
  return res.json({ items: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
}));

app.post('/api/apps/:appId/agents/:agentId/conversations', requireAuth(wrap(async (req, res) => {
  const ref = await db.collection('apps').doc(req.params.appId).collection('agents').doc(req.params.agentId).collection('conversations').add(req.body || {});
  const doc = await ref.get();
  return res.json({ id: ref.id, ...doc.data() });
})));

app.post('/api/apps/:appId/agents/:agentId/conversations/:convId/messages', requireAuth(wrap(async (req, res) => {
  const ref = await db.collection('apps').doc(req.params.appId).collection('agents').doc(req.params.agentId).collection('conversations').doc(req.params.convId).collection('messages').add(Object.assign({ createdAt: admin.firestore.FieldValue.serverTimestamp() }, req.body || {}));
  const doc = await ref.get();
  return res.json({ id: ref.id, ...doc.data() });
})));

// Entities CRUD
app.get('/api/apps/:appId/entities/:entityName', wrap(async (req, res) => {
  const q = db.collection('apps').doc(req.params.appId).collection('entities').doc(req.params.entityName).collection('items').limit(parseInt(req.query.limit || '50', 10));
  const snap = await q.get();
  return res.json({ items: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
}));

app.post('/api/apps/:appId/entities/:entityName', requireAuth(wrap(async (req, res) => {
  const ref = await db.collection('apps').doc(req.params.appId).collection('entities').doc(req.params.entityName).collection('items').add(req.body || {});
  const doc = await ref.get();
  return res.json({ id: ref.id, ...doc.data() });
})));

app.get('/api/apps/:appId/entities/:entityName/:itemId', wrap(async (req, res) => {
  const doc = await db.collection('apps').doc(req.params.appId).collection('entities').doc(req.params.entityName).collection('items').doc(req.params.itemId).get();
  if (!doc.exists) return res.status(404).json({ error: 'Not found' });
  return res.json({ id: doc.id, ...doc.data() });
}));

app.put('/api/apps/:appId/entities/:entityName/:itemId', requireAuth(wrap(async (req, res) => {
  await db.collection('apps').doc(req.params.appId).collection('entities').doc(req.params.entityName).collection('items').doc(req.params.itemId).set(req.body || {}, { merge: true });
  const doc = await db.collection('apps').doc(req.params.appId).collection('entities').doc(req.params.entityName).collection('items').doc(req.params.itemId).get();
  return res.json({ id: doc.id, ...doc.data() });
})));

// Public lookups
app.get('/api/apps/public/prod/by-slug/:slug', wrap(async (req, res) => {
  const snapshot = await db.collection('apps').where('slug', '==', req.params.slug).limit(1).get();
  if (snapshot.empty) return res.status(404).json({ error: 'Not found' });
  const doc = snapshot.docs[0];
  return res.json({ id: doc.id, ...doc.data() });
}));

app.get('/api/apps/public/prod/by-id/:id', wrap(async (req, res) => {
  const doc = await db.collection('apps').doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: 'Not found' });
  return res.json({ id: doc.id, ...doc.data() });
}));

// Integration endpoints schema (stub)
app.get('/api/apps/:appId/integration-endpoints/schema', wrap(async (req, res) => {
  return res.json({ installed_packages: [], missing_packages: [], endpoints: [] });
}));

// Invites
app.post('/api/apps/:appId/users/invite-user', requireAuth(wrap(async (req, res) => {
  const { user_email, role } = req.body || {};
  if (!user_email) return res.status(400).json({ error: 'user_email required' });
  const ref = await db.collection('apps').doc(req.params.appId).collection('invites').add({ email: user_email, role: role || 'member', createdAt: admin.firestore.FieldValue.serverTimestamp() });
  const doc = await ref.get();
  return res.json({ id: ref.id, ...doc.data() });
})));

// Auth stubs
app.post('/api/auth/login', wrap(async (req, res) => {
  const { email } = req.body || {};
  const fakeUser = { id: email ? email.replace(/[^a-zA-Z0-9]/g, '_') : 'anon', email };
  return res.json({ token: 'emulator-token', user: fakeUser });
}));

app.post('/api/auth/signup', wrap(async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  const ref = await db.collection('_global').doc('users').collection('items').add({ email, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  const doc = await ref.get();
  return res.json({ id: ref.id, email: doc.data().email });
}));

app.post('/api/auth/reset-password-request', wrap(async (req, res) => {
  return res.json({ ok: true });
}));

app.post('/api/auth/reset-password', wrap(async (req, res) => {
  return res.json({ ok: true });
}));

// Final fallback and error handler
app.all('/api/*', (req, res) => res.status(501).json({ error: 'Not implemented in functions emulator', path: req.originalUrl }));

app.use((err, req, res, next) => {
  console.error('Unhandled error in functions:', err && err.stack ? err.stack : err);
  res.status(500).json({ error: (err && err.message) || 'Internal error' });
});

exports.api = functions.https.onRequest(app);
