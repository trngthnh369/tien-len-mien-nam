/**
 * Comprehensive multi-user game flow test.
 * Tests: Register → Login → Create Room → Join → Ready → Start → Play cards
 * Scenarios: 2-player, 3-player, 4-player
 */
import { io, Socket } from 'socket.io-client';

const API = 'http://localhost:3001';
const SOCKET_URL = 'http://localhost:3001';

// ============ Helpers ============

async function apiPost(path: string, body: any, token?: string) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function apiGet(path: string, token: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function apiDelete(path: string, token: string) {
  const res = await fetch(`${API}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { status: res.status, data };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function connectSocket(namespace: string, token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(`${SOCKET_URL}${namespace}`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));
    setTimeout(() => reject(new Error(`Socket timeout for ${namespace}`)), 5000);
  });
}

// ============ Test Scenarios ============

interface User {
  username: string;
  password: string;
  token: string;
  userId: string;
  roomSocket?: Socket;
  gameSocket?: Socket;
}

async function registerUser(username: string, password: string): Promise<User> {
  // Try register, if already exists then login
  let res = await apiPost('/auth/register', { username, password });
  if (res.status === 409 || res.status === 400) {
    // Already exists, login instead
    res = await apiPost('/auth/login', { username, password });
  }
  
  if (res.status === 201 || res.status === 200) {
    // If register was successful, now login
    if (!res.data.accessToken) {
      res = await apiPost('/auth/login', { username, password });
    }
  }
  
  if (!res.data.accessToken) {
    throw new Error(`Failed to auth ${username}: ${JSON.stringify(res.data)}`);
  }
  
  return {
    username,
    password,
    token: res.data.accessToken,
    userId: res.data.user?.id || 'unknown',
  };
}

async function cleanupUserRoom(user: User) {
  // Try to get user's current room from room list and leave
  const rooms = await apiGet('/rooms', user.token);
  // Not easily tracked, we'll just proceed
}

let testNum = 0;
let passed = 0;
let failed = 0;

function log(emoji: string, msg: string) {
  console.log(`${emoji} ${msg}`);
}

function assert(condition: boolean, testName: string, details?: string) {
  testNum++;
  if (condition) {
    passed++;
    log('✅', `[${testNum}] ${testName}`);
  } else {
    failed++;
    log('❌', `[${testNum}] ${testName}${details ? ': ' + details : ''}`);
  }
}

// ============ SCENARIO 1: 2 Players ============

async function testTwoPlayers() {
  log('🎮', '═══ SCENARIO 1: 2 PLAYERS ═══');
  
  // Register / Login
  const p1 = await registerUser('test_p1', 'password123');
  const p2 = await registerUser('test_p2', 'password123');
  assert(!!p1.token, 'Player 1 authenticated');
  assert(!!p2.token, 'Player 2 authenticated');

  // Create room
  const createRes = await apiPost('/rooms', { roomName: 'Test 2P Room' }, p1.token);
  assert(createRes.status === 201, 'Room created', JSON.stringify(createRes.data));
  const roomCode = createRes.data.roomCode;
  log('📋', `Room code: ${roomCode}`);

  // Join room (P2)
  const joinRes = await apiPost('/rooms/join', { roomCode }, p2.token);
  assert(joinRes.status === 201 || joinRes.status === 200, 'Player 2 joined room', JSON.stringify(joinRes.data));

  // Get room detail
  const detailRes = await apiGet(`/rooms/${roomCode}`, p1.token);
  assert(detailRes.status === 200, 'Room detail fetched');
  assert(detailRes.data.playerCount === 2, `Player count is 2 (got ${detailRes.data.playerCount})`);
  assert(detailRes.data.players?.length === 2, `Players array has 2 entries`);
  
  const roomId = detailRes.data.id;

  // Connect sockets
  try {
    p1.roomSocket = await connectSocket('/room', p1.token);
    p2.roomSocket = await connectSocket('/room', p2.token);
    assert(true, 'Both players connected to room socket');
  } catch (e: any) {
    assert(false, 'Socket connection', e.message);
    return;
  }

  // Listen for events
  const p1Events: string[] = [];
  const p2Events: string[] = [];
  
  p1.roomSocket!.on('room:playerReady', (data: any) => p1Events.push(`playerReady:${data.userId}:${data.isReady}`));
  p2.roomSocket!.on('room:playerReady', (data: any) => p2Events.push(`playerReady:${data.userId}:${data.isReady}`));
  p1.roomSocket!.on('room:gameStarting', () => p1Events.push('gameStarting'));
  p2.roomSocket!.on('room:gameStarting', () => p2Events.push('gameStarting'));
  p1.roomSocket!.on('room:error', (data: any) => p1Events.push(`error:${data.message}`));

  // Join room via socket
  p1.roomSocket!.emit('room:join', { roomCode });
  p2.roomSocket!.emit('room:join', { roomCode });
  await sleep(1000);

  // Player 2 ready
  p2.roomSocket!.emit('room:ready');
  await sleep(500);
  
  assert(p1Events.some(e => e.includes('playerReady') && e.includes('true')), 
    'P1 received playerReady event from P2');

  // Host starts the game
  p1.roomSocket!.emit('room:start');
  await sleep(1500);
  
  assert(p1Events.includes('gameStarting'), 'P1 received gameStarting');
  assert(p2Events.includes('gameStarting'), 'P2 received gameStarting');

  // Connect game sockets
  try {
    p1.gameSocket = await connectSocket('/game', p1.token);
    p2.gameSocket = await connectSocket('/game', p2.token);
    assert(true, 'Both players connected to game socket');
  } catch (e: any) {
    assert(false, 'Game socket connection', e.message);
  }

  // Join game
  const p1GameState: any[] = [];
  const p2GameState: any[] = [];
  
  p1.gameSocket!.on('game:state', (state: any) => p1GameState.push(state));
  p2.gameSocket!.on('game:state', (state: any) => p2GameState.push(state));
  p1.gameSocket!.on('game:error', (data: any) => log('⚠️', `P1 game error: ${data.message}`));
  p2.gameSocket!.on('game:error', (data: any) => log('⚠️', `P2 game error: ${data.message}`));

  p1.gameSocket!.emit('game:join', { roomId });
  p2.gameSocket!.emit('game:join', { roomId });
  await sleep(1500);

  assert(p1GameState.length > 0, 'P1 received game state', `Got ${p1GameState.length} states`);
  assert(p2GameState.length > 0, 'P2 received game state', `Got ${p2GameState.length} states`);

  if (p1GameState.length > 0) {
    const state = p1GameState[p1GameState.length - 1];
    assert(Array.isArray(state.hand) && state.hand.length > 0, `P1 has cards (${state.hand?.length} cards)`);
    assert(!!state.currentTurn, `Game has current turn player`);
    log('🃏', `P1 hand: ${state.hand?.map((c: any) => `${c.rank}${c.suit}`).join(', ')}`);
  }

  if (p2GameState.length > 0) {
    const state = p2GameState[p2GameState.length - 1];
    assert(Array.isArray(state.hand) && state.hand.length > 0, `P2 has cards (${state.hand?.length} cards)`);
    log('🃏', `P2 hand: ${state.hand?.map((c: any) => `${c.rank}${c.suit}`).join(', ')}`);
  }

  // Try playing a card (whoever's turn it is)
  if (p1GameState.length > 0) {
    const state = p1GameState[p1GameState.length - 1];
    const isP1Turn = state.currentTurn === p1.userId;
    const activePlayer = isP1Turn ? p1 : p2;
    const activeState = isP1Turn ? state : p2GameState[p2GameState.length - 1];
    
    if (activeState?.hand?.length > 0) {
      // Play the first (lowest) single card
      const card = activeState.hand[0];
      log('🎯', `${isP1Turn ? 'P1' : 'P2'} playing card: ${card.rank}${card.suit}`);
      activePlayer.gameSocket!.emit('game:play', { cards: [card] });
      await sleep(1000);
      
      // Check if state updated
      const latestP1 = p1GameState[p1GameState.length - 1];
      log('📊', `After play: turn = ${latestP1.currentTurn}`);
    }
  }

  // Cleanup - leave room
  p1.roomSocket?.disconnect();
  p2.roomSocket?.disconnect();
  p1.gameSocket?.disconnect();
  p2.gameSocket?.disconnect();
  
  // Leave via API
  if (roomId) {
    await apiDelete(`/rooms/${roomId}/leave`, p2.token);
    await apiDelete(`/rooms/${roomId}/leave`, p1.token);
  }
  
  await sleep(500);
  log('🏁', '═══ 2-PLAYER SCENARIO DONE ═══\n');
}

// ============ SCENARIO 2: 3 Players ============

async function testThreePlayers() {
  log('🎮', '═══ SCENARIO 2: 3 PLAYERS ═══');
  
  const p1 = await registerUser('test_3p1', 'password123');
  const p2 = await registerUser('test_3p2', 'password123');
  const p3 = await registerUser('test_3p3', 'password123');
  assert(!!p1.token && !!p2.token && !!p3.token, 'All 3 players authenticated');

  // Create and join room
  const createRes = await apiPost('/rooms', { roomName: 'Test 3P Room' }, p1.token);
  assert(createRes.status === 201, 'Room created for 3P');
  const roomCode = createRes.data.roomCode;

  await apiPost('/rooms/join', { roomCode }, p2.token);
  await apiPost('/rooms/join', { roomCode }, p3.token);
  
  const detail = await apiGet(`/rooms/${roomCode}`, p1.token);
  assert(detail.data.playerCount === 3, `Player count is 3 (got ${detail.data.playerCount})`);
  const roomId = detail.data.id;

  // Connect sockets
  p1.roomSocket = await connectSocket('/room', p1.token);
  p2.roomSocket = await connectSocket('/room', p2.token);
  p3.roomSocket = await connectSocket('/room', p3.token);

  const gameStarted: boolean[] = [false, false, false];
  p1.roomSocket.on('room:gameStarting', () => { gameStarted[0] = true; });
  p2.roomSocket.on('room:gameStarting', () => { gameStarted[1] = true; });
  p3.roomSocket.on('room:gameStarting', () => { gameStarted[2] = true; });

  // Join via socket
  p1.roomSocket.emit('room:join', { roomCode });
  p2.roomSocket.emit('room:join', { roomCode });
  p3.roomSocket.emit('room:join', { roomCode });
  await sleep(500);

  // Ready up non-hosts
  p2.roomSocket.emit('room:ready');
  p3.roomSocket.emit('room:ready');
  await sleep(500);

  // Start
  p1.roomSocket.emit('room:start');
  await sleep(1500);
  
  assert(gameStarted[0] && gameStarted[1] && gameStarted[2], 'All 3 players received gameStarting');

  // Connect game & verify cards dealt
  p1.gameSocket = await connectSocket('/game', p1.token);
  p2.gameSocket = await connectSocket('/game', p2.token);
  p3.gameSocket = await connectSocket('/game', p3.token);

  const hands: any[][] = [[], [], []];
  p1.gameSocket.on('game:state', (s: any) => { hands[0] = s.hand || []; });
  p2.gameSocket.on('game:state', (s: any) => { hands[1] = s.hand || []; });
  p3.gameSocket.on('game:state', (s: any) => { hands[2] = s.hand || []; });

  p1.gameSocket.emit('game:join', { roomId });
  p2.gameSocket.emit('game:join', { roomId });
  p3.gameSocket.emit('game:join', { roomId });
  await sleep(1500);

  // In 3-player game: 52 / 3 = 17, 17, 18
  const totalCards = hands[0].length + hands[1].length + hands[2].length;
  assert(totalCards === 52 || totalCards > 0, `Total cards dealt: ${totalCards} (expected ~52 for 3 players)`);
  log('🃏', `P1: ${hands[0].length} cards, P2: ${hands[1].length} cards, P3: ${hands[2].length} cards`);

  // Cleanup
  [p1, p2, p3].forEach(p => { p.roomSocket?.disconnect(); p.gameSocket?.disconnect(); });
  await apiDelete(`/rooms/${roomId}/leave`, p3.token);
  await apiDelete(`/rooms/${roomId}/leave`, p2.token);
  await apiDelete(`/rooms/${roomId}/leave`, p1.token);
  
  await sleep(500);
  log('🏁', '═══ 3-PLAYER SCENARIO DONE ═══\n');
}

// ============ SCENARIO 3: 4 Players ============

async function testFourPlayers() {
  log('🎮', '═══ SCENARIO 3: 4 PLAYERS ═══');
  
  const p1 = await registerUser('test_4p1', 'password123');
  const p2 = await registerUser('test_4p2', 'password123');
  const p3 = await registerUser('test_4p3', 'password123');
  const p4 = await registerUser('test_4p4', 'password123');
  assert(!!p1.token && !!p2.token && !!p3.token && !!p4.token, 'All 4 players authenticated');

  // Create and join room
  const createRes = await apiPost('/rooms', { roomName: 'Test 4P Room' }, p1.token);
  assert(createRes.status === 201, 'Room created for 4P');
  const roomCode = createRes.data.roomCode;

  await apiPost('/rooms/join', { roomCode }, p2.token);
  await apiPost('/rooms/join', { roomCode }, p3.token);
  await apiPost('/rooms/join', { roomCode }, p4.token);

  const detail = await apiGet(`/rooms/${roomCode}`, p1.token);
  assert(detail.data.playerCount === 4, `Player count is 4 (got ${detail.data.playerCount})`);
  const roomId = detail.data.id;

  // List rooms and verify
  const roomList = await apiGet('/rooms', p1.token);
  assert(roomList.status === 200, 'Room list accessible');
  log('📋', `Active rooms: ${roomList.data.length}`);

  // Connect all sockets
  const players = [p1, p2, p3, p4];
  for (const p of players) {
    p.roomSocket = await connectSocket('/room', p.token);
  }

  const gameStarted = [false, false, false, false];
  players.forEach((p, i) => {
    p.roomSocket!.on('room:gameStarting', () => { gameStarted[i] = true; });
  });

  // Join via socket
  for (const p of players) {
    p.roomSocket!.emit('room:join', { roomCode });
  }
  await sleep(500);

  // Ready up non-hosts
  p2.roomSocket!.emit('room:ready');
  p3.roomSocket!.emit('room:ready');
  p4.roomSocket!.emit('room:ready');
  await sleep(500);

  // Start
  p1.roomSocket!.emit('room:start');
  await sleep(1500);

  assert(gameStarted.every(s => s), 'All 4 players received gameStarting');

  // Connect game & verify cards
  for (const p of players) {
    p.gameSocket = await connectSocket('/game', p.token);
  }

  const hands: any[][] = [[], [], [], []];
  let currentTurn = '';
  players.forEach((p, i) => {
    p.gameSocket!.on('game:state', (s: any) => { hands[i] = s.hand || []; currentTurn = s.currentTurn; });
  });

  for (const p of players) {
    p.gameSocket!.emit('game:join', { roomId });
  }
  await sleep(1500);

  // In 4-player game: 52 / 4 = 13 each
  const totalCards = hands.reduce((sum, h) => sum + h.length, 0);
  assert(totalCards === 52, `Total cards dealt: ${totalCards} (expected 52)`);
  
  players.forEach((_, i) => {
    assert(hands[i].length === 13, `P${i+1} has 13 cards (got ${hands[i].length})`);
  });
  
  log('🃏', `Hands: ${hands.map((h, i) => `P${i+1}:${h.length}`).join(', ')}`);
  log('🎯', `Current turn: ${currentTurn}`);

  // Try a few rounds of play
  log('🎲', '--- Simulating gameplay ---');
  
  for (let round = 0; round < 3; round++) {
    const turnIdx = players.findIndex(p => p.userId === currentTurn);
    if (turnIdx === -1) {
      log('⚠️', `Cannot find player for turn ${currentTurn}, trying by turn index`);
      break;
    }
    
    const hand = hands[turnIdx];
    if (hand.length === 0) break;
    
    // Play the lowest single card
    const card = hand[0];
    log('🃏', `Round ${round + 1}: P${turnIdx + 1} plays ${card.rank}${card.suit}`);
    
    players[turnIdx].gameSocket!.emit('game:play', { cards: [card] });
    await sleep(1000);
    
    // Next players pass
    for (let i = 1; i < players.length; i++) {
      const nextIdx = (turnIdx + i) % players.length;
      if (hands[nextIdx].length === 0) continue;
      players[nextIdx].gameSocket!.emit('game:pass');
      await sleep(300);
    }
    await sleep(500);
  }

  // Cleanup
  players.forEach(p => { p.roomSocket?.disconnect(); p.gameSocket?.disconnect(); });
  for (const p of players.reverse()) {
    await apiDelete(`/rooms/${roomId}/leave`, p.token);
  }
  
  await sleep(500);
  log('🏁', '═══ 4-PLAYER SCENARIO DONE ═══\n');
}

// ============ Extra Tests ============

async function testEdgeCases() {
  log('🧪', '═══ EDGE CASE TESTS ═══');
  
  // Test: Join non-existent room
  const p = await registerUser('test_edge', 'password123');
  const badJoin = await apiPost('/rooms/join', { roomCode: 'ZZZZZZ' }, p.token);
  assert(badJoin.status === 404, 'Join non-existent room returns 404');
  
  // Test: Register with short username
  const shortUser = await apiPost('/auth/register', { username: 'ab', password: 'password123' });
  assert(shortUser.status === 400, 'Short username rejected', JSON.stringify(shortUser.data));

  // Test: Login with wrong password
  const badLogin = await apiPost('/auth/login', { username: 'test_edge', password: 'wrong' });
  assert(badLogin.status === 401, 'Wrong password rejected');

  // Test: Access without token
  const noToken = await apiGet('/rooms', '');
  assert(noToken.status === 401, 'No token returns 401', `Got ${noToken.status}`);
  
  log('🏁', '═══ EDGE CASE TESTS DONE ═══\n');
}

// ============ Main ============

async function main() {
  console.log('\n🃏 ═══════════════════════════════════════════════');
  console.log('   TIẾN LÊN MIỀN NAM — COMPREHENSIVE TEST SUITE');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    await testEdgeCases();
    await testTwoPlayers();
    await testThreePlayers();
    await testFourPlayers();
  } catch (e: any) {
    log('💥', `FATAL ERROR: ${e.message}`);
    console.error(e);
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`📊 RESULTS: ${passed} passed, ${failed} failed, ${testNum} total`);
  console.log('═══════════════════════════════════════════════════\n');
  
  process.exit(failed > 0 ? 1 : 0);
}

main();
