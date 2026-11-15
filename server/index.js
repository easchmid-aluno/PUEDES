'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { containsProfanity, censorText } = require('./utils/censor');

// ── Load word list ─────────────────────────────────────────────────────────────
const WORDS = require('./data/words.json');
const ALL_CATEGORIES = Object.keys(WORDS);

// ── Environment & Security Configuration ───────────────────────────────────────
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';
const ALLOWED_ORIGIN = process.env.CLIENT_URL || '*';

const app = express();
app.disable('x-powered-by');

// Security headers (helmet)
app.use(
  helmet({
    contentSecurityPolicy: false, // Vite bundled assets support
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: ALLOWED_ORIGIN || '*',
    methods: ['GET', 'POST'],
  })
);

app.use(express.json({ limit: '10kb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'PUEDES Game Server' });
});

// Serve frontend build in production / single-server mode
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/socket.io') || req.path.startsWith('/health')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), err => {
    if (err) next();
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// ── In-Memory State & Memory Protection (Anti-DoS) ────────────────────────────
const MAX_CONCURRENT_ROOMS = 500;
const rooms = {};

// Rate Limiting Store: socketId -> { [action]: lastTimestamp }
const rateLimits = new Map();

function checkRateLimit(socketId, action, minIntervalMs) {
  const now = Date.now();
  let userLimits = rateLimits.get(socketId);
  if (!userLimits) {
    userLimits = {};
    rateLimits.set(socketId, userLimits);
  }

  const lastTime = userLimits[action] || 0;
  if (now - lastTime < minIntervalMs) {
    return false;
  }

  userLimits[action] = now;
  return true;
}

// Garbage Collector: cleans inactive rooms every 5 minutes
setInterval(() => {
  const now = Date.now();
  const roomKeys = Object.keys(rooms);
  let changed = false;
  for (const code of roomKeys) {
    const room = rooms[code];
    const isInactive = now - (room.lastActivityAt || now) > 15 * 60 * 1000;
    const hasNoConnectedPlayers = room.players.every(p => !p.isConnected);

    if (isInactive || (hasNoConnectedPlayers && room.phase === 'lobby')) {
      clearRoomTimer(room);
      delete rooms[code];
      changed = true;
    }
  }
  if (changed) {
    broadcastPublicRooms();
  }
}, 5 * 60 * 1000);

// ── Sanitization & Helpers ────────────────────────────────────────────────────

function sanitizeText(str, maxLength = 100) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .trim()
    .slice(0, maxLength);
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  let attempts = 0;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    attempts++;
  } while (rooms[code] && attempts < 100);
  return code;
}

