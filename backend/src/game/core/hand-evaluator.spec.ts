import { sortCards, validateHand, getHighestCard } from './hand-evaluator';
import type { Card } from './types';

const c = (rank: string, suit: string): Card =>
  ({ rank, suit } as Card);

describe('HandEvaluator', () => {
  // ==================== sortCards ====================
  describe('sortCards', () => {
    it('should sort by rank ascending then suit ascending', () => {
      const cards = [c('K', 'H'), c('3', 'S'), c('K', 'S'), c('5', 'D')];
      const sorted = sortCards(cards);
      expect(sorted[0]).toEqual(c('3', 'S'));
      expect(sorted[1]).toEqual(c('5', 'D'));
      expect(sorted[2]).toEqual(c('K', 'S'));
      expect(sorted[3]).toEqual(c('K', 'H'));
    });

    it('should not mutate original array', () => {
      const cards = [c('A', 'H'), c('3', 'S')];
      const original = [...cards];
      sortCards(cards);
      expect(cards).toEqual(original);
    });

    it('should handle single card', () => {
      const cards = [c('7', 'D')];
      const sorted = sortCards(cards);
      expect(sorted).toEqual([c('7', 'D')]);
    });

    it('should handle all same rank, sort by suit', () => {
      const cards = [c('5', 'H'), c('5', 'S'), c('5', 'D'), c('5', 'C')];
      const sorted = sortCards(cards);
      expect(sorted[0]).toEqual(c('5', 'S'));
      expect(sorted[1]).toEqual(c('5', 'C'));
      expect(sorted[2]).toEqual(c('5', 'D'));
      expect(sorted[3]).toEqual(c('5', 'H'));
    });
  });

  // ==================== validateHand ====================
  describe('validateHand', () => {
    it('should return null for empty array', () => {
      expect(validateHand([])).toBeNull();
    });

    it('should return null for null/undefined-like input', () => {
      expect(validateHand(null as any)).toBeNull();
    });

    // SINGLE
    it('should detect SINGLE', () => {
      const result = validateHand([c('A', 'H')]);
      expect(result?.type).toBe('SINGLE');
    });

    it('should detect SINGLE 2 (Heo)', () => {
      const result = validateHand([c('2', 'H')]);
      expect(result?.type).toBe('SINGLE');
    });

    it('should detect SINGLE 3 (weakest)', () => {
      const result = validateHand([c('3', 'S')]);
      expect(result?.type).toBe('SINGLE');
    });

    // PAIR
    it('should detect PAIR (same rank)', () => {
      const result = validateHand([c('7', 'S'), c('7', 'H')]);
      expect(result?.type).toBe('PAIR');
    });

    it('should detect PAIR of 2s', () => {
      const result = validateHand([c('2', 'S'), c('2', 'H')]);
      expect(result?.type).toBe('PAIR');
    });

    it('should reject PAIR with different ranks', () => {
      expect(validateHand([c('7', 'S'), c('8', 'H')])).toBeNull();
    });

    // TRIPLE
    it('should detect TRIPLE', () => {
      const result = validateHand([c('J', 'S'), c('J', 'C'), c('J', 'H')]);
      expect(result?.type).toBe('TRIPLE');
    });

    it('should reject 3 cards with mixed ranks', () => {
      expect(validateHand([c('J', 'S'), c('J', 'C'), c('Q', 'H')])).toBeNull();
    });

    // FOUR_OF_KIND (Tứ quý)
    it('should detect FOUR_OF_KIND', () => {
      const result = validateHand([
        c('Q', 'S'), c('Q', 'C'), c('Q', 'D'), c('Q', 'H'),
      ]);
      expect(result?.type).toBe('FOUR_OF_KIND');
    });

    it('should detect FOUR_OF_KIND of 2s', () => {
      const result = validateHand([
        c('2', 'S'), c('2', 'C'), c('2', 'D'), c('2', 'H'),
      ]);
      expect(result?.type).toBe('FOUR_OF_KIND');
    });

    // STRAIGHT (Sảnh)
    it('should detect STRAIGHT of 3', () => {
      const result = validateHand([c('3', 'S'), c('4', 'H'), c('5', 'D')]);
      expect(result?.type).toBe('STRAIGHT');
      if (result?.type === 'STRAIGHT') {
        expect(result.length).toBe(3);
      }
    });

    it('should detect STRAIGHT of 4', () => {
      const result = validateHand([c('T', 'S'), c('J', 'H'), c('Q', 'D'), c('K', 'C')]);
      expect(result?.type).toBe('STRAIGHT');
      if (result?.type === 'STRAIGHT') {
        expect(result.length).toBe(4);
      }
    });

    it('should detect STRAIGHT of 5', () => {
      const result = validateHand([
        c('7', 'S'), c('8', 'H'), c('9', 'D'), c('T', 'C'), c('J', 'S'),
      ]);
      expect(result?.type).toBe('STRAIGHT');
      if (result?.type === 'STRAIGHT') {
        expect(result.length).toBe(5);
      }
    });

    it('should detect long STRAIGHT (T-J-Q-K-A)', () => {
      const result = validateHand([
        c('T', 'S'), c('J', 'H'), c('Q', 'D'), c('K', 'C'), c('A', 'S'),
      ]);
      expect(result?.type).toBe('STRAIGHT');
    });

    it('should reject STRAIGHT containing 2', () => {
      const result = validateHand([c('A', 'S'), c('2', 'H'), c('3', 'D')]);
      expect(result).toBeNull();
    });

    it('should reject non-consecutive cards as STRAIGHT', () => {
      expect(validateHand([c('3', 'S'), c('5', 'H'), c('7', 'D')])).toBeNull();
    });

    it('should reject 5 random cards', () => {
      expect(validateHand([
        c('3', 'S'), c('5', 'H'), c('8', 'D'), c('J', 'C'), c('A', 'S'),
      ])).toBeNull();
    });

    // CONSECUTIVE_PAIRS (Đôi thông)
    it('should detect CONSECUTIVE_PAIRS of 3 pairs (6 cards)', () => {
      const result = validateHand([
        c('5', 'S'), c('5', 'H'),
        c('6', 'S'), c('6', 'H'),
        c('7', 'S'), c('7', 'H'),
      ]);
      expect(result?.type).toBe('CONSECUTIVE_PAIRS');
      if (result?.type === 'CONSECUTIVE_PAIRS') {
        expect(result.pairCount).toBe(3);
      }
    });

    it('should detect CONSECUTIVE_PAIRS of 4 pairs (8 cards)', () => {
      const result = validateHand([
        c('8', 'S'), c('8', 'H'),
        c('9', 'S'), c('9', 'H'),
        c('T', 'S'), c('T', 'H'),
        c('J', 'S'), c('J', 'H'),
      ]);
      expect(result?.type).toBe('CONSECUTIVE_PAIRS');
      if (result?.type === 'CONSECUTIVE_PAIRS') {
        expect(result.pairCount).toBe(4);
      }
    });

    it('should reject CONSECUTIVE_PAIRS containing 2', () => {
      const result = validateHand([
        c('A', 'S'), c('A', 'H'),
        c('2', 'S'), c('2', 'H'),
        c('3', 'S'), c('3', 'H'),
      ]);
      expect(result).toBeNull();
    });

    it('should reject non-consecutive pairs', () => {
      const result = validateHand([
        c('5', 'S'), c('5', 'H'),
        c('7', 'S'), c('7', 'H'),
        c('9', 'S'), c('9', 'H'),
      ]);
      expect(result).toBeNull();
    });

    it('should reject 4 cards that are not pairs + straight', () => {
      // 4 cards: 2 pairs but not consecutive
      const result = validateHand([
        c('5', 'S'), c('5', 'H'),
        c('8', 'S'), c('8', 'H'),
      ]);
      // 4 cards same rank → FOUR_OF_KIND (no), this is 2 pairs
      // This would be rejected as it's not a four of a kind and not 4-length straight
      expect(result).toBeNull();
    });

    it('should reject 10 cards that are not a valid straight', () => {
      // 10 non-consecutive cards
      const result = validateHand([
        c('3', 'S'), c('3', 'H'),
        c('5', 'S'), c('5', 'H'),
        c('7', 'S'), c('7', 'H'),
        c('9', 'S'), c('9', 'H'),
        c('J', 'S'), c('J', 'H'),
      ]);
      expect(result).toBeNull();
    });
  });

  // ==================== getHighestCard ====================
  describe('getHighestCard', () => {
    it('should return highest rank card', () => {
      const cards = [c('3', 'H'), c('A', 'S'), c('K', 'D')];
      const highest = getHighestCard(cards);
      expect(highest).toEqual(c('A', 'S'));
    });

    it('should use suit as tiebreaker (Heart > Diamond)', () => {
      const cards = [c('2', 'D'), c('2', 'H')];
      const highest = getHighestCard(cards);
      expect(highest).toEqual(c('2', 'H'));
    });

    it('should return 2♥ as the absolute strongest card', () => {
      const cards = [c('A', 'H'), c('2', 'H'), c('K', 'H')];
      const highest = getHighestCard(cards);
      expect(highest).toEqual(c('2', 'H'));
    });

    it('should handle single card', () => {
      const cards = [c('7', 'D')];
      const highest = getHighestCard(cards);
      expect(highest).toEqual(c('7', 'D'));
    });

    it('should return 3♠ as the weakest card among all', () => {
      const cards = [c('3', 'S'), c('3', 'C'), c('3', 'D')];
      const highest = getHighestCard(cards);
      expect(highest).toEqual(c('3', 'D'));
      // 3♠ should not be the highest
      expect(highest).not.toEqual(c('3', 'S'));
    });
  });
});
