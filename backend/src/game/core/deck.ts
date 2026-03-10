/**
 * Tiến Lên Miền Nam - Deck Module
 *
 * Creates, shuffles, and deals a standard 52-card deck.
 * Pure functions, no I/O.
 */
import type { Card, Rank, Suit } from './types';
import { RANK_ORDER, SUIT_ORDER, CARDS_PER_PLAYER } from './constants';

/**
 * Creates a standard 52-card deck (unshuffled).
 * @returns Array of 52 Card objects
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUIT_ORDER) {
    for (const rank of RANK_ORDER) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/**
 * Shuffles a deck in-place using Fisher-Yates algorithm.
 * @param deck - Array of cards to shuffle
 * @returns The same array, shuffled
 */
export function shuffleDeck(deck: Card[]): Card[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Deals cards equally among players.
 * @param numPlayers - Number of players (should be 4)
 * @returns Array of card arrays, one per player (each with 13 cards)
 */
export function dealCards(numPlayers: number = 4): Card[][] {
  const deck = shuffleDeck(createDeck());
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);

  for (let i = 0; i < deck.length; i++) {
    hands[i % numPlayers].push(deck[i]);
  }

  return hands;
}

/**
 * Finds which player has the 3 of Spades (starting card).
 * @param hands - Array of player hands
 * @returns Index of the player who has 3♠, or -1 if not found
 */
export function findStartingPlayer(hands: Card[][]): number {
  for (let i = 0; i < hands.length; i++) {
    if (hands[i].some(card => card.rank === '3' && card.suit === 'S')) {
      return i;
    }
  }
  return -1;
}

/**
 * Serializes a card to a short string representation (e.g., "3S", "AH", "2D").
 */
export function cardToString(card: Card): string {
  return `${card.rank}${card.suit}`;
}

/**
 * Parses a short string back to a Card object.
 */
export function stringToCard(str: string): Card {
  if (str.length !== 2) throw new Error(`Invalid card string: ${str}`);
  const rank = str[0] as Rank;
  const suit = str[1] as Suit;
  if (!RANK_ORDER.includes(rank)) throw new Error(`Invalid rank: ${rank}`);
  if (!SUIT_ORDER.includes(suit)) throw new Error(`Invalid suit: ${suit}`);
  return { rank, suit };
}