function normalizeWord(word) {
  if (!word) return '';
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * True cryptographic shuffle using crypto.randomInt
 */
function secureShuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Anti-spoiler hint validator:
 * - Minimum 2 characters
 * - Single word (no spaces or hyphens)
 * - Cannot be secret word
 * - Cannot be plural (+s, +es)
 * - Cannot contain compound parts or direct roots (only checked if length >= 3)
 * - Cannot be already used this round
 */
function isHintValid(hint, secretWord, usedHints) {
  const clean = sanitizeText(hint, 24);
  if (!clean || clean.length < 2) {
    return { valid: false, reason: 'A dica deve ter pelo menos 2 letras.' };
  }

  if (clean.includes(' ') || clean.includes('-')) {
    return { valid: false, reason: 'A dica deve ser estritamente uma única palavra.' };
  }

  if (containsProfanity(clean)) {
    return { valid: false, reason: 'A dica contém termos impróprios ou ofensivos.' };
  }

  const normHint = normalizeWord(clean);
  const normSecret = normalizeWord(secretWord);

  if (normHint === normSecret) {
    return { valid: false, reason: 'A dica não pode ser a própria palavra secreta.' };
  }

  if (normHint === normSecret + 's' || normHint === normSecret + 'es') {
    return { valid: false, reason: 'A dica não pode ser o plural da palavra secreta.' };
  }

  // Compound & Stem containment check (only for hints of 3+ letters to avoid blocking single characters)
  if (normSecret.length >= 4 && normHint.length >= 3) {
    const parts = secretWord.toLowerCase().split(/[\s-]+/).map(normalizeWord).filter(Boolean);
    for (const part of parts) {
      if (part.length >= 4) {
        if (normHint === part || normHint.includes(part) || (normHint.length >= 4 && part.includes(normHint))) {
          return { valid: false, reason: `A dica lembra muito a palavra secreta ou seu radical ("${part}").` };
        }
      }
    }

    const stemLen = Math.max(4, Math.floor(normSecret.length * 0.65));
    const stem = normSecret.slice(0, stemLen);
    if (normHint.includes(stem)) {
      return { valid: false, reason: 'A dica contém o radical da palavra secreta.' };
    }
  }

  // Already used this round across any player
  const alreadyUsed = usedHints.some(h => normalizeWord(h) === normHint);
  if (alreadyUsed) {
    return { valid: false, reason: 'Esta dica já foi utilizada nesta rodada.' };
  }

  return { valid: true, reason: '' };
}

function calcImpostorCount(playerCount, settingImpostors) {
  // Regra Estrita: Impostores devem ser estritamente minoria (< 50% dos jogadores)
  // 3 ou 4 jogadores = máximo 1 impostor
  // 5 ou 6 jogadores = máximo 2 impostores
  // 7+ jogadores = máximo 3 impostores
  const maxAllowed = Math.max(1, Math.floor((playerCount - 1) / 2));
  if (settingImpostors && settingImpostors !== 'auto') {
    const num = Number(settingImpostors);
    return Math.max(1, Math.min(num, maxAllowed));
  }
  if (playerCount <= 4) return 1;
  if (playerCount <= 8) return Math.min(2, maxAllowed);
  return Math.min(3, maxAllowed);
}

function randomPick(arr) {
  return arr[crypto.randomInt(0, arr.length)];
}

// ── Public Rooms Helper ───────────────────────────────────────────────────────

function getPublicRoomsList() {
  const publicRooms = [];
  for (const code of Object.keys(rooms)) {
    const room = rooms[code];
    if (room.settings.isPublic && room.phase === 'lobby' && room.players.length < 12) {
      const host = room.players.find(p => p.isHost) || room.players[0];
      publicRooms.push({
        roomCode: room.roomCode,
        playerCount: room.players.filter(p => p.isConnected).length,
        maxPlayers: 12,
        hostNickname: host ? host.nickname : 'Host',
        hostAvatar: host ? host.avatar : '🦊',
        rounds: room.settings.rounds,
      });
    }
  }
  return publicRooms;
}

function broadcastPublicRooms() {
  io.emit('public-rooms-list', getPublicRoomsList());
}

// ── Synchronized Timer Engine ─────────────────────────────────────────────────

function clearRoomTimer(room) {
  if (room._phaseTimeout) {
    clearTimeout(room._phaseTimeout);
    room._phaseTimeout = null;
  }
}

function schedulePhaseTimer(room, durationSeconds, onExpire) {
  clearRoomTimer(room);

  const now = Date.now();
  room.phaseEndsAt = now + durationSeconds * 1000;
  room.lastActivityAt = now;

  room._phaseTimeout = setTimeout(() => {
    room._phaseTimeout = null;
    if (typeof onExpire === 'function') {
      onExpire();
    }
  }, durationSeconds * 1000);

  broadcastGameState(room);
}

// ── Public Safe GameState Builder ──────────────────────────────────────────────
function buildGameState(room) {
  const now = Date.now();
  const connectedPlayers = room.players.filter(p => p.isConnected);
  const impostorCount = room.impostorCount || calcImpostorCount(connectedPlayers.length, room.settings.impostors);

  return {
    roomCode: room.roomCode,
    phase: room.phase,
    players: room.players.map(p => ({
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      score: p.score,
      isHost: p.isHost,
      isConnected: p.isConnected,
      hints: p.hints || ['', '', ''],
      votes: p.votes || [],
      hasSubmittedHint: !!p.hasSubmittedHint,
    })),
    settings: room.settings,
    impostorCount,
    currentRound: room.currentRound,
    totalRounds: room.settings.rounds,
    currentTurn: room.currentTurn, // 0, 1, 2
    currentPlayerIndex: room.currentPlayerIndex,
    turnOrder: room.turnOrder || [],
    phaseEndsAt: room.phaseEndsAt || 0,
    serverNow: now,
    chat: room.chat || [],
    roundResults: room.roundResults || undefined,
  };
}

function broadcastGameState(room) {
  room.lastActivityAt = Date.now();
  io.to(room.roomCode).emit('game-state', buildGameState(room));
}

// ── Game Lifecycle & Flow Engine (Exclusively Sequential & Non-Repeating Impostor)

function startRound(room) {
  clearRoomTimer(room);

  // 1. Pick category & word pair
  const activeCategories = (room.settings.categories && room.settings.categories.length > 0)
    ? room.settings.categories.filter(c => WORDS[c])
    : ALL_CATEGORIES;

  const category = randomPick(activeCategories.length > 0 ? activeCategories : ALL_CATEGORIES);
  const pair = randomPick(WORDS[category]); // [wordA, wordB]

  room.roundCategory = category;
  room.wordPair = pair;
  room.roundResults = null;

  // 2. Select impostor(s) avoiding repeating consecutive impostors
  const connectedPlayers = room.players.filter(p => p.isConnected);
  const impostorCount = calcImpostorCount(connectedPlayers.length, room.settings.impostors);
  room.impostorCount = impostorCount;

  // Filter out previous round's impostor if we have enough players to alternate
  let eligiblePlayers = connectedPlayers;
  if (room.lastImpostorIds && room.lastImpostorIds.length > 0 && connectedPlayers.length > impostorCount + 1) {
    const nonPrevious = connectedPlayers.filter(p => !room.lastImpostorIds.includes(p.id));
    if (nonPrevious.length >= impostorCount) {
      eligiblePlayers = nonPrevious;
    }
  }

  const shuffledCandidates = secureShuffle(eligiblePlayers.map(p => p.id));
  const impostorIds = new Set(shuffledCandidates.slice(0, impostorCount));
  room.impostorIds = Array.from(impostorIds);
  room.lastImpostorIds = room.impostorIds;

  // 3. Assign secret words & reset per-round player state
  room.players.forEach(p => {
    p.isImpostor = impostorIds.has(p.id);
    p.secretWord = p.isImpostor ? pair[1] : pair[0];
    p.hints = ['', '', ''];
    p.votes = [];
    p.hasSubmittedHint = false;

    // Send secret word individually (Server-Authoritative)
    io.to(p.id).emit('your-word', {
      word: p.secretWord,
      category,
      round: room.currentRound,
      totalRounds: room.settings.rounds,
    });
  });

  // 4. Generate random sequential turn order for this round
  room.turnOrder = secureShuffle(connectedPlayers.map(p => p.id));

  room.phase = 'hint-phase';
  room.currentTurn = 0; // Turn 0: Dica 1/3
  room.currentPlayerIndex = 0;

  startSequentialPlayerTurn(room);
}

function startSequentialPlayerTurn(room) {
  // Check if current turn sequence finished
  if (room.currentPlayerIndex >= room.turnOrder.length) {
    advanceHintTurnOrDiscussion(room);
    return;
  }

  const curSpeakerId = room.turnOrder[room.currentPlayerIndex];
  const curPlayer = room.players.find(p => p.id === curSpeakerId);

  // If player disconnected or not found, auto-skip immediately
  if (!curPlayer || !curPlayer.isConnected) {
    if (curPlayer) {
      curPlayer.hints[room.currentTurn] = '(sem dica)';
      curPlayer.hasSubmittedHint = true;
    }
    room.currentPlayerIndex++;
    startSequentialPlayerTurn(room);
    return;
  }

  curPlayer.hasSubmittedHint = false;

  const duration = room.settings.hintTime || 30;
  schedulePhaseTimer(room, duration, () => {
    // Timeout: auto-fill "(sem dica)" and move to next player in sequence
    if (!curPlayer.hasSubmittedHint || !curPlayer.hints[room.currentTurn]) {
      curPlayer.hints[room.currentTurn] = '(sem dica)';
      curPlayer.hasSubmittedHint = true;
    }
    room.currentPlayerIndex++;
    startSequentialPlayerTurn(room);
  });
}

function advanceHintTurnOrDiscussion(room) {
  clearRoomTimer(room);

  // Mandatory 3 turns (0 -> 1 -> 2)
  if (room.currentTurn < 2) {
    room.currentTurn++;
    room.currentPlayerIndex = 0;
    // Keep sequential speaking flow
    startSequentialPlayerTurn(room);
  } else {
    // All 3 hint turns completed! Move to discussion & voting
    startDiscussionPhase(room);
  }
}

function startDiscussionPhase(room) {
  clearRoomTimer(room);
  room.phase = 'discussion';

  room.players.forEach(p => {
    p.votes = [];
  });

  const discussDuration = room.settings.discussTime || 90;
  schedulePhaseTimer(room, discussDuration, () => {
    endDiscussionAndScore(room);
  });
}

function endDiscussionAndScore(room) {
  clearRoomTimer(room);
  room.phase = 'results';

  const impostorIdSet = new Set(room.impostorIds);
  const scoreGained = {};
  room.players.forEach(p => {
    scoreGained[p.id] = 0;
  });

  // Civilians score: +1 for each real impostor voted for
  room.players.forEach(p => {
    if (!p.isImpostor) {
      let pts = 0;
      (p.votes || []).forEach(votedId => {
        if (impostorIdSet.has(votedId)) {
          pts += 1;
        }
      });
      scoreGained[p.id] = pts;
      p.score += pts;
    }
  });

  // Impostor score: +1 for each civilian who did NOT vote for them
  const civilians = room.players.filter(p => !p.isImpostor);
  room.players.forEach(p => {
    if (p.isImpostor) {
      let pts = 0;
      civilians.forEach(civ => {
        const civVotes = civ.votes || [];
        if (!civVotes.includes(p.id)) {
          pts += 1;
        }
      });
      scoreGained[p.id] = pts;
      p.score += pts;
    }
  });

  const isGameOver = room.currentRound >= room.settings.rounds;

  room.roundResults = {
    impostorIds: room.impostorIds,
    civilianIds: room.players.filter(p => !p.isImpostor).map(p => p.id),
    wordA: room.wordPair[0],
    wordB: room.wordPair[1],
    category: room.roundCategory,
    scoreGained,
    isGameOver,
  };

  // 10-second countdown in Results Phase before next round or game-over
  schedulePhaseTimer(room, 10, () => {
    if (isGameOver) {
      room.phase = 'game-over';
      broadcastGameState(room);
    } else {
      room.currentRound++;
      startRound(room);
    }
  });
}

// ── Socket.IO Connection & Event Handlers ───────────────────────────────────────

io.on('connection', socket => {
  // Send current public rooms list on connect
  socket.emit('public-rooms-list', getPublicRoomsList());

  socket.on('get-public-rooms', () => {
    socket.emit('public-rooms-list', getPublicRoomsList());
  });

  // CREATE ROOM
  socket.on('create-room', ({ nickname, avatar, settings }) => {
    if (!checkRateLimit(socket.id, 'create-room', 1500)) {
      return socket.emit('join-error', { message: 'Aguarde um instante antes de criar outra sala.' });
    }

    if (Object.keys(rooms).length >= MAX_CONCURRENT_ROOMS) {
      return socket.emit('join-error', { message: 'Limite de salas ativas atingido. Tente novamente mais tarde.' });
    }

    const cleanNick = sanitizeText(nickname, 16);
    if (!cleanNick || cleanNick.length < 2) {
      return socket.emit('join-error', { message: 'Nickname deve ter entre 2 e 16 caracteres.' });
    }

    if (containsProfanity(cleanNick)) {
      return socket.emit('join-error', { message: 'Nickname contém termos impróprios ou ofensivos.' });
    }

    const roomCode = generateRoomCode();
    socket.data.roomCode = roomCode;
    socket.join(roomCode);

    const room = {
      roomCode,
      phase: 'lobby',
      currentRound: 1,
      currentTurn: 0,
      currentPlayerIndex: 0,
      turnOrder: [],
      phaseEndsAt: 0,
      lastActivityAt: Date.now(),
      lastImpostorIds: [],
      roundResults: null,
      settings: {
        rounds: 5,
        impostors: 'auto',
        hintTime: 30,
        discussTime: 90,
        categories: ALL_CATEGORIES,
        isPublic: settings && typeof settings.isPublic === 'boolean' ? settings.isPublic : true,
        ...(settings || {}),
      },
      players: [
        {
          id: socket.id,
          nickname: cleanNick,
          avatar: sanitizeText(avatar, 8) || '🦊',
          score: 0,
          isHost: true,
          isConnected: true,
          hints: ['', '', ''],
          votes: [],
          hasSubmittedHint: false,
        },
      ],
      chat: [],
      _phaseTimeout: null,
    };

    rooms[roomCode] = room;

    socket.emit('room-created', {
      roomCode,
      playerId: socket.id,
      gameState: buildGameState(room),
    });

    if (room.settings.isPublic) {
      broadcastPublicRooms();
    }
  });

  // JOIN ROOM
  socket.on('join-room', ({ roomCode, nickname, avatar }) => {
    if (!checkRateLimit(socket.id, 'join-room', 500)) {
      return socket.emit('join-error', { message: 'Aguarde um instante antes de tentar novamente.' });
    }

    const code = sanitizeText(roomCode, 8).toUpperCase();
    if (!/^[A-Z0-9]{4,8}$/.test(code)) {
      return socket.emit('join-error', { message: 'Código de sala inválido.' });
    }

    const room = rooms[code];

    if (!room) {
      return socket.emit('join-error', { message: 'Sala não encontrada. Verifique o código.' });
    }

    if (room.phase !== 'lobby') {
      return socket.emit('join-error', { message: 'Esta partida já foi iniciada.' });
    }

    if (room.players.length >= 12) {
      return socket.emit('join-error', { message: 'Esta sala já atingiu o limite de 12 jogadores.' });
    }

    const cleanNick = sanitizeText(nickname, 16);
    if (!cleanNick || cleanNick.length < 2) {
      return socket.emit('join-error', { message: 'Nickname deve ter entre 2 e 16 caracteres.' });
    }

    if (containsProfanity(cleanNick)) {
      return socket.emit('join-error', { message: 'Nickname contém termos impróprios ou ofensivos.' });
    }

    if (room.players.some(p => p.nickname.toLowerCase() === cleanNick.toLowerCase())) {
      return socket.emit('join-error', { message: 'Este nickname já está em uso na sala.' });
    }

    socket.data.roomCode = code;
    socket.join(code);

    const newPlayer = {
      id: socket.id,
      nickname: cleanNick,
      avatar: sanitizeText(avatar, 8) || '🦊',
      score: 0,
      isHost: false,
      isConnected: true,
      hints: ['', '', ''],
      votes: [],
      hasSubmittedHint: false,
    };

    room.players.push(newPlayer);

    socket.emit('room-joined', {
      playerId: socket.id,
      gameState: buildGameState(room),
    });

    broadcastGameState(room);
    if (room.settings.isPublic) {
      broadcastPublicRooms();
    }
  });

  // UPDATE SETTINGS (Host only)
  socket.on('update-settings', newSettings => {
    if (!checkRateLimit(socket.id, 'update-settings', 200)) return;

    const roomCode = socket.data.roomCode;
    const room = rooms[roomCode];
    if (!room || room.phase !== 'lobby') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) return;

    if (newSettings && typeof newSettings === 'object') {
      const prevPublic = room.settings.isPublic;

      // Validação estrita de impostores com base na quantidade atual de jogadores
      const maxAllowed = Math.max(1, Math.floor((room.players.length - 1) / 2));
      let validatedImpostors = room.settings.impostors;
      if (['auto', 1, 2, 3].includes(newSettings.impostors)) {
        if (newSettings.impostors === 'auto') {
          validatedImpostors = 'auto';
        } else {
          validatedImpostors = Math.min(Number(newSettings.impostors), maxAllowed);
        }
      }

      room.settings = {
        ...room.settings,
        rounds: [3, 5, 7, 10].includes(Number(newSettings.rounds)) ? Number(newSettings.rounds) : room.settings.rounds,
        impostors: validatedImpostors,
        hintTime: [15, 20, 30, 45].includes(Number(newSettings.hintTime)) ? Number(newSettings.hintTime) : room.settings.hintTime,
        discussTime: [60, 90, 120, 180].includes(Number(newSettings.discussTime)) ? Number(newSettings.discussTime) : room.settings.discussTime,
        categories: Array.isArray(newSettings.categories) && newSettings.categories.length > 0 ? newSettings.categories : room.settings.categories,
        isPublic: typeof newSettings.isPublic === 'boolean' ? newSettings.isPublic : room.settings.isPublic,
      };

      if (prevPublic !== room.settings.isPublic) {
        broadcastPublicRooms();
      }
    }

    broadcastGameState(room);
  });

  // START GAME (Host only)
  socket.on('start-game', () => {
    const roomCode = socket.data.roomCode;
    const room = rooms[roomCode];
    if (!room || room.phase !== 'lobby') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) return;

    if (room.players.length < 3) {
      return socket.emit('join-error', { message: 'São necessários pelo menos 3 jogadores para iniciar.' });
    }

    room.currentRound = 1;
    startRound(room);
    broadcastPublicRooms(); // room leaves lobby
  });

  // SUBMIT HINT (Sequential Mode with explicit error event and ack callback)
  socket.on('submit-hint', ({ hint }, callback) => {
    if (!checkRateLimit(socket.id, 'submit-hint', 300)) {
      const err = { message: 'Envio muito rápido. Aguarde um instante.' };
      socket.emit('hint-error', err);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
      return;
    }

    const roomCode = socket.data.roomCode;
    const room = rooms[roomCode];
    if (!room || room.phase !== 'hint-phase') {
      const err = { message: 'Não estamos na fase de dicas.' };
      socket.emit('hint-error', err);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
      return;
    }

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    // Check if it's currently this player's turn in the sequential turnOrder
    const curSpeakerId = room.turnOrder[room.currentPlayerIndex];
    if (curSpeakerId !== socket.id) {
      const err = { message: 'Não é a sua vez de dar a dica!' };
      socket.emit('hint-error', err);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
      return;
    }

    if (player.hasSubmittedHint) {
      const err = { message: 'Você já enviou sua dica neste turno!' };
      socket.emit('hint-error', err);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
      return;
    }

    // Collect all hints used this round
    const usedHints = room.players
      .flatMap(p => p.hints || [])
      .filter(h => h && h !== '(sem dica)');

    const validation = isHintValid(hint, player.secretWord, usedHints);
    if (!validation.valid) {
      socket.emit('hint-error', { message: validation.reason });
      if (typeof callback === 'function') callback({ success: false, error: validation.reason });
      return;
    }

    // Valid hint accepted!
    const cleanHint = sanitizeText(hint, 24);
    player.hints[room.currentTurn] = cleanHint;
    player.hasSubmittedHint = true;

    if (typeof callback === 'function') callback({ success: true });

    // Advance to next player in sequence
    clearRoomTimer(room);
    room.currentPlayerIndex++;
    startSequentialPlayerTurn(room);
  });

  // SEND CHAT MESSAGE
  socket.on('send-message', ({ text }) => {
    if (!checkRateLimit(socket.id, 'send-message', 500)) return;

    const roomCode = socket.data.roomCode;
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const clean = sanitizeText(text, 140);
    if (!clean) return;

    // Filtro e Censura de Palavrões / Termos Preconceituosos
    const censored = censorText(clean);

    const msg = {
      id: uuidv4(),
      playerId: player.id,
      nickname: player.nickname,
      avatar: player.avatar,
      text: censored,
      timestamp: Date.now(),
    };

    room.chat.push(msg);
    if (room.chat.length > 100) room.chat.shift();

    broadcastGameState(room);
  });

  // SUBMIT VOTE
  socket.on('submit-vote', ({ targetId, action }) => {
    if (!checkRateLimit(socket.id, 'submit-vote', 200)) return;

    const roomCode = socket.data.roomCode;
    const room = rooms[roomCode];
    if (!room || room.phase !== 'discussion') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    if (targetId === player.id) {
      return socket.emit('join-error', { message: 'Você não pode votar em si mesmo!' });
    }

    player.votes = player.votes || [];

    const connected = room.players.filter(p => p.isConnected);
    const maxVotes = calcImpostorCount(connected.length, room.settings.impostors);

    if (action === 'unvote') {
      player.votes = player.votes.filter(id => id !== targetId);
    } else {
      if (player.votes.length >= maxVotes) {
        return socket.emit('join-error', { message: `Você só pode votar em até ${maxVotes} suspeito(s).` });
      }
      if (!player.votes.includes(targetId)) {
        player.votes.push(targetId);
      }
    }

    broadcastGameState(room);

    // If all connected players used all their votes, advance immediately
    const everyoneFinishedVoting = connected.every(p => (p.votes || []).length === maxVotes);
    if (everyoneFinishedVoting) {
      endDiscussionAndScore(room);
    }
  });

  // PLAY AGAIN (Host only - starts new game with same settings)
  socket.on('play-again', () => {
    const roomCode = socket.data.roomCode;
    const room = rooms[roomCode];
    if (!room || room.phase !== 'game-over') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) return;

    clearRoomTimer(room);
    room.currentRound = 1;
    room.players.forEach(p => {
      p.score = 0;
      p.hints = ['', '', ''];
      p.votes = [];
      p.hasSubmittedHint = false;
    });

    startRound(room);
  });

  // RETURN TO LOBBY (Host only - returns all players to lobby to change settings)
  socket.on('return-to-lobby', () => {
    const roomCode = socket.data.roomCode;
    const room = rooms[roomCode];
    if (!room || room.phase !== 'game-over') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) return;

    clearRoomTimer(room);
    room.phase = 'lobby';
    room.currentRound = 1;
    room.currentTurn = 0;
    room.roundResults = null;
    room.players.forEach(p => {
      p.score = 0;
      p.hints = ['', '', ''];
      p.votes = [];
      p.hasSubmittedHint = false;
    });

    broadcastGameState(room);
    if (room.settings.isPublic) {
      broadcastPublicRooms();
    }
  });

  // LEAVE ROOM (Sair da Sala com resposta explícita e limpeza imediata)
  socket.on('leave-room', () => {
    handlePlayerLeaving(socket, true);
  });

  // DISCONNECT
  socket.on('disconnect', () => {
    rateLimits.delete(socket.id);
    handlePlayerLeaving(socket, false);
  });
});

