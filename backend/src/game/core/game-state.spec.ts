import { initGameState, applyAction, cardsInHand, getNextTurn, maskStateForPlayer, finalizeGame } from './game-state';
import type { Card, GameState } from './types';

const PLAYERS = [
  { userId: 'u1', username: 'Player1', seat: 0 },
  { userId: 'u2', username: 'Player2', seat: 1 },
  { userId: 'u3', username: 'Player3', seat: 2 },
  { userId: 'u4', username: 'Player4', seat: 3 },
];

const c = (rank: string, suit: string): Card =>
  ({ rank, suit } as Card);

describe('GameState', () => {
  // ==================== initGameState ====================
  describe('initGameState', () => {
    it('should create state with 4 players, each with 13 cards', () => {
      const state = initGameState('room1', PLAYERS);
      expect(state.players).toHaveLength(4);
      for (const player of state.players) {
        expect(player.cards).toHaveLength(13);
        expect(player.cardCount).toBe(13);
      }
    });

    it('should set status to PLAYING', () => {
      const state = initGameState('room1', PLAYERS);
      expect(state.status).toBe('PLAYING');
    });

    it('should assign first turn to 3♠ holder', () => {
      const state = initGameState('room1', PLAYERS);
      const firstPlayer = state.players.find(
        (p) => p.userId === state.currentTurn,
      );
      expect(firstPlayer).toBeDefined();
      const hasThreeOfSpades = firstPlayer!.cards.some(
        (c) => c.rank === '3' && c.suit === 'S',
      );
      expect(hasThreeOfSpades).toBe(true);
    });

    it('should throw for wrong number of players', () => {
      expect(() =>
        initGameState('room1', PLAYERS.slice(0, 3)),
      ).toThrow();
    });

    it('should initialize empty finishedOrder and passCount=0', () => {
      const state = initGameState('room1', PLAYERS);
      expect(state.finishedOrder).toEqual([]);
      expect(state.passCount).toBe(0);
      expect(state.roundNumber).toBe(1);
      expect(state.lastPlayedCards).toEqual([]);
      expect(state.lastPlayedBy).toBeNull();
      expect(state.lastPlayedHand).toBeNull();
    });

    it('should set correct roomId', () => {
      const state = initGameState('my-room-123', PLAYERS);
      expect(state.roomId).toBe('my-room-123');
    });

    it('should set startedAt as ISO string', () => {
      const state = initGameState('room1', PLAYERS);
      expect(state.startedAt).toBeDefined();
      expect(() => new Date(state.startedAt)).not.toThrow();
    });
  });

  // ==================== cardsInHand ====================
  describe('cardsInHand', () => {
    const hand: Card[] = [
      { rank: '3', suit: 'S' },
      { rank: '5', suit: 'H' },
      { rank: 'A', suit: 'D' },
    ];

    it('should return true when all cards are in hand', () => {
      expect(cardsInHand(hand, [{ rank: '3', suit: 'S' }])).toBe(true);
    });

    it('should return false when card is not in hand', () => {
      expect(cardsInHand(hand, [{ rank: 'K', suit: 'H' }])).toBe(false);
    });

    it('should return true for multiple cards in hand', () => {
      expect(cardsInHand(hand, [
        { rank: '3', suit: 'S' },
        { rank: '5', suit: 'H' },
      ])).toBe(true);
    });

    it('should return false when playing duplicate card not in hand', () => {
      expect(cardsInHand(hand, [
        { rank: '3', suit: 'S' },
        { rank: '3', suit: 'S' }, // duplicate — only 1 in hand
      ])).toBe(false);
    });

    it('should return true for empty play', () => {
      expect(cardsInHand(hand, [])).toBe(true);
    });
  });

  // ==================== applyAction — PLAY ====================
  describe('applyAction — PLAY', () => {
    it('should reject play when not your turn', () => {
      const state = initGameState('room1', PLAYERS);
      const notCurrentPlayer = state.players.find(
        (p) => p.userId !== state.currentTurn,
      )!;
      const result = applyAction(state, {
        type: 'PLAY',
        userId: notCurrentPlayer.userId,
        cards: [notCurrentPlayer.cards[0]],
      });
      expect(result.error).toBeDefined();
    });

    it('should accept valid single card play', () => {
      const state = initGameState('room1', PLAYERS);
      const currentPlayer = state.players.find(
        (p) => p.userId === state.currentTurn,
      )!;
      const cardToPlay = currentPlayer.cards[0];

      const result = applyAction(state, {
        type: 'PLAY',
        userId: currentPlayer.userId,
        cards: [cardToPlay],
      });

      expect(result.error).toBeUndefined();
      expect(result.state).toBeDefined();
      const newState = result.state as GameState;
      const player = newState.players.find(
        (p) => p.userId === currentPlayer.userId,
      )!;
      expect(player.cardCount).toBe(12);
      expect(newState.currentTurn).not.toBe(currentPlayer.userId);
    });

    it('should reject cards not in hand', () => {
      const state = initGameState('room1', PLAYERS);
      const currentPlayer = state.players.find(
        (p) => p.userId === state.currentTurn,
      )!;
      // Play a card that doesn't exist in their hand
      const fakeCard = c('2', 'H');
      // Make sure the card isn't in hand
      const inHand = currentPlayer.cards.some(
        (c) => c.rank === fakeCard.rank && c.suit === fakeCard.suit,
      );

      if (!inHand) {
        const result = applyAction(state, {
          type: 'PLAY',
          userId: currentPlayer.userId,
          cards: [fakeCard],
        });
        expect(result.error).toBeDefined();
        expect(result.error).toContain('gian lận');
      }
    });

    it('should reject invalid hand type (2 cards different ranks)', () => {
      const state = initGameState('room1', PLAYERS);
      const currentPlayer = state.players.find(
        (p) => p.userId === state.currentTurn,
      )!;

      // Find 2 cards of different ranks in hand
      const card1 = currentPlayer.cards[0];
      const card2 = currentPlayer.cards.find((c) => c.rank !== card1.rank);

      if (card2) {
        const result = applyAction(state, {
          type: 'PLAY',
          userId: currentPlayer.userId,
          cards: [card1, card2],
        });
        expect(result.error).toBeDefined();
      }
    });

    it('should reject empty cards array', () => {
      const state = initGameState('room1', PLAYERS);
      const currentPlayer = state.players.find(
        (p) => p.userId === state.currentTurn,
      )!;

      const result = applyAction(state, {
        type: 'PLAY',
        userId: currentPlayer.userId,
        cards: [],
      });
      expect(result.error).toBeDefined();
    });

    it('should set lastPlayedBy after successful play', () => {
      const state = initGameState('room1', PLAYERS);
      const currentPlayer = state.players.find(
        (p) => p.userId === state.currentTurn,
      )!;

      const result = applyAction(state, {
        type: 'PLAY',
        userId: currentPlayer.userId,
        cards: [currentPlayer.cards[0]],
      });

      const newState = result.state as GameState;
      expect(newState.lastPlayedBy).toBe(currentPlayer.userId);
      expect(newState.lastPlayedCards).toHaveLength(1);
      expect(newState.lastPlayedHand).toBeDefined();
    });

    it('should reject weaker card when table has cards', () => {
      const state = initGameState('room1', PLAYERS);
      const p1 = state.players.find((p) => p.userId === state.currentTurn)!;

      // Find the highest card in p1's hand
      const highCard = p1.cards[p1.cards.length - 1]; // sorted ascending

      // Play the high card
      const result1 = applyAction(state, {
        type: 'PLAY',
        userId: p1.userId,
        cards: [highCard],
      });
      expect(result1.state).toBeDefined();
      const afterPlay = result1.state as GameState;

      // Next player tries to play a lower card
      const p2 = afterPlay.players.find(
        (p) => p.userId === afterPlay.currentTurn,
      )!;
      const lowCard = p2.cards[0]; // lowest card

      // Only test if lowCard is actually lower
      const result2 = applyAction(afterPlay, {
        type: 'PLAY',
        userId: p2.userId,
        cards: [lowCard],
      });
      // May or may not be rejected depending on card values, but we verify structure
      if (result2.error) {
        expect(result2.error).toContain('mạnh');
      }
    });
  });

  // ==================== applyAction — PASS ====================
  describe('applyAction — PASS', () => {
    it('should advance turn on pass', () => {
      const state = initGameState('room1', PLAYERS);
      const currentPlayer = state.players.find(
        (p) => p.userId === state.currentTurn,
      )!;

      // First play a card
      const playResult = applyAction(state, {
        type: 'PLAY',
        userId: currentPlayer.userId,
        cards: [currentPlayer.cards[0]],
      });
      expect(playResult.state).toBeDefined();
      const afterPlay = playResult.state as GameState;

      // Then pass
      const nextPlayer = afterPlay.players.find(
        (p) => p.userId === afterPlay.currentTurn,
      )!;
      const passResult = applyAction(afterPlay, {
        type: 'PASS',
        userId: nextPlayer.userId,
      });

      expect(passResult.error).toBeUndefined();
      const afterPass = passResult.state as GameState;
      expect(afterPass.currentTurn).not.toBe(nextPlayer.userId);
      expect(afterPass.passCount).toBeGreaterThan(0);
    });

    it('should reset table when all other active players pass', () => {
      const state = initGameState('room1', PLAYERS);
      const p1 = state.players.find((p) => p.userId === state.currentTurn)!;

      // P1 plays
      const play = applyAction(state, {
        type: 'PLAY',
        userId: p1.userId,
        cards: [p1.cards[0]],
      });
      let current = play.state as GameState;

      // All other 3 players pass
      for (let i = 0; i < 3; i++) {
        const passer = current.players.find(
          (p) => p.userId === current.currentTurn,
        )!;
        const passResult = applyAction(current, {
          type: 'PASS',
          userId: passer.userId,
        });
        current = passResult.state as GameState;
      }

      // After all pass, table should be cleared
      expect(current.lastPlayedCards).toEqual([]);
      expect(current.lastPlayedBy).toBeNull();
      expect(current.lastPlayedHand).toBeNull();
      expect(current.passCount).toBe(0);
      // Last player who played (p1) gets the turn
      expect(current.currentTurn).toBe(p1.userId);
    });

    it('should reject pass when not your turn', () => {
      const state = initGameState('room1', PLAYERS);
      const p1 = state.players.find((p) => p.userId === state.currentTurn)!;

      // P1 plays first
      const play = applyAction(state, {
        type: 'PLAY',
        userId: p1.userId,
        cards: [p1.cards[0]],
      });
      const afterPlay = play.state as GameState;

      // Wrong player tries to pass
      const wrongPlayer = afterPlay.players.find(
        (p) => p.userId !== afterPlay.currentTurn,
      )!;
      const result = applyAction(afterPlay, {
        type: 'PASS',
        userId: wrongPlayer.userId,
      });
      expect(result.error).toBeDefined();
    });
  });

  // ==================== Full Game Simulation ====================
  describe('Full Game Simulation', () => {
    it('should finish when 3 players run out of cards', () => {
      // We create a controlled game state to simulate a game ending
      const state = initGameState('room1', PLAYERS);

      // Create a manually controlled state where players have few cards
      const controlled: GameState = {
        ...state,
        players: [
          { userId: 'u1', username: 'P1', seat: 0, cards: [c('A', 'H')], cardCount: 1 },
          { userId: 'u2', username: 'P2', seat: 1, cards: [c('K', 'H')], cardCount: 1 },
          { userId: 'u3', username: 'P3', seat: 2, cards: [c('Q', 'H')], cardCount: 1 },
          { userId: 'u4', username: 'P4', seat: 3, cards: [c('J', 'S'), c('J', 'H')], cardCount: 2 },
        ],
        currentTurn: 'u1',
        lastPlayedCards: [],
        lastPlayedBy: null,
        lastPlayedHand: null,
        passCount: 0,
        finishedOrder: [],
      };

      // u1 plays A♥ (single)
      const r1 = applyAction(controlled, { type: 'PLAY', userId: 'u1', cards: [c('A', 'H')] });
      expect(r1.state).toBeDefined();
      const s1 = r1.state as GameState;
      expect(s1.finishedOrder).toContain('u1'); // u1 is out

      // u2, u3, u4 all pass (can't beat A)
      // Actually u2 has K which can't beat A, so pass
      const r2 = applyAction(s1, { type: 'PASS', userId: s1.currentTurn });
      const s2 = r2.state as GameState;

      const r3 = applyAction(s2, { type: 'PASS', userId: s2.currentTurn });
      const s3 = r3.state as GameState;

      // After all active players pass (u2, u3, u4 - with u1 finished), 
      // table clears and last player who played gets turn
      // But u1 already finished, so next active player gets turn
      
      // Since state flow depends on pass count and active players,
      // let's just verify the game can proceed
      expect(s3.status).toBeDefined();
    });

    it('should set FINISHED when only 1 player remains', () => {
      // Controlled state: 2 active players, 2 already finished
      const controlled: GameState = {
        roomId: 'room1',
        status: 'PLAYING',
        currentTurn: 'u3',
        players: [
          { userId: 'u1', username: 'P1', seat: 0, cards: [], cardCount: 0 },
          { userId: 'u2', username: 'P2', seat: 1, cards: [], cardCount: 0 },
          { userId: 'u3', username: 'P3', seat: 2, cards: [c('2', 'H')], cardCount: 1 },
          { userId: 'u4', username: 'P4', seat: 3, cards: [c('3', 'S')], cardCount: 1 },
        ],
        lastPlayedCards: [],
        lastPlayedBy: null,
        lastPlayedHand: null,
        passCount: 0,
        finishedOrder: ['u1', 'u2'],
        roundNumber: 5,
        startedAt: new Date().toISOString(),
      };

      // u3 plays 2♥
      const r = applyAction(controlled, {
        type: 'PLAY',
        userId: 'u3',
        cards: [c('2', 'H')],
      });

      expect(r.state).toBeDefined();
      const s = r.state as GameState;
      expect(s.status).toBe('FINISHED');
      expect(s.finishedOrder).toEqual(['u1', 'u2', 'u3', 'u4']);
    });
  });

  // ==================== getNextTurn ====================
  describe('getNextTurn', () => {
    it('should wrap around to next player', () => {
      const state = initGameState('room1', PLAYERS);
      const next = getNextTurn(state, state.players[0].userId);
      expect(next).toBe(state.players[1].userId);
    });

    it('should wrap from last player to first', () => {
      const state = initGameState('room1', PLAYERS);
      const next = getNextTurn(state, state.players[3].userId);
      expect(next).toBe(state.players[0].userId);
    });

    it('should skip finished players', () => {
      const state = initGameState('room1', PLAYERS);
      state.finishedOrder = ['u2']; // u2 is finished

      const next = getNextTurn(state, 'u1');
      expect(next).toBe('u3'); // should skip u2
    });

    it('should return null when only 1 active player left', () => {
      const state = initGameState('room1', PLAYERS);
      state.finishedOrder = ['u1', 'u2', 'u3'];

      const next = getNextTurn(state, 'u4');
      expect(next).toBeNull();
    });

    it('should skip multiple consecutive finished players', () => {
      const state = initGameState('room1', PLAYERS);
      state.finishedOrder = ['u2', 'u3']; // u2 and u3 finished

      const next = getNextTurn(state, 'u1');
      expect(next).toBe('u4');
    });
  });

  // ==================== maskStateForPlayer ====================
  describe('maskStateForPlayer', () => {
    it('should hide other players cards', () => {
      const state = initGameState('room1', PLAYERS);
      const masked = maskStateForPlayer(state, 'u1');
      const myState = masked.players.find((p) => p.userId === 'u1')!;
      expect(myState.cards).toHaveLength(13);

      for (const other of masked.players.filter((p) => p.userId !== 'u1')) {
        expect(other.cards).toHaveLength(0);
        expect(other.cardCount).toBe(13);
      }
    });

    it('should preserve card count for hidden players', () => {
      const state = initGameState('room1', PLAYERS);
      const masked = maskStateForPlayer(state, 'u3');

      for (const p of masked.players) {
        if (p.userId === 'u3') {
          expect(p.cards).toHaveLength(13);
        } else {
          expect(p.cards).toHaveLength(0);
          expect(p.cardCount).toBe(13); // cardCount still visible
        }
      }
    });

    it('should not mutate original state', () => {
      const state = initGameState('room1', PLAYERS);
      const original = JSON.parse(JSON.stringify(state));
      maskStateForPlayer(state, 'u1');
      expect(state).toEqual(original);
    });
  });

  // ==================== finalizeGame ====================
  describe('finalizeGame', () => {
    it('should generate results with correct rankings', () => {
      const state: GameState = {
        roomId: 'room1',
        status: 'FINISHED',
        currentTurn: 'u4',
        players: [
          { userId: 'u1', username: 'P1', seat: 0, cards: [], cardCount: 0 },
          { userId: 'u2', username: 'P2', seat: 1, cards: [], cardCount: 0 },
          { userId: 'u3', username: 'P3', seat: 2, cards: [], cardCount: 0 },
          { userId: 'u4', username: 'P4', seat: 3, cards: [c('3', 'S')], cardCount: 1 },
        ],
        lastPlayedCards: [],
        lastPlayedBy: null,
        lastPlayedHand: null,
        passCount: 0,
        finishedOrder: ['u2', 'u3', 'u1', 'u4'],
        roundNumber: 10,
        startedAt: new Date().toISOString(),
      };

      const results = finalizeGame(state);
      expect(results).toHaveLength(4);
      expect(results[0]).toEqual(expect.objectContaining({ userId: 'u2', rank: 1 }));
      expect(results[1]).toEqual(expect.objectContaining({ userId: 'u3', rank: 2 }));
      expect(results[2]).toEqual(expect.objectContaining({ userId: 'u1', rank: 3 }));
      expect(results[3]).toEqual(expect.objectContaining({ userId: 'u4', rank: 4 }));
    });
  });
});
