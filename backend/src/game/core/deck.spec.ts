import {
  createDeck,
  shuffleDeck,
  dealCards,
  findStartingPlayer,
  cardToString,
  stringToCard,
} from './deck';

describe('DeckModule', () => {
  // ==================== createDeck ====================
  describe('createDeck', () => {
    it('should create a standard 52-card deck', () => {
      const deck = createDeck();
      expect(deck).toHaveLength(52);
    });

    it('should have 13 cards per suit', () => {
      const deck = createDeck();
      const suits = ['S', 'C', 'D', 'H'];
      for (const suit of suits) {
        const count = deck.filter((c) => c.suit === suit).length;
        expect(count).toBe(13);
      }
    });

    it('should have 4 cards per rank', () => {
      const deck = createDeck();
      const ranks = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];
      for (const rank of ranks) {
        const count = deck.filter((c) => c.rank === rank).length;
        expect(count).toBe(4);
      }
    });

    it('should have no duplicate cards', () => {
      const deck = createDeck();
      const strings = deck.map(cardToString);
      const unique = new Set(strings);
      expect(unique.size).toBe(52);
    });
  });

  // ==================== shuffleDeck ====================
  describe('shuffleDeck', () => {
    it('should return same length deck', () => {
      const deck = createDeck();
      const shuffled = shuffleDeck([...deck]);
      expect(shuffled).toHaveLength(52);
    });

    it('should likely change order of cards', () => {
      const deck1 = createDeck();
      const deck2 = shuffleDeck(createDeck());
      // It's statistically near-impossible for them to be identical
      const same = deck1.every(
        (c, i) => c.rank === deck2[i].rank && c.suit === deck2[i].suit,
      );
      expect(same).toBe(false);
    });

    it('should preserve all 52 unique cards', () => {
      const shuffled = shuffleDeck(createDeck());
      const strings = shuffled.map(cardToString);
      const unique = new Set(strings);
      expect(unique.size).toBe(52);
    });
  });

  // ==================== dealCards ====================
  describe('dealCards', () => {
    it('should deal 13 cards to each of 4 players', () => {
      const hands = dealCards(4);
      expect(hands).toHaveLength(4);
      for (const hand of hands) {
        expect(hand).toHaveLength(13);
      }
    });

    it('should deal all 52 unique cards', () => {
      const hands = dealCards(4);
      const allCards = hands.flat();
      expect(allCards).toHaveLength(52);
      const strings = allCards.map(cardToString);
      const unique = new Set(strings);
      expect(unique.size).toBe(52);
    });

    it('should deal 26 cards each for 2 players', () => {
      const hands = dealCards(2);
      expect(hands).toHaveLength(2);
      expect(hands[0]).toHaveLength(26);
      expect(hands[1]).toHaveLength(26);
    });

    it('should deal to 3 players (17+17+18 or similar)', () => {
      const hands = dealCards(3);
      expect(hands).toHaveLength(3);
      const total = hands[0].length + hands[1].length + hands[2].length;
      expect(total).toBe(52);
      // Each player should have 17 or 18 cards
      for (const hand of hands) {
        expect(hand.length).toBeGreaterThanOrEqual(17);
        expect(hand.length).toBeLessThanOrEqual(18);
      }
    });

    it('should deal different hands each time (shuffled)', () => {
      const hands1 = dealCards(4);
      const hands2 = dealCards(4);
      // At least one hand should differ
      const allSame = hands1.every((hand, i) =>
        hand.every((c, j) =>
          c.rank === hands2[i][j].rank && c.suit === hands2[i][j].suit,
        ),
      );
      expect(allSame).toBe(false);
    });
  });

  // ==================== findStartingPlayer ====================
  describe('findStartingPlayer', () => {
    it('should find the player with 3♠', () => {
      const hands = dealCards(4);
      const startIdx = findStartingPlayer(hands);
      expect(startIdx).toBeGreaterThanOrEqual(0);
      expect(startIdx).toBeLessThan(4);
      // Verify the player actually has 3♠
      const hasThreeOfSpades = hands[startIdx].some(
        (c) => c.rank === '3' && c.suit === 'S',
      );
      expect(hasThreeOfSpades).toBe(true);
    });

    it('should return -1 if no player has 3♠ (edge case)', () => {
      const hands = [
        [{ rank: '5' as const, suit: 'H' as const }],
        [{ rank: '6' as const, suit: 'D' as const }],
      ];
      expect(findStartingPlayer(hands)).toBe(-1);
    });

    it('should always find exactly one player with 3♠ in a 4-player deal', () => {
      const hands = dealCards(4);
      let count = 0;
      for (const hand of hands) {
        if (hand.some((c) => c.rank === '3' && c.suit === 'S')) {
          count++;
        }
      }
      expect(count).toBe(1);
    });
  });

  // ==================== cardToString / stringToCard ====================
  describe('cardToString / stringToCard', () => {
    it('should serialize and deserialize correctly', () => {
      const card = { suit: 'H' as const, rank: 'A' as const };
      const str = cardToString(card);
      expect(str).toBe('AH');
      const parsed = stringToCard(str);
      expect(parsed).toEqual(card);
    });

    it('should throw for invalid strings', () => {
      expect(() => stringToCard('XX')).toThrow();
      expect(() => stringToCard('A')).toThrow();
    });

    it('should handle all ranks correctly', () => {
      const ranks = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'] as const;
      for (const rank of ranks) {
        const card = { rank, suit: 'S' as const };
        const str = cardToString(card);
        expect(str).toBe(`${rank}S`);
        expect(stringToCard(str)).toEqual(card);
      }
    });

    it('should handle all suits correctly', () => {
      const suits = ['S', 'C', 'D', 'H'] as const;
      for (const suit of suits) {
        const card = { rank: '7' as const, suit };
        const str = cardToString(card);
        expect(str).toBe(`7${suit}`);
        expect(stringToCard(str)).toEqual(card);
      }
    });

    it('should throw for 3-char string', () => {
      expect(() => stringToCard('10H')).toThrow();
    });
  });
});