function handlePlayerLeaving(socket, isExplicit = false) {
  const roomCode = socket.data.roomCode;

  // Desconecta o socket do canal da sala IMEDIATAMENTE para não receber broadcasts subsequentes
  try {
    if (roomCode) {
      socket.leave(roomCode);
    }
  } catch (_) {}
  delete socket.data.roomCode;

  if (isExplicit) {
    socket.emit('left-room-success');
  }

  if (!roomCode || !rooms[roomCode]) return;

  const room = rooms[roomCode];
  const playerIdx = room.players.findIndex(p => p.id === socket.id);
  if (playerIdx === -1) return;

  const leavingPlayer = room.players[playerIdx];

  if (room.phase === 'lobby') {
    // Remove o jogador completamente do lobby
    room.players.splice(playerIdx, 1);
    if (room.players.length === 0) {
      clearRoomTimer(room);
      delete rooms[roomCode];
      broadcastPublicRooms();
      return;
    }
    if (leavingPlayer.isHost && room.players.length > 0) {
      room.players[0].isHost = true;
    }
    broadcastPublicRooms();
  } else {
    // Em jogo: marca como desconectado
    leavingPlayer.isConnected = false;
    const connectedPlayers = room.players.filter(p => p.isConnected);
    if (connectedPlayers.length === 0) {
      clearRoomTimer(room);
      delete rooms[roomCode];
      broadcastPublicRooms();
      return;
    }
    if (leavingPlayer.isHost) {
      const nextHost = connectedPlayers[0];
      if (nextHost) nextHost.isHost = true;
    }

    // Se era a vez desse jogador falar na rodada sequencial, pula imediatamente
    if (room.phase === 'hint-phase' && room.turnOrder && room.turnOrder[room.currentPlayerIndex] === socket.id) {
      clearRoomTimer(room);
      leavingPlayer.hints[room.currentTurn] = '(saiu)';
      leavingPlayer.hasSubmittedHint = true;
      room.currentPlayerIndex++;
      startSequentialPlayerTurn(room);
      return;
    }

    // Se estava na votação, checa se os jogadores restantes completaram seus votos
    if (room.phase === 'discussion') {
      const maxVotes = calcImpostorCount(connectedPlayers.length, room.settings.impostors);
      const allDone = connectedPlayers.every(p => (p.votes || []).length === maxVotes);
      if (allDone) {
        endDiscussionAndScore(room);
        return;
      }
    }
  }

  broadcastGameState(room);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`PUEDES Game Server running on port ${PORT}`);
});
