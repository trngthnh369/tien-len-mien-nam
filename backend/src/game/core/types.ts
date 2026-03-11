/**
 * Tiến Lên Miền Nam - Card Game Types
 * Pure TypeScript types for the game engine
 */

/** Card suits ordered by strength: Spade < Club < Diamond < Heart */
export type Suit = 'S' | 'C' | 'D' | 'H';

/** Card ranks ordered by strength: 3 is weakest, 2 is strongest */
export type Rank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A' | '2';

/** A single playing card */
export interface Card {
  suit: Suit;
  rank: Rank;
}

/** Types of valid card combinations in Tiến Lên Miền Nam */
export type HandType =
  | { type: 'SINGLE'; card: Card }
  | { type: 'PAIR'; cards: [Card, Card] }
  | { type: 'TRIPLE'; cards: Card[] }
  | { type: 'FOUR_OF_KIND'; cards: Card[] }
  | { type: 'STRAIGHT'; cards: Card[]; length: number }
  | { type: 'CONSECUTIVE_PAIRS'; cards: Card[]; pairCount: number };

/** Player state within a game */
export interface PlayerState {
  userId: string;
  username: string;
  seat: number;
  cards: Card[];
  cardCount: number;
}

/** Game action types */
export type GameActionType = 'PLAY' | 'PASS';

/** Action payload for game events */
export interface GameAction {
  type: GameActionType;
  userId: string;
  cards?: Card[];
}

/** Complete game state stored in Redis */
export interface GameState {
  roomId: string;
  status: 'PLAYING' | 'FINISHED';
  currentTurn: string; // userId
  players: PlayerState[];
  lastPlayedCards: Card[];
  lastPlayedBy: string | null;
  lastPlayedHand: HandType | null;
  passCount: number;
  finishedOrder: string[]; // userIds in order of finishing
  roundNumber: number;
  isFirstTurn: boolean; // True until first card is played (enforce 3♠)
  startedAt: string; // ISO8601
  sessionId?: string; // DB session ID, set when game starts
}

/** Game result for a single player in a session */
export interface GameResult {
  userId: string;
  username: string;
  rank: number; // 1=nhất, 2=nhì, 3=ba, 4=bét
  cardCount: number;
}

/** Room status enum */
export type RoomStatus = 'WAITING' | 'PLAYING' | 'FINISHED';

/** Room player info */
export interface RoomPlayer {
  userId: string;
  username: string;
  seat: number;
  isHost: boolean;
  isReady: boolean;
}

/** Error codes for game events */
export enum GameErrorCode {
  NOT_YOUR_TURN = 'NOT_YOUR_TURN',
  INVALID_HAND = 'INVALID_HAND',
  NOT_STRONG_ENOUGH = 'NOT_STRONG_ENOUGH',
  CARDS_NOT_IN_HAND = 'CARDS_NOT_IN_HAND',
  GAME_NOT_FOUND = 'GAME_NOT_FOUND',
  ROOM_FULL = 'ROOM_FULL',
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  ALREADY_IN_ROOM = 'ALREADY_IN_ROOM',
}
