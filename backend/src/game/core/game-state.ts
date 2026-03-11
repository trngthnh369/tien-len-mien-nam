/**
 * Tiến Lên Miền Nam - Game State Module
 *
 * Manages game state transitions: initialization, action processing,
 * turn management, and game finalization.
 * Pure functions, no I/O.
 */
import type { Card, GameAction, GameState, GameResult, HandType, PlayerState } from './types';
import { CARDS_PER_PLAYER, MAX_PLAYERS } from './constants';
import { dealCards, findStartingPlayer } from './deck';
import { sortCards, validateHand } from './hand-evaluator';
import { compareHands } from './game-rules';

/**
 * Initializes a new game state for a room.
 *
 * @param roomId - The room ID
 * @param players - Array of player info (userId, username, seat)
 * @returns Initial GameState with cards dealt and first player determined
 */
export function initGameState(
  roomId: string,
  players: Array<{ userId: string; username: string; seat: number }>
): GameState {
  if (players.length < 2 || players.length > MAX_PLAYERS) {
    throw new Error(`Game requires 2-${MAX_PLAYERS} players, got ${players.length}`);
  }

  const numPlayers = players.length;

  // Deal cards (distributes all 52 cards evenly among players)
  const hands = dealCards(numPlayers);

  // Sort each hand for display
  const sortedHands = hands.map(hand => sortCards(hand));

  // Find who has 3♠ — they go first
  const startingPlayerIndex = findStartingPlayer(sortedHands);

  // Build player states
  const playerStates: PlayerState[] = players.map((p, i) => ({
    userId: p.userId,
    username: p.username,
    seat: p.seat,
    cards: sortedHands[i],
    cardCount: sortedHands[i].length,
  }));

  return {
    roomId,
    status: 'PLAYING',
    currentTurn: playerStates[startingPlayerIndex].userId,
    players: playerStates,
    lastPlayedCards: [],
    lastPlayedBy: null,
    lastPlayedHand: null,
    passCount: 0,
    finishedOrder: [],
    roundNumber: 1,
    startedAt: new Date().toISOString(),
  };
}

/**
 * Removes specific cards from a player's hand.
 * @returns New hand without the played cards
 */
function removeCardsFromHand(hand: Card[], playedCards: Card[]): Card[] {
  const remaining = [...hand];
  for (const played of playedCards) {
    const idx = remaining.findIndex(
      c => c.rank === played.rank && c.suit === played.suit
    );
    if (idx !== -1) {
      remaining.splice(idx, 1);
    }
  }
  return remaining;
}

/**
 * Checks if all played cards exist in the player's hand.
 */
export function cardsInHand(hand: Card[], playedCards: Card[]): boolean {
  const handCopy = [...hand];
  for (const card of playedCards) {
    const idx = handCopy.findIndex(
      c => c.rank === card.rank && c.suit === card.suit
    );
    if (idx === -1) return false;
    handCopy.splice(idx, 1);
  }
  return true;
}

/**
 * Gets the next player's turn, skipping players who have finished.
 *
 * @param state - Current game state
 * @param currentUserId - Current player's userId
 * @returns userId of the next player, or null if game should end
 */
export function getNextTurn(state: GameState, currentUserId: string): string | null {
  const activePlayers = state.players.filter(
    p => !state.finishedOrder.includes(p.userId)
  );

  if (activePlayers.length <= 1) {
    return null; // Game over
  }

  const currentIndex = state.players.findIndex(p => p.userId === currentUserId);
  let nextIndex = (currentIndex + 1) % state.players.length;

  // Skip finished players
  while (state.finishedOrder.includes(state.players[nextIndex].userId)) {
    nextIndex = (nextIndex + 1) % state.players.length;
  }

  return state.players[nextIndex].userId;
}

/**
 * Applies a game action to the current state.
 *
 * @param state - Current game state (will NOT be mutated)
 * @param action - The action to apply (PLAY or PASS)
 * @returns New game state after action, or { error: string } if invalid
 */
export function applyAction(
  state: GameState,
  action: GameAction
): { state: GameState; error?: string } | { error: string; state?: undefined } {
  // Validate it's this player's turn
  if (state.currentTurn !== action.userId) {
    return { error: 'Chưa đến lượt bạn' };
  }

  const playerIndex = state.players.findIndex(p => p.userId === action.userId);
  if (playerIndex === -1) {
    return { error: 'Player không tồn tại trong game' };
  }

  const player = state.players[playerIndex];

  if (action.type === 'PASS') {
    return handlePass(state, action.userId, playerIndex);
  }

  if (action.type === 'PLAY') {
    if (!action.cards || action.cards.length === 0) {
      return { error: 'Bộ bài không hợp lệ' };
    }
    return handlePlay(state, action.userId, playerIndex, action.cards);
  }

  return { error: 'Action không hợp lệ' };
}

