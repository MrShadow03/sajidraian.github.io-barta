const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// File upload configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    try {
      await fs.mkdir(dir, { recursive: true });
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Database paths
const DB_DIR = path.join(__dirname, 'database');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const MESSAGES_FILE = path.join(DB_DIR, 'messages.json');
const SESSIONS_FILE = path.join(DB_DIR, 'sessions.json');
const TYPING_FILE = path.join(DB_DIR, 'typing.json');
const CALLS_FILE = path.join(DB_DIR, 'calls.json');

// Initialize database
async function initDB() {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    
    try {
      await fs.access(USERS_FILE);
    } catch {
      await fs.writeFile(USERS_FILE, JSON.stringify([], null, 2));
    }
    
    try {
      await fs.access(MESSAGES_FILE);
    } catch {
      await fs.writeFile(MESSAGES_FILE, JSON.stringify([], null, 2));
    }
    
    try {
      await fs.access(SESSIONS_FILE);
    } catch {
      await fs.writeFile(SESSIONS_FILE, JSON.stringify([], null, 2));
    }
    
    try {
      await fs.access(TYPING_FILE);
    } catch {
      await fs.writeFile(TYPING_FILE, JSON.stringify([], null, 2));
    }
    
    try {
      await fs.access(CALLS_FILE);
    } catch {
      await fs.writeFile(CALLS_FILE, JSON.stringify([], null, 2));
    }
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

// Helper functions
async function readJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading JSON from ${filePath}:`, err.message);
    // Return empty array for corrupted files
    await fs.writeFile(filePath, JSON.stringify([], null, 2));
    return [];
  }
}

async function writeJSON(filePath, data) {
  try {
    // Validate data before writing
    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonString);
  } catch (err) {
    console.error(`Error writing JSON to ${filePath}:`, err.message);
    throw err;
  }
}

// Clean up inactive sessions (older than 10 minutes)
async function cleanupSessions() {
  const sessions = await readJSON(SESSIONS_FILE);
  const now = Date.now();
  const activeSessions = sessions.filter(s => (now - s.lastActive) < 10 * 60 * 1000);
  await writeJSON(SESSIONS_FILE, activeSessions);
  return activeSessions;
}

// Clean up old calls (older than 5 minutes)
async function cleanupCalls() {
  try {
    const calls = await readJSON(CALLS_FILE);
    const now = Date.now();
    const activeCalls = calls.filter(c => (now - c.timestamp) < 5 * 60 * 1000);
    
    if (activeCalls.length !== calls.length) {
      console.log(`Cleaned up ${calls.length - activeCalls.length} old calls`);
      await writeJSON(CALLS_FILE, activeCalls);
    }
    
    return activeCalls;
  } catch (err) {
    console.error('Error cleaning up calls:', err);
    return [];
  }
}

// API Routes

// Register new user
app.post('/api/register', upload.single('photo'), async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const users = await readJSON(USERS_FILE);
    
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const newUser = {
      id: Date.now().toString(),
      username,
      password, // In production, hash this!
      photo: req.file ? `/uploads/${req.file.filename}` : '/avater/luffy.jpg',
      registeredAt: new Date().toISOString()
    };
    
    users.push(newUser);
    await writeJSON(USERS_FILE, users);
    
    res.json({ success: true, user: { id: newUser.id, username: newUser.username, photo: newUser.photo } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await readJSON(USERS_FILE);
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create session
    const sessions = await readJSON(SESSIONS_FILE);
    const sessionId = Date.now().toString() + '-' + Math.random().toString(36);
    
    sessions.push({
      sessionId,
      userId: user.id,
      username: user.username,
      lastActive: Date.now()
    });
    
    await writeJSON(SESSIONS_FILE, sessions);
    
    res.json({ 
      success: true, 
      sessionId,
      user: { id: user.id, username: user.username, photo: user.photo } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post('/api/logout', async (req, res) => {
  try {
    const { sessionId } = req.body;
    let sessions = await readJSON(SESSIONS_FILE);
    sessions = sessions.filter(s => s.sessionId !== sessionId);
    await writeJSON(SESSIONS_FILE, sessions);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update session activity (heartbeat)
app.post('/api/heartbeat', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const sessions = await readJSON(SESSIONS_FILE);
    const session = sessions.find(s => s.sessionId === sessionId);
    
    if (session) {
      session.lastActive = Date.now();
      await writeJSON(SESSIONS_FILE, sessions);
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users with online status
app.get('/api/users', async (req, res) => {
  try {
    const users = await readJSON(USERS_FILE);
    const sessions = await cleanupSessions();
    const currentUserId = req.query.currentUserId;
    
    console.log(`[USERS] Request from user: ${currentUserId}, Total users: ${users.length}, Active sessions: ${sessions.length}`);
    
    const usersWithStatus = users
      .filter(u => u.id !== currentUserId)
      .map(u => ({
        id: u.id,
        username: u.username,
        photo: u.photo,
        online: sessions.some(s => s.userId === u.id)
      }));
    
    console.log(`[USERS] Returning ${usersWithStatus.length} users`);    res.json(usersWithStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send message
app.post('/api/messages', async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;
    
    if (!senderId || !receiverId || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const messages = await readJSON(MESSAGES_FILE);
    
    const newMessage = {
      id: Date.now().toString(),
      senderId,
      receiverId,
      text,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    messages.push(newMessage);
    await writeJSON(MESSAGES_FILE, messages);
    
    res.json({ success: true, message: newMessage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages between two users
app.get('/api/messages/:userId1/:userId2', async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    const lastMessageId = req.query.lastMessageId;
    
    const messages = await readJSON(MESSAGES_FILE);
    
    let conversation = messages.filter(m => 
      (m.senderId === userId1 && m.receiverId === userId2) ||
      (m.senderId === userId2 && m.receiverId === userId1)
    );
    
    // If lastMessageId provided, return only new messages
    if (lastMessageId) {
      const lastIndex = conversation.findIndex(m => m.id === lastMessageId);
      if (lastIndex !== -1) {
        conversation = conversation.slice(lastIndex + 1);
      }
    }
    
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark messages as read
app.post('/api/messages/read', async (req, res) => {
  try {
    const { userId, senderId } = req.body;
    const messages = await readJSON(MESSAGES_FILE);
    
    messages.forEach(m => {
      if (m.receiverId === userId && m.senderId === senderId) {
        m.read = true;
      }
    });
    
    await writeJSON(MESSAGES_FILE, messages);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set typing status
app.post('/api/typing', async (req, res) => {
  try {
    const { userId, receiverId, isTyping } = req.body;
    
    let typingStates = await readJSON(TYPING_FILE);
    
    // Remove old typing state for this user-receiver pair
    typingStates = typingStates.filter(t => 
      !(t.userId === userId && t.receiverId === receiverId)
    );
    
    // Add new typing state if user is typing
    if (isTyping) {
      typingStates.push({
        userId,
        receiverId,
        timestamp: Date.now()
      });
    }
    
    // Clean up old typing indicators (older than 5 seconds)
    const now = Date.now();
    typingStates = typingStates.filter(t => (now - t.timestamp) < 5000);
    
    await writeJSON(TYPING_FILE, typingStates);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check if user is typing
app.get('/api/typing/:userId/:receiverId', async (req, res) => {
  try {
    const { userId, receiverId } = req.params;
    
    let typingStates = await readJSON(TYPING_FILE);
    
    // Clean up old typing indicators
    const now = Date.now();
    typingStates = typingStates.filter(t => (now - t.timestamp) < 5000);
    await writeJSON(TYPING_FILE, typingStates);
    
    // Check if userId is typing to receiverId
    const isTyping = typingStates.some(t => 
      t.userId === userId && t.receiverId === receiverId
    );
    
    res.json({ isTyping });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WebRTC Call Signaling Endpoints

// Initiate a call (send offer)
app.post('/api/call/offer', async (req, res) => {
  try {
    const { callerId, receiverId, offer, callType } = req.body;
    
    console.log(`[CALL] New ${callType} call from ${callerId} to ${receiverId}`);
    
    if (!callerId || !receiverId || !offer || !callType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    let calls = await readJSON(CALLS_FILE);
    
    // Remove any existing calls between these users
    calls = calls.filter(c => 
      !((c.callerId === callerId && c.receiverId === receiverId) ||
        (c.callerId === receiverId && c.receiverId === callerId))
    );
    
    const newCall = {
      id: Date.now().toString(),
      callerId,
      receiverId,
      callType, // 'audio' or 'video'
      offer,
      answer: null,
      status: 'ringing', // ringing, active, ended
      iceCandidates: [],
      timestamp: Date.now()
    };
    
    calls.push(newCall);
    await writeJSON(CALLS_FILE, calls);
    
    res.json({ success: true, callId: newCall.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Answer a call
app.post('/api/call/answer', async (req, res) => {
  try {
    const { callId, answer } = req.body;
    
    console.log(`[CALL] Call answered: ${callId}`);
    
    if (!callId || !answer) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const calls = await readJSON(CALLS_FILE);
    const call = calls.find(c => c.id === callId);
    
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }
    
    call.answer = answer;
    call.status = 'active';
    
    await writeJSON(CALLS_FILE, calls);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add ICE candidate
app.post('/api/call/ice-candidate', async (req, res) => {
  try {
    const { callId, candidate, userId } = req.body;
    
    if (!callId || !candidate || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const calls = await readJSON(CALLS_FILE);
    const call = calls.find(c => c.id === callId);
    
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }
    
    call.iceCandidates.push({
      userId,
      candidate,
      timestamp: Date.now()
    });
    
    await writeJSON(CALLS_FILE, calls);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check for incoming calls
app.get('/api/call/check/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    let calls = await readJSON(CALLS_FILE);
    
    // Clean up old calls (older than 5 minutes)
    const now = Date.now();
    const originalLength = calls.length;
    calls = calls.filter(c => (now - c.timestamp) < 5 * 60 * 1000);
    
    if (originalLength !== calls.length) {
      await writeJSON(CALLS_FILE, calls);
    }
    
    // Find active calls for this user
    const incomingCall = calls.find(c => 
      c.receiverId === userId && c.status === 'ringing'
    );
    
    const activeCall = calls.find(c => 
      (c.callerId === userId || c.receiverId === userId) && c.status === 'active'
    );
    
    // Get new ICE candidates for active calls
    let newIceCandidates = [];
    if (activeCall) {
      const lastCheck = parseInt(req.query.lastCheck || '0');
      newIceCandidates = activeCall.iceCandidates.filter(ice => 
        ice.userId !== userId && ice.timestamp > lastCheck
      );
    }
    
    res.json({ 
      incomingCall: incomingCall || null,
      activeCall: activeCall || null,
      iceCandidates: newIceCandidates
    });
  } catch (err) {
    console.error('[CALL] Error checking calls:', err);
    res.status(500).json({ error: err.message });
  }
});

// End a call
app.post('/api/call/end', async (req, res) => {
  try {
    const { callId } = req.body;
    
    console.log(`[CALL] Call ended: ${callId}`);
    
    if (!callId) {
      return res.status(400).json({ error: 'Missing callId' });
    }
    
    let calls = await readJSON(CALLS_FILE);
    calls = calls.filter(c => c.id !== callId);
    await writeJSON(CALLS_FILE, calls);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject a call
app.post('/api/call/reject', async (req, res) => {
  try {
    const { callId } = req.body;
    
    if (!callId) {
      return res.status(400).json({ error: 'Missing callId' });
    }
    
    let calls = await readJSON(CALLS_FILE);
    calls = calls.filter(c => c.id !== callId);
    await writeJSON(CALLS_FILE, calls);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BARTA server running on port ${PORT}`);
  });
  
  // Periodic cleanup (every 2 minutes)
  setInterval(async () => {
    try {
      await cleanupCalls();
      await cleanupSessions();
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  }, 2 * 60 * 1000);
});
