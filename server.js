const express = require('express');
const cors = require('cors');
const path = require('path');
const { customAlphabet } = require('nanoid');
// Test
const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store for rooms: { code: { players: [], createdAt, stage, prompts, submissions, votes, results } }
const rooms = new Map();

// 6-digit numeric code generator
const nano = customAlphabet('0123456789', 6);

function generateUniqueCode() {
  // Try until we find a non-colliding code (very low probability of collision)
  for (let i = 0; i < 10; i++) {
    const code = nano();
    if (!rooms.has(code)) return code;
  }
  // Fallback: linear probe
  let code;
  do {
    code = nano();
  } while (rooms.has(code));
  return code;
}

app.post('/api/create', (req, res) => {
  const { name, avatar } = req.body || {};
  const code = generateUniqueCode();
  const hostPlayer = { id: Date.now() + Math.random(), name: name || 'Host', avatar: avatar || '🧑' };
  rooms.set(code, { players: [hostPlayer], hostId: hostPlayer.id, createdAt: Date.now(), stage: 'lobby', prompts: [], submissions: {}, votes: {}, results: {} });
  res.json({ code, host: hostPlayer });
});

app.post('/api/join', (req, res) => {
  const { code, name, avatar } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Missing code' });
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const playerName = name || 'Anon';
  const player = { id: Date.now() + Math.random(), name: playerName, avatar: avatar || '🙂' };
  room.players.push(player);
  res.json({ success: true, players: room.players, stage: room.stage, player });
});

// Start a round: host provides prompts (array of strings)
app.post('/api/start', (req, res) => {
  const { code, prompts, requesterId } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Missing code' });
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  // Only host may start the round
  if (room.hostId && requesterId && room.hostId !== requesterId) return res.status(403).json({ error: 'Only the host may start the round' });
  // enforce minimum players
  const MIN_PLAYERS = 3;
  if ((room.players || []).length < MIN_PLAYERS) return res.status(400).json({ error: 'Not enough players to start (min ' + MIN_PLAYERS + ')' });
  room.stage = 'submission';
  room.prompts = Array.isArray(prompts) ? prompts : [];
  room.submissions = {}; // { promptIndex: [ { playerId, text } ] }
  room.votes = {}; // { promptIndex: { submissionIndex: voteCount } }
  room.results = {};
  res.json({ success: true, stage: room.stage });
});

// Submit an answer for a prompt
app.post('/api/submit', (req, res) => {
  const { code, playerId, promptIndex, text } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Missing code' });
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.stage !== 'submission') return res.status(400).json({ error: 'Not accepting submissions' });
  room.submissions[promptIndex] = room.submissions[promptIndex] || [];
  room.submissions[promptIndex].push({ playerId, text });
  res.json({ success: true });
});

// Move to voting
app.post('/api/startVoting', (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Missing code' });
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  room.stage = 'voting';
  // prepare vote counts
  room.votes = {};
  Object.keys(room.submissions).forEach(k => {
    room.votes[k] = room.submissions[k].map(() => 0);
  });
  res.json({ success: true, stage: room.stage });
});

// Submit a vote (promptIndex, submissionIndex)
app.post('/api/vote', (req, res) => {
  const { code, voterId, promptIndex, submissionIndex } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Missing code' });
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.stage !== 'voting') return res.status(400).json({ error: 'Not accepting votes' });
  room.votes[promptIndex][submissionIndex] += 1;
  res.json({ success: true });
});

// Finish voting and compute results
app.post('/api/finish', (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Missing code' });
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  room.stage = 'results';
  // compute winners per prompt
  room.results = {};
  Object.keys(room.votes).forEach(k => {
    const counts = room.votes[k];
    const max = Math.max(...counts);
    room.results[k] = { winnerIndex: counts.indexOf(max), counts };
  });
  res.json({ success: true, stage: room.stage, results: room.results });
});

// Get room state (polling)
app.get('/api/state/:code', (req, res) => {
  const room = rooms.get(req.params.code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({ code: req.params.code, stage: room.stage, hostId: room.hostId, players: room.players, prompts: room.prompts, submissions: room.submissions, votes: room.votes, results: room.results });
});

app.get('/api/rooms/:code', (req, res) => {
  const room = rooms.get(req.params.code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({ code: req.params.code, players: room.players });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
