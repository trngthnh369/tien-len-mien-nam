/**
 * Tiến Lên Miền Nam - Hand Evaluator
 *
 * Validates and classifies card combinations according to game rules.
 * Pure functions, no I/O.
 *
 * Valid hand types:
 * - Single (1 card)
 * - Pair (2 cards, same rank)
 * - Triple (3 cards, same rank)
 * - Four of a Kind (4 cards, same rank)
 * - Straight (3-12 consecutive ranks, no 2s)
 * - Consecutive Pairs (3+ consecutive pairs, no 2s)
 */
import type { Card, HandType } from './types';
import { getRankValue, getSuitValue, RANK_ORDER } from './constants';

/**
 * Sorts cards by rank (ascending), then by suit (ascending) for same rank.
 * @param cards - Array of cards to sort
 * @returns New sorted array (does not mutate original)
 */
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const rankDiff = getRankValue(a.rank) - getRankValue(b.rank);
    if (rankDiff !== 0) return rankDiff;
    return getSuitValue(a.suit) - getSuitValue(b.suit);
  });
}

/**
 * Gets the highest card from a set of cards.
 * Highest = highest rank, then highest suit if tie.
 */
export function getHighestCard(cards: Card[]): Card {
  return cards.reduce((highest, card) => {
    const rankComp = getRankValue(card.rank) - getRankValue(highest.rank);
    if (rankComp > 0) return card;
    if (rankComp === 0 && getSuitValue(card.suit) > getSuitValue(highest.suit)) return card;
    return highest;
  });
}

/**
 * Checks if cards form consecutive ranks (no gaps).
 * @param rankValues - Sorted array of rank values
 * @returns true if consecutive
 */
function areConsecutive(rankValues: number[]): boolean {
  for (let i = 1; i < rankValues.length; i++) {
    if (rankValues[i] !== rankValues[i - 1] + 1) return false;
  }
  return true;
}

/**
 * Checks if any card in the set is a 2 (Heo).
 * 2s cannot be used in straights or consecutive pairs.
 */
function containsTwo(cards: Card[]): boolean {
  return cards.some(card => card.rank === '2');
}

/**
 * Validates and classifies a set of cards as a valid Tiến Lên hand type.
 *
 * @param cards - Array of 1-12 cards to validate
 * @returns HandType object if valid, null if invalid
 *
 * Classification rules (checked in order):
 * 1. Single card (1 card) → SINGLE
 * 2. Pair (2 cards, same rank) → PAIR
 * 3. Triple (3 cards, same rank) → TRIPLE
 * 4. Four of a Kind (4 cards, same rank) → FOUR_OF_KIND
 * 5. Straight (3-12 cards, consecutive ranks, no 2s) → STRAIGHT
 * 6. Consecutive Pairs (6-8 cards, 3-4 consecutive pairs, no 2s) → CONSECUTIVE_PAIRS
 * 7. Otherwise → null (invalid)
 */
export function validateHand(cards: Card[]): HandType | null {
  if (!cards || cards.length === 0) return null;

  const sorted = sortCards(cards);
  const count = sorted.length;

  // 1. Single card
  if (count === 1) {
    return { type: 'SINGLE', card: sorted[0] };
  }

  // 2. Pair (2 cards, same rank)
  if (count === 2 && sorted[0].rank === sorted[1].rank) {
    return { type: 'PAIR', cards: sorted as [Card, Card] };
  }

  // Check if all cards have the same rank
  const allSameRank = sorted.every(c => c.rank === sorted[0].rank);

  // 3. Triple (3 cards, same rank)
  if (count === 3 && allSameRank) {
    return { type: 'TRIPLE', cards: sorted };
  }

  // 4. Four of a Kind (4 cards, same rank)
  if (count === 4 && allSameRank) {
    return { type: 'FOUR_OF_KIND', cards: sorted };
  }

  // 5. Straight (3-12 consecutive cards, no 2s)
  if (count >= 3 && count <= 12 && !containsTwo(sorted)) {
    const rankValues = sorted.map(c => getRankValue(c.rank));
    const uniqueRanks = [...new Set(rankValues)];

    // Each rank must appear exactly once in a straight
    if (uniqueRanks.length === count && areConsecutive(uniqueRanks)) {
      return { type: 'STRAIGHT', cards: sorted, length: count };
    }
  }

  // 6. Consecutive Pairs (3-4 consecutive pairs = 6 or 8 cards, no 2s)
  if ((count === 6 || count === 8) && !containsTwo(sorted)) {
    const pairCount = count / 2;
    let isConsecutivePairs = true;

    // Check that each pair of adjacent cards has the same rank
    for (let i = 0; i < count; i += 2) {
      if (sorted[i].rank !== sorted[i + 1].rank) {
        isConsecutivePairs = false;
        break;
      }
    }

    if (isConsecutivePairs) {
      // Check ranks are consecutive
      const pairRanks: number[] = [];
      for (let i = 0; i < count; i += 2) {
        pairRanks.push(getRankValue(sorted[i].rank));
      }

      if (areConsecutive(pairRanks)) {
        return { type: 'CONSECUTIVE_PAIRS', cards: sorted, pairCount };
      }
    }
  }

  // Invalid combination
  return null;
}
