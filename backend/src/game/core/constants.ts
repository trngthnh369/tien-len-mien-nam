/**
 * Tiến Lên Miền Nam - Game Constants
 *
 * Rank order: 3 < 4 < 5 < 6 < 7 < 8 < 9 < T < J < Q < K < A < 2
 * Suit order: Spade(♠) < Club(♣) < Diamond(♦) < Heart(♥)
 */
import type { Rank, Suit } from './types';

/** Rank order from weakest to strongest. Index = strength value. */
export const RANK_ORDER: Rank[] = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];

/** Suit order from weakest to strongest. Index = strength value. */
export const SUIT_ORDER: Suit[] = ['S', 'C', 'D', 'H'];

/** Get numeric rank value (0-12) for comparison */
export function getRankValue(rank: Rank): number {
  return RANK_ORDER.indexOf(rank);
}

/** Get numeric suit value (0-3) for comparison */
export function getSuitValue(suit: Suit): number {
  return SUIT_ORDER.indexOf(suit);
}

/** Display names for suits */
export const SUIT_SYMBOLS: Record<Suit, string> = {
  S: '♠',
  C: '♣',
  D: '♦',
  H: '♥',
};

/** Display names for ranks */
export const RANK_DISPLAY: Record<Rank, string> = {
  '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
  '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q',
  'K': 'K', 'A': 'A', '2': '2',
};

/** Available emoji reactions (8 types) */
export const EMOJI_REACTIONS = ['😂', '😤', '🤯', '🥳', '😢', '😎', '🫵', '👏'] as const;

/** Maximum players per room */
export const MAX_PLAYERS = 4;

/** Cards per player */
export const CARDS_PER_PLAYER = 13;

/** Total cards in deck */
export const TOTAL_CARDS = 52;

/** The starting card (3 of Spades) */
export const STARTING_CARD = { suit: 'S' as Suit, rank: '3' as Rank };

/** Redis key TTL in seconds (4 hours) */
export const REDIS_GAME_TTL = 4 * 60 * 60;

/** Reconnect timeout in seconds */
export const RECONNECT_TIMEOUT = 30;
