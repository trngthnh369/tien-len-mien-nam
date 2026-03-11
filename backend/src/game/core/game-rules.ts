/**
 * Tiến Lên Miền Nam - Game Rules Module
 *
 * Compares hands, checks cuts, and determines valid plays.
 * Pure functions, no I/O.
 *
 * Key rules:
 * - Same type comparison: compare highest card (rank, then suit)
 * - Cross-type cuts: FourOfAKind beats Single 2, ConsecutivePairs(3) beats Single 2
 * - ConsecutivePairs(4) beats Pair of 2s
 * - Straight must have same length to compare
 */
import type { Card, HandType } from './types';
import { getRankValue, getSuitValue } from './constants';
import { getHighestCard } from './hand-evaluator';

/**
 * Compares two cards for strength.
 * @returns positive if a > b, negative if a < b, 0 if equal
 */
export function compareCards(a: Card, b: Card): number {
  const rankDiff = getRankValue(a.rank) - getRankValue(b.rank);
  if (rankDiff !== 0) return rankDiff;
  return getSuitValue(a.suit) - getSuitValue(b.suit);
}

/**
 * Checks if the attacker hand is a "2" (single or pair of 2s).
 */
function isSingle2(hand: HandType): boolean {
  return hand.type === 'SINGLE' && hand.card.rank === '2';
}

function isPair2(hand: HandType): boolean {
  return hand.type === 'PAIR' && hand.cards[0].rank === '2';
}

/**
 * Checks if the attacker can "cut" (chặt) the defender's play.
 *
 * Cut rules in Tiến Lên Miền Nam:
 * - Four of a Kind (tứ quý) can cut a Single 2
 * - Consecutive Pairs with 3 pairs (ba đôi thông) can cut a Single 2
 * - Consecutive Pairs with 4 pairs (4 đôi thông) can cut a Pair of 2s
 *
 * @param attacker - The hand being played
 * @param defender - The hand currently on the table
 * @returns true if attacker can cut defender
 */
export function canCut(attacker: HandType, defender: HandType): boolean {
  // Four of a Kind cuts Single 2
  if (attacker.type === 'FOUR_OF_KIND' && isSingle2(defender)) {
    return true;
  }

  // Consecutive 3 Pairs cuts Single 2
  if (attacker.type === 'CONSECUTIVE_PAIRS' && attacker.pairCount === 3 && isSingle2(defender)) {
    return true;
  }

  // Consecutive 4 Pairs cuts Pair of 2s
  if (attacker.type === 'CONSECUTIVE_PAIRS' && attacker.pairCount === 4 && isPair2(defender)) {
    return true;
  }

  // Four of a Kind cuts Pair of 2s (Tứ quý chặt đôi heo - luật chuẩn)
  if (attacker.type === 'FOUR_OF_KIND' && isPair2(defender)) {
    return true;
  }

  return false;
}

/**
 * Gets the list of cards from a hand for comparison purposes.
 */
function getHandCards(hand: HandType): Card[] {
  switch (hand.type) {
    case 'SINGLE':
      return [hand.card];
    case 'PAIR':
    case 'TRIPLE':
    case 'FOUR_OF_KIND':
    case 'STRAIGHT':
    case 'CONSECUTIVE_PAIRS':
      return hand.cards;
  }
}

/**
 * Compares two hands and determines if the attacker beats the defender.
 *
 * Rules:
 * 1. Different types: only cross-type cuts are valid (via canCut)
 * 2. Same type, same length: compare highest card
 * 3. Straights must be same length
 *
 * @param attacker - The hand being played
 * @param defender - The hand currently on the table
 * @returns true if attacker beats defender
 */
export function compareHands(attacker: HandType, defender: HandType): boolean {
  // Check cross-type cuts first
  if (canCut(attacker, defender)) {
    return true;
  }

  // Must be same type for normal comparison
  if (attacker.type !== defender.type) {
    return false;
  }

  // Get cards for comparison
  const attackerCards = getHandCards(attacker);
  const defenderCards = getHandCards(defender);

  // Must have same number of cards (e.g., straights of different lengths can't compare)
  if (attackerCards.length !== defenderCards.length) {
    return false;
  }

  // Compare highest cards
  const attackerHighest = getHighestCard(attackerCards);
  const defenderHighest = getHighestCard(defenderCards);

  return compareCards(attackerHighest, defenderHighest) > 0;
}