/**
 * Handles a PASS action.
 */
function handlePass(
  state: GameState,
  userId: string,
  playerIndex: number
): { state: GameState } | { error: string } {
  const newState = deepCloneState(state);
  newState.passCount += 1;

  // Count active players (excluding finished ones)
  const activePlayers = newState.players.filter(
    p => !newState.finishedOrder.includes(p.userId)
  );

  // If all other active players have passed, the last player who played wins the round
  if (newState.passCount >= activePlayers.length - 1) {
    // New round: clear the table
    newState.lastPlayedCards = [];
    newState.lastPlayedBy = null;
    newState.lastPlayedHand = null;
    newState.passCount = 0;
    // The last player who played gets to start the new round
    // currentTurn stays as lastPlayedBy (already set)
    const lastPlayerId = state.lastPlayedBy;
    if (lastPlayerId && !newState.finishedOrder.includes(lastPlayerId)) {
      newState.currentTurn = lastPlayerId;
    } else {
      // If last player already finished, move to next
      const next = getNextTurn(newState, userId);
      if (next) newState.currentTurn = next;
    }
  } else {
    // Move to next player
    const next = getNextTurn(newState, userId);
    if (next) {
      newState.currentTurn = next;
    }
  }

  return { state: newState };
}

/**
 * Handles a PLAY action.
 */
function handlePlay(
  state: GameState,
  userId: string,
  playerIndex: number,
  cards: Card[]
): { state: GameState } | { error: string } {
  const player = state.players[playerIndex];

  // Validate cards are in player's hand
  if (!cardsInHand(player.cards, cards)) {
    return { error: 'Bài gian lận - lá bài không trong tay bạn' };
  }

  // Validate hand type
  const hand = validateHand(cards);
  if (!hand) {
    return { error: 'Bộ bài không hợp lệ' };
  }

  // If table is not empty, compare with last played
  if (state.lastPlayedHand) {
    const beats = compareHands(hand, state.lastPlayedHand);
    if (!beats) {
      return { error: 'Bài không đủ mạnh' };
    }
  }

  // Apply the play
  const newState = deepCloneState(state);
  const newPlayer = newState.players[playerIndex];

  // Remove cards from hand
  newPlayer.cards = removeCardsFromHand(newPlayer.cards, cards);
  newPlayer.cardCount = newPlayer.cards.length;

  // Update table
  newState.lastPlayedCards = cards;
  newState.lastPlayedBy = userId;
  newState.lastPlayedHand = hand;
  newState.passCount = 0;

  // Check if player finished (no cards left)
  if (newPlayer.cardCount === 0) {
    newState.finishedOrder.push(userId);
  }

  // Check if game is over (3 players finished)
  const activePlayers = newState.players.filter(
    p => !newState.finishedOrder.includes(p.userId)
  );

  if (activePlayers.length <= 1) {
    // Last remaining player is automatically last place
    if (activePlayers.length === 1) {
      newState.finishedOrder.push(activePlayers[0].userId);
    }
    newState.status = 'FINISHED';
  } else {
    // Move to next player
    const next = getNextTurn(newState, userId);
    if (next) {
      newState.currentTurn = next;
    }
  }

  return { state: newState };
}

/**
 * Finalizes a completed game and generates results.
 *
 * @param state - Final game state (status should be FINISHED)
 * @returns Array of GameResult objects with rankings
 */
export function finalizeGame(state: GameState): GameResult[] {
  return state.finishedOrder.map((userId, index) => {
    const player = state.players.find(p => p.userId === userId)!;
    return {
      userId,
      username: player.username,
      rank: index + 1, // 1=nhất, 2=nhì, 3=ba, 4=bét
      cardCount: player.cardCount,
    };
  });
}

/**
 * Masks game state for a specific player (hide other players' cards).
 *
 * @param state - Full game state
 * @param forUserId - The player who should see their own cards
 * @returns Masked state safe to send to client
 */
export function maskStateForPlayer(state: GameState, forUserId: string): any {
  const myPlayer = state.players.find(p => p.userId === forUserId);
  return {
    ...state,
    // Top-level 'hand' field for easy access by frontend
    hand: myPlayer ? myPlayer.cards : [],
    players: state.players.map(p => ({
      ...p,
      cards: p.userId === forUserId ? p.cards : [], // Hide other players' cards
    })),
  };
}

/**
 * Deep clones game state to avoid mutations.
 */
function deepCloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}
