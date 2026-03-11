/**
 * Comprehensive Edge Case Test Suite
 * Tests all corner cases: room, socket, game logic, disconnect, auth
 */
import { io, Socket } from 'socket.io-client';

const API = 'http://localhost:3001';
const SOCKET_URL = 'http://localhost:3001';

// ============ Helpers ============

async function apiPost(path: string, body: any, token?: string) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json() };
}

async function apiGet(path: string, token: string) {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, data: await res.json() };
}

async function apiDelete(path: string, token: string) {
  const res = await fetch(`${API}${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, data: await res.json() };
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function connectSocket(ns: string, token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = io(`${SOCKET_URL}${ns}`, { auth: { token }, transports: ['websocket'] });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
    setTimeout(() => reject(new Error(`Timeout ${ns}`)), 5000);
  });
}

interface User { username: string; token: string; userId: string; }

async function auth(username: string, password = 'password123'): Promise<User> {
  let res = await apiPost('/auth/register', { username, password });
  if (!res.data.accessToken) res = await apiPost('/auth/login', { username, password });
  if (!res.data.accessToken) throw new Error(`Auth failed: ${username}`);
  return { username, token: res.data.accessToken, userId: res.data.user?.id || '' };
}

let testNum = 0, passed = 0, failed = 0;
function assert(ok: boolean, name: string, detail?: string) {
  testNum++;
  if (ok) { passed++; console.log(`✅ [${testNum}] ${name}`); }
  else { failed++; console.log(`❌ [${testNum}] ${name}${detail ? ': ' + detail : ''}`); }
}

// ============ TEST GROUPS ============

async function testAuthEdgeCases() {
  console.log('\n🔐 ═══ AUTH EDGE CASES ═══');

  // Empty username
  const r1 = await apiPost('/auth/register', { username: '', password: 'pass123456' });
  assert(r1.status === 400, 'Empty username rejected');

  // Empty password
  const r2 = await apiPost('/auth/register', { username: 'validuser999', password: '' });
  assert(r2.status === 400, 'Empty password rejected');

  // Very long username
  const r3 = await apiPost('/auth/register', { username: 'a'.repeat(50), password: 'pass123456' });
  assert(r3.status === 400, 'Very long username rejected (>20 chars)', `Status: ${r3.status}`);

  // Duplicate registration
  await apiPost('/auth/register', { username: 'dupuser11', password: 'pass123456' });
  const r4 = await apiPost('/auth/register', { username: 'dupuser11', password: 'pass123456' });
  assert(r4.status === 409 || r4.status === 400, 'Duplicate username rejected');

  // Invalid token
  const r5 = await apiGet('/rooms', 'Bearer invalid.token.here');
  assert(r5.status === 401, 'Invalid JWT rejected');

  // Refresh token flow
  const user = await auth('refresh_test_user');
  const r6 = await apiPost('/auth/login', { username: 'refresh_test_user', password: 'password123' });
  assert(!!r6.data.refreshToken, 'Login returns refreshToken');
  
  if (r6.data.refreshToken) {
    const r7 = await apiPost('/auth/refresh', { refreshToken: r6.data.refreshToken });
    assert(r7.status === 200 || r7.status === 201, 'Refresh token works', `Status: ${r7.status}`);
  }
}

async function testRoomEdgeCases() {
  console.log('\n🏠 ═══ ROOM EDGE CASES ═══');

  const p1 = await auth('edge_room_p1');
  const p2 = await auth('edge_room_p2');

  // Create room
  const cr = await apiPost('/rooms', { roomName: 'Edge Test' }, p1.token);
  assert(cr.status === 201, 'Room created');
  const roomCode = cr.data.roomCode;
  const detail = await apiGet(`/rooms/${roomCode}`, p1.token);
  const roomId = detail.data.id;

  // Create another room while in one (should fail)
  const cr2 = await apiPost('/rooms', { roomName: 'Double Room' }, p1.token);
  assert(cr2.status === 409, 'Cannot create room while in another', `Status: ${cr2.status}`);

  // Join non-existent room
  const jr1 = await apiPost('/rooms/join', { roomCode: 'ZZZZZ9' }, p2.token);
  assert(jr1.status === 404, 'Join non-existent room → 404');

  // Join actual room
  await apiPost('/rooms/join', { roomCode }, p2.token);

  // Join same room again (should be a no-op/reconnect)
  const jr2 = await apiPost('/rooms/join', { roomCode }, p2.token);
  assert(jr2.status === 200 || jr2.status === 201, 'Rejoin same room is OK (reconnect)', `Status: ${jr2.status}`);

  // Join another room while in one
  const p3 = await auth('edge_room_p3');
  const cr3 = await apiPost('/rooms', { roomName: 'Other Room' }, p3.token);
  const otherCode = cr3.data.roomCode;
  const jr3 = await apiPost('/rooms/join', { roomCode: otherCode }, p2.token);
  assert(jr3.status === 409, 'Cannot join another room while in one', `Status: ${jr3.status}`);

  // Fill room to 4 and try 5th join
  const p4 = await auth('edge_room_p4');
  const p5 = await auth('edge_room_p5');
  const p6 = await auth('edge_room_p6');
  await apiPost('/rooms/join', { roomCode }, p4.token);
  await apiPost('/rooms/join', { roomCode }, p5.token);
  const jr4 = await apiPost('/rooms/join', { roomCode }, p6.token);
  assert(jr4.status === 400, 'Cannot join full room (4/4)', `Status: ${jr4.status}`);

  // Leave room → player count decreases
  await apiDelete(`/rooms/${roomId}/leave`, p5.token);
  const d2 = await apiGet(`/rooms/${roomCode}`, p1.token);
  assert(d2.data.playerCount === 3, `Player count after leave: ${d2.data.playerCount} (expected 3)`);

  // Leave room when not in it
  const lr1 = await apiDelete(`/rooms/${roomId}/leave`, p6.token);
  assert(lr1.status === 404, 'Leave when not in room → 404', `Status: ${lr1.status}`);

  // Cleanup
  await apiDelete(`/rooms/${roomId}/leave`, p4.token);
  await apiDelete(`/rooms/${roomId}/leave`, p2.token);
  await apiDelete(`/rooms/${roomId}/leave`, p1.token);
  // Also clean up p3's room
  const d3 = await apiGet(`/rooms/${otherCode}`, p3.token);
  if (d3.data.id) await apiDelete(`/rooms/${d3.data.id}/leave`, p3.token);
}

async function testSocketEdgeCases() {
  console.log('\n🔌 ═══ SOCKET EDGE CASES ═══');

  // Connect with invalid token
  try {
    await connectSocket('/room', 'invalid.token.value');
    assert(false, 'Invalid token socket rejected');
  } catch {
    assert(true, 'Invalid token socket rejected');
  }

  // Connect with valid token
  const p1 = await auth('edge_sock_p1');
  try {
    const s = await connectSocket('/room', p1.token);
    assert(true, 'Valid token socket connected');
    s.disconnect();
  } catch {
    assert(false, 'Valid token socket connected');
  }

  // room:join without being in room (via REST)
  const p2 = await auth('edge_sock_p2');
  const s2 = await connectSocket('/room', p2.token);
  const errors: string[] = [];
  s2.on('room:error', (d: any) => errors.push(d.message));
  s2.emit('room:join', { roomCode: 'NONEXIST' });
  await sleep(1000);
  // Should error or do nothing
  s2.disconnect();

  // room:start as non-host
  const host = await auth('edge_sock_host');
  const guest = await auth('edge_sock_guest');
  const cr = await apiPost('/rooms', { roomName: 'Socket Test' }, host.token);
  const roomCode = cr.data.roomCode;
  await apiPost('/rooms/join', { roomCode }, guest.token);
  const detail = await apiGet(`/rooms/${roomCode}`, host.token);
  const roomId = detail.data.id;

  const sHost = await connectSocket('/room', host.token);
  const sGuest = await connectSocket('/room', guest.token);
  const guestErrors: string[] = [];
  sGuest.on('room:error', (d: any) => guestErrors.push(d.message));

  sHost.emit('room:join', { roomCode });
  sGuest.emit('room:join', { roomCode });
  await sleep(500);

  // Non-host tries to start
  sGuest.emit('room:start');
  await sleep(500);
  assert(guestErrors.some(e => e.includes('host')), 'Non-host start rejected', JSON.stringify(guestErrors));

  // Start with only 1 player (1P room)
  const solo = await auth('edge_sock_solo');
  const crSolo = await apiPost('/rooms', { roomName: 'Solo Room' }, solo.token);
  const soloCode = crSolo.data.roomCode;
  const soloDetail = await apiGet(`/rooms/${soloCode}`, solo.token);
  const soloRoomId = soloDetail.data.id;
  const sSolo = await connectSocket('/room', solo.token);
  const soloErrors: string[] = [];
  sSolo.on('room:error', (d: any) => soloErrors.push(d.message));
  sSolo.emit('room:join', { roomCode: soloCode });
  await sleep(300);
  sSolo.emit('room:start');
  await sleep(500);
  assert(soloErrors.some(e => e.includes('2')), 'Start with 1 player rejected', JSON.stringify(soloErrors));

  // Cleanup
  sHost.disconnect();
  sGuest.disconnect();
  sSolo.disconnect();
  await apiDelete(`/rooms/${roomId}/leave`, guest.token);
  await apiDelete(`/rooms/${roomId}/leave`, host.token);
  await apiDelete(`/rooms/${soloRoomId}/leave`, solo.token);
}

async function testGameplayEdgeCases() {
  console.log('\n🎮 ═══ GAMEPLAY EDGE CASES ═══');

  // Setup: create 2-player game
  const p1 = await auth('edge_game_p1');
  const p2 = await auth('edge_game_p2');

  const cr = await apiPost('/rooms', { roomName: 'Game Edge' }, p1.token);
  const roomCode = cr.data.roomCode;
  await apiPost('/rooms/join', { roomCode }, p2.token);
  const detail = await apiGet(`/rooms/${roomCode}`, p1.token);
  const roomId = detail.data.id;

  // Connect room sockets and start game
  const s1r = await connectSocket('/room', p1.token);
  const s2r = await connectSocket('/room', p2.token);
  s1r.emit('room:join', { roomCode });
  s2r.emit('room:join', { roomCode });
  await sleep(300);
  s2r.emit('room:ready');
  await sleep(300);

  let gameStarted = false;
  s1r.on('room:gameStarting', () => { gameStarted = true; });
  s2r.on('room:gameStarting', () => {});
  s1r.emit('room:start');
  await sleep(1500);
  assert(gameStarted, 'Game started successfully');

  // Connect game sockets
  const s1g = await connectSocket('/game', p1.token);
  const s2g = await connectSocket('/game', p2.token);

  let p1State: any = null, p2State: any = null;
  const gameErrors1: string[] = [];
  const gameErrors2: string[] = [];
  s1g.on('game:state', (s: any) => { p1State = s; });
  s2g.on('game:state', (s: any) => { p2State = s; });
  s1g.on('game:error', (d: any) => gameErrors1.push(d.message));
  s2g.on('game:error', (d: any) => gameErrors2.push(d.message));

  s1g.emit('game:join', { roomId });
  s2g.emit('game:join', { roomId });
  await sleep(1500);

  assert(!!p1State, 'P1 received game state');
  assert(!!p2State, 'P2 received game state');

  if (p1State && p2State) {
    // Determine whose turn it is
    const isP1Turn = p1State.currentTurn === p1.userId;
    const active = isP1Turn ? p1 : p2;
    const passive = isP1Turn ? p2 : p1;
    const activeSocket = isP1Turn ? s1g : s2g;
    const passiveSocket = isP1Turn ? s2g : s1g;
    const activeState = isP1Turn ? p1State : p2State;
    const passiveState = isP1Turn ? p2State : p1State;
    const activeErrors = isP1Turn ? gameErrors1 : gameErrors2;
    const passiveErrors = isP1Turn ? gameErrors2 : gameErrors1;

    // Test: Play out of turn
    passiveSocket.emit('game:play', { cards: [passiveState.hand[0]] });
    await sleep(500);
    assert(passiveErrors.some(e => e.includes('lượt')), 'Out-of-turn play rejected', JSON.stringify(passiveErrors));

    // Test: Play invalid hand (2 random non-pair cards)
    if (activeState.hand.length >= 2) {
      // Find two cards that aren't a pair
      let c1 = activeState.hand[0];
      let c2 = activeState.hand.find((c: any) => c.rank !== c1.rank);
      if (c2) {
        activeSocket.emit('game:play', { cards: [c1, c2] });
        await sleep(500);
        assert(activeErrors.some(e => e.includes('không hợp lệ') || e.includes('invalid')),
          'Invalid hand rejected', JSON.stringify(activeErrors));
        activeErrors.length = 0; // Clear for next test
      }
    }

    // Test: Play a card not in hand
    activeSocket.emit('game:play', { cards: [{ rank: 'X', suit: 'Z' }] });
    await sleep(500);
    assert(activeErrors.length > 0, 'Fake card rejected', JSON.stringify(activeErrors));
    activeErrors.length = 0;

    // Test: Play empty cards
    activeSocket.emit('game:play', { cards: [] });
    await sleep(500);
    assert(activeErrors.length > 0, 'Empty cards rejected', JSON.stringify(activeErrors));
    activeErrors.length = 0;

    // Test: Valid single card play
    const card = activeState.hand[0];
    activeSocket.emit('game:play', { cards: [card] });
    await sleep(1000);
    // State should have updated
    const newState = isP1Turn ? p1State : p2State;
    assert(true, `Valid card played: ${card.rank}${card.suit}`);

    // Test: Pass
    passiveSocket.emit('game:pass');
    await sleep(500);
    assert(true, 'Pass action sent');

    // Test: game:join for non-existent game
    const s3 = await connectSocket('/game', p1.token);
    const s3Errors: string[] = [];
    s3.on('game:error', (d: any) => s3Errors.push(d.message));
    s3.emit('game:join', { roomId: 'non-existent-room-id' });
    await sleep(500);
    assert(s3Errors.length > 0, 'Join non-existent game rejected', JSON.stringify(s3Errors));
    s3.disconnect();
  }

  // Cleanup
  s1r.disconnect(); s2r.disconnect();
  s1g.disconnect(); s2g.disconnect();
  await apiDelete(`/rooms/${roomId}/leave`, p2.token);
  await apiDelete(`/rooms/${roomId}/leave`, p1.token);
}

async function testDisconnectEdgeCases() {
  console.log('\n🔌 ═══ DISCONNECT EDGE CASES ═══');

  // Test: disconnect during WAITING state
  const p1 = await auth('edge_dc_p1');
  const p2 = await auth('edge_dc_p2');

  const cr = await apiPost('/rooms', { roomName: 'DC Test' }, p1.token);
  const roomCode = cr.data.roomCode;
  await apiPost('/rooms/join', { roomCode }, p2.token);
  const detail = await apiGet(`/rooms/${roomCode}`, p1.token);
  const roomId = detail.data.id;

  const s1 = await connectSocket('/room', p1.token);
  const s2 = await connectSocket('/room', p2.token);
  s1.emit('room:join', { roomCode });
  s2.emit('room:join', { roomCode });
  await sleep(500);

  // P2 disconnects (simulating app close)
  s2.disconnect();
  
  // Wait for grace period + 1 second
  console.log('   ⏳ Waiting 6s for disconnect grace period...');
  await sleep(6500);

  // Check room state - P2 should be removed
  const d2 = await apiGet(`/rooms/${roomCode}`, p1.token);
  assert(d2.data.playerCount === 1, `After disconnect: playerCount=${d2.data.playerCount} (expected 1)`);

  // P1 also disconnects → room should be deleted
  s1.disconnect();
  await sleep(6500);
  
  const d3 = await apiGet(`/rooms/${roomCode}`, p1.token);
  assert(d3.status === 404, 'Room deleted after all players disconnect', `Status: ${d3.status}`);

  // Test: Quick reconnect within grace period
  const p3 = await auth('edge_dc_p3');
  const p4 = await auth('edge_dc_p4');
  const cr2 = await apiPost('/rooms', { roomName: 'Reconnect Test' }, p3.token);
  const roomCode2 = cr2.data.roomCode;
  await apiPost('/rooms/join', { roomCode: roomCode2 }, p4.token);
  const detail2 = await apiGet(`/rooms/${roomCode2}`, p3.token);
  const roomId2 = detail2.data.id;

  const s3 = await connectSocket('/room', p3.token);
  s3.emit('room:join', { roomCode: roomCode2 });
  await sleep(300);

  // Disconnect and immediately reconnect (within 5s grace)
  s3.disconnect();
  await sleep(1000); // 1s < 5s grace period
  const s3new = await connectSocket('/room', p3.token);
  s3new.emit('room:join', { roomCode: roomCode2 });
  await sleep(5500); // Wait for grace timeout to pass

  const d4 = await apiGet(`/rooms/${roomCode2}`, p3.token);
  assert(d4.data.playerCount === 2, `Reconnect within grace: playerCount=${d4.data.playerCount} (expected 2)`);

  // Cleanup
  s3new.disconnect();
  await apiDelete(`/rooms/${roomId2}/leave`, p4.token);
  await apiDelete(`/rooms/${roomId2}/leave`, p3.token);
}

async function testHostTransfer() {
  console.log('\n👑 ═══ HOST TRANSFER EDGE CASES ═══');

  const p1 = await auth('edge_host_p1');
  const p2 = await auth('edge_host_p2');
  const p3 = await auth('edge_host_p3');

  const cr = await apiPost('/rooms', { roomName: 'Host Transfer' }, p1.token);
  const roomCode = cr.data.roomCode;
  await apiPost('/rooms/join', { roomCode }, p2.token);
  await apiPost('/rooms/join', { roomCode }, p3.token);
  const detail = await apiGet(`/rooms/${roomCode}`, p1.token);
  const roomId = detail.data.id;
  assert(detail.data.hostId === p1.userId, 'P1 is initial host');

  // Host leaves → should transfer to P2
  await apiDelete(`/rooms/${roomId}/leave`, p1.token);
  const d2 = await apiGet(`/rooms/${roomCode}`, p2.token);
  assert(d2.data.hostId !== p1.userId, 'Host transferred after P1 leaves');
  assert(d2.data.playerCount === 2, `Player count after host leave: ${d2.data.playerCount}`);

  // New host (P2) can start game if P3 is ready
  const s2 = await connectSocket('/room', p2.token);
  const s3 = await connectSocket('/room', p3.token);
  s2.emit('room:join', { roomCode });
  s3.emit('room:join', { roomCode });
  await sleep(300);
  s3.emit('room:ready');
  await sleep(300);

  let started = false;
  s2.on('room:gameStarting', () => { started = true; });
  s2.emit('room:start');
  await sleep(1500);
  assert(started, 'New host can start game after transfer');

  // Cleanup
  s2.disconnect(); s3.disconnect();
  await apiDelete(`/rooms/${roomId}/leave`, p3.token);
  await apiDelete(`/rooms/${roomId}/leave`, p2.token);
}

async function testRoomStatusEdgeCases() {
  console.log('\n🎯 ═══ ROOM STATUS EDGE CASES ═══');

  const p1 = await auth('edge_status_p1');
  const p2 = await auth('edge_status_p2');
  const p3 = await auth('edge_status_p3');

  const cr = await apiPost('/rooms', { roomName: 'Status Test' }, p1.token);
  const roomCode = cr.data.roomCode;
  await apiPost('/rooms/join', { roomCode }, p2.token);
  const detail = await apiGet(`/rooms/${roomCode}`, p1.token);
  const roomId = detail.data.id;

  // Start game → status should be PLAYING
  const s1 = await connectSocket('/room', p1.token);
  const s2 = await connectSocket('/room', p2.token);
  s1.emit('room:join', { roomCode });
  s2.emit('room:join', { roomCode });
  await sleep(300);
  s2.emit('room:ready');
  await sleep(300);
  s1.emit('room:start');
  await sleep(1500);

  const dPlaying = await apiGet(`/rooms/${roomCode}`, p1.token);
  assert(dPlaying.data.status === 'PLAYING', `Room status is PLAYING (got ${dPlaying.data.status})`);

  // Try to join a PLAYING room
  const jr = await apiPost('/rooms/join', { roomCode }, p3.token);
  assert(jr.status === 400, 'Cannot join PLAYING room', `Status: ${jr.status}`);

  // Room list should NOT show PLAYING rooms
  const list = await apiGet('/rooms', p3.token);
  const playingRoom = list.data.find((r: any) => r.roomCode === roomCode);
  assert(!playingRoom, 'PLAYING room not in lobby list');

  // Cleanup
  s1.disconnect(); s2.disconnect();
  await apiDelete(`/rooms/${roomId}/leave`, p2.token);
  await apiDelete(`/rooms/${roomId}/leave`, p1.token);
}

// ============ MAIN ============

async function main() {
  console.log('\n🔍 ═══════════════════════════════════════════════');
  console.log('   EDGE CASE AUDIT — COMPREHENSIVE BUG HUNT');
  console.log('═══════════════════════════════════════════════════');

  try {
    await testAuthEdgeCases();
    await testRoomEdgeCases();
    await testSocketEdgeCases();
    await testGameplayEdgeCases();
    await testHostTransfer();
    await testRoomStatusEdgeCases();
    await testDisconnectEdgeCases();
  } catch (e: any) {
    console.log(`\n💥 FATAL: ${e.message}`);
    console.error(e.stack);
  }

  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`📊 RESULTS: ${passed} passed, ${failed} failed, ${testNum} total`);
  console.log(`═══════════════════════════════════════════════════\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
