import { compareHands, canCut, compareCards } from './game-rules';
import { validateHand } from './hand-evaluator';
import type { Card, HandType } from './types';

const c = (rank: string, suit: string): Card =>
  ({ rank, suit } as Card);

const hand = (cards: Card[]): HandType => validateHand(cards)!;

describe('GameRules', () => {
  // ==================== compareCards ====================
  describe('compareCards', () => {
    it('higher rank wins', () => {
      expect(compareCards(c('A', 'S'), c('K', 'H'))).toBeGreaterThan(0);
    });

    it('same rank: higher suit wins', () => {
      expect(compareCards(c('7', 'H'), c('7', 'S'))).toBeGreaterThan(0);
    });

    it('2 beats everything except cuts', () => {
      expect(compareCards(c('2', 'S'), c('A', 'H'))).toBeGreaterThan(0);
    });

    it('equal cards return 0', () => {
      expect(compareCards(c('5', 'H'), c('5', 'H'))).toBe(0);
    });

    it('3 is the weakest rank', () => {
      expect(compareCards(c('3', 'H'), c('4', 'S'))).toBeLessThan(0);
    });

    it('suit order: S < C < D < H', () => {
      expect(compareCards(c('7', 'S'), c('7', 'C'))).toBeLessThan(0);
      expect(compareCards(c('7', 'C'), c('7', 'D'))).toBeLessThan(0);
      expect(compareCards(c('7', 'D'), c('7', 'H'))).toBeLessThan(0);
    });
  });

  // ==================== compareHands ====================
  describe('compareHands', () => {
    // SINGLE vs SINGLE
    it('higher single beats lower', () => {
      const attacker = hand([c('K', 'H')]);
      const defender = hand([c('J', 'H')]);
      expect(compareHands(attacker, defender)).toBe(true);
    });

    it('same rank: higher suit wins', () => {
      const attacker = hand([c('A', 'H')]);
      const defender = hand([c('A', 'D')]);
      expect(compareHands(attacker, defender)).toBe(true);
    });

    it('lower single cannot beat higher', () => {
      const attacker = hand([c('3', 'S')]);
      const defender = hand([c('A', 'H')]);
      expect(compareHands(attacker, defender)).toBe(false);
    });

    // PAIR vs PAIR
    it('higher pair beats lower pair', () => {
      const attacker = hand([c('Q', 'S'), c('Q', 'H')]);
      const defender = hand([c('J', 'S'), c('J', 'H')]);
      expect(compareHands(attacker, defender)).toBe(true);
    });

    it('lower pair cannot beat higher pair', () => {
      const attacker = hand([c('5', 'S'), c('5', 'H')]);
      const defender = hand([c('K', 'S'), c('K', 'H')]);
      expect(compareHands(attacker, defender)).toBe(false);
    });

    it('pair of same rank: higher suit pair wins', () => {
      const attacker = hand([c('7', 'D'), c('7', 'H')]);
      const defender = hand([c('7', 'S'), c('7', 'C')]);
      expect(compareHands(attacker, defender)).toBe(true);
    });

    // Can't beat different type normally
    it('pair cannot beat single normally', () => {
      const attacker = hand([c('3', 'S'), c('3', 'H')]);
      const defender = hand([c('A', 'H')]);
      expect(compareHands(attacker, defender)).toBe(false);
    });

    it('single cannot beat pair normally', () => {
      const attacker = hand([c('A', 'H')]);
      const defender = hand([c('3', 'S'), c('3', 'H')]);
      expect(compareHands(attacker, defender)).toBe(false);
    });

    // TRIPLE vs TRIPLE
    it('higher triple beats lower triple', () => {
      const attacker = hand([c('K', 'S'), c('K', 'C'), c('K', 'H')]);
      const defender = hand([c('J', 'S'), c('J', 'C'), c('J', 'H')]);
      expect(compareHands(attacker, defender)).toBe(true);
    });

    it('lower triple cannot beat higher triple', () => {
      const attacker = hand([c('5', 'S'), c('5', 'C'), c('5', 'H')]);
      const defender = hand([c('9', 'S'), c('9', 'C'), c('9', 'H')]);
      expect(compareHands(attacker, defender)).toBe(false);
    });

    // STRAIGHT vs STRAIGHT
    it('higher straight of same length beats lower', () => {
      const attacker = hand([c('8', 'S'), c('9', 'H'), c('T', 'D')]);
      const defender = hand([c('5', 'S'), c('6', 'H'), c('7', 'D')]);
      expect(compareHands(attacker, defender)).toBe(true);
    });

    it('straight of different length cannot compare', () => {
      const attacker = hand([c('8', 'S'), c('9', 'H'), c('T', 'D'), c('J', 'C')]);
      const defender = hand([c('5', 'S'), c('6', 'H'), c('7', 'D')]);
      expect(compareHands(attacker, defender)).toBe(false);
    });

    // CONSECUTIVE PAIRS vs CONSECUTIVE PAIRS
    it('higher consecutive pairs beats lower (same pair count)', () => {
      const attacker = hand([
        c('8', 'S'), c('8', 'H'),
        c('9', 'S'), c('9', 'H'),
        c('T', 'S'), c('T', 'H'),
      ]);
      const defender = hand([
        c('5', 'S'), c('5', 'H'),
        c('6', 'S'), c('6', 'H'),
        c('7', 'S'), c('7', 'H'),
      ]);
      expect(compareHands(attacker, defender)).toBe(true);
    });

    it('lower consecutive pairs cannot beat higher', () => {
      const attacker = hand([
        c('3', 'S'), c('3', 'H'),
        c('4', 'S'), c('4', 'H'),
        c('5', 'S'), c('5', 'H'),
      ]);
      const defender = hand([
        c('8', 'S'), c('8', 'H'),
        c('9', 'S'), c('9', 'H'),
        c('T', 'S'), c('T', 'H'),
      ]);
      expect(compareHands(attacker, defender)).toBe(false);
    });

    it('3 consecutive pairs cannot beat 4 consecutive pairs', () => {
      const attacker = hand([
        c('T', 'S'), c('T', 'H'),
        c('J', 'S'), c('J', 'H'),
        c('Q', 'S'), c('Q', 'H'),
      ]);
      const defender = hand([
        c('3', 'S'), c('3', 'H'),
        c('4', 'S'), c('4', 'H'),
        c('5', 'S'), c('5', 'H'),
        c('6', 'S'), c('6', 'H'),
      ]);
      expect(compareHands(attacker, defender)).toBe(false);
    });

    // FOUR_OF_KIND vs FOUR_OF_KIND
    it('higher four of a kind beats lower', () => {
      const attacker = hand([c('K', 'S'), c('K', 'C'), c('K', 'D'), c('K', 'H')]);
      const defender = hand([c('5', 'S'), c('5', 'C'), c('5', 'D'), c('5', 'H')]);
      expect(compareHands(attacker, defender)).toBe(true);
    });
  });

  // ==================== canCut (chặt) ====================
  describe('canCut (chặt)', () => {
    it('Four of a Kind cuts Single 2', () => {
      const attacker = hand([c('5', 'S'), c('5', 'C'), c('5', 'D'), c('5', 'H')]);
      const defender = hand([c('2', 'H')]);
      expect(canCut(attacker, defender)).toBe(true);
    });

    it('3 Consecutive Pairs cuts Single 2', () => {
      const attacker = hand([
        c('5', 'S'), c('5', 'H'),
        c('6', 'S'), c('6', 'H'),
        c('7', 'S'), c('7', 'H'),
      ]);
      const defender = hand([c('2', 'H')]);
      expect(canCut(attacker, defender)).toBe(true);
    });

    it('4 Consecutive Pairs cuts Pair of 2s', () => {
      const attacker = hand([
        c('8', 'S'), c('8', 'H'),
        c('9', 'S'), c('9', 'H'),
        c('T', 'S'), c('T', 'H'),
        c('J', 'S'), c('J', 'H'),
      ]);
      const defender = hand([c('2', 'S'), c('2', 'H')]);
      expect(canCut(attacker, defender)).toBe(true);
    });

    it('3 Consecutive Pairs cannot cut Pair of 2s', () => {
      const attacker = hand([
        c('5', 'S'), c('5', 'H'),
        c('6', 'S'), c('6', 'H'),
        c('7', 'S'), c('7', 'H'),
      ]);
      const defender = hand([c('2', 'S'), c('2', 'H')]);
      expect(canCut(attacker, defender)).toBe(false);
    });

    it('Four of a Kind does not cut non-2 single', () => {
      const attacker = hand([c('5', 'S'), c('5', 'C'), c('5', 'D'), c('5', 'H')]);
      const defender = hand([c('A', 'H')]);
      expect(canCut(attacker, defender)).toBe(false);
    });

    it('Four of a Kind does not cut Pair (non-2)', () => {
      const attacker = hand([c('5', 'S'), c('5', 'C'), c('5', 'D'), c('5', 'H')]);
      const defender = hand([c('A', 'S'), c('A', 'H')]);
      expect(canCut(attacker, defender)).toBe(false);
    });

    it('Pair cannot cut anything', () => {
      const attacker = hand([c('A', 'S'), c('A', 'H')]);
      const defender = hand([c('2', 'S')]);
      expect(canCut(attacker, defender)).toBe(false);
    });

    it('Single cannot cut anything', () => {
      const attacker = hand([c('A', 'H')]);
      const defender = hand([c('2', 'S')]);
      expect(canCut(attacker, defender)).toBe(false);
    });

    it('Four of 2s via compareHands should beat lower Four of a Kind', () => {
      const attacker = hand([c('2', 'S'), c('2', 'C'), c('2', 'D'), c('2', 'H')]);
      const defender = hand([c('A', 'S'), c('A', 'C'), c('A', 'D'), c('A', 'H')]);
      expect(compareHands(attacker, defender)).toBe(true);
    });
  });
});
