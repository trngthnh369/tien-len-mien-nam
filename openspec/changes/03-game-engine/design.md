# Game Engine — Design Document (Chi tiết nhất)

## Module Architecture

```
game/core/
├── types.ts          ← Card, HandType, GameState
├── constants.ts      ← RANK_ORDER, SUIT_ORDER
├── deck.ts           ← createDeck, shuffle, deal
├── hand-evaluator.ts ← validateHand, sortCards
├── game-rules.ts     ← compareHands, canCut
└── game-state.ts     ← initGameState, applyAction
```

## Block Decomposition: validateHand

```
Block 1: Sort cards by rank then suit
Block 2: Check card count
  - 1 → SINGLE
  - 2 → check same rank → PAIR
  - 3 → check same rank → TRIPLE, else check consecutive → STRAIGHT(3)
  - 4 → check same rank → FOUR_OF_KIND, else check straight(4)
  - 5-12 → check straight (no 2s)
  - 6,8 → also check consecutive pairs (no 2s)
Block 3: Return HandType or null
```

## Block Decomposition: compareHands

```
Block 1: Check cross-type cuts (canCut)
  - FOUR_OF_KIND beats SINGLE(2)
  - CONSECUTIVE_PAIRS(3) beats SINGLE(2)
  - CONSECUTIVE_PAIRS(4) beats PAIR(2)
Block 2: Same type only → compare highest card
Block 3: Same length requirement (straights)
Block 4: Compare by rank first, then suit
```

## Block Decomposition: applyAction (game:play)

```
Block 1: Validate turn — state.currentTurn === action.userId
Block 2: Validate card ownership — all cards in player's hand
Block 3: Validate hand — validateHand(cards) !== null
Block 4: Compare with table — compareHands(hand, lastPlayedHand)
Block 5: Remove cards from hand, update cardCount
Block 6: Check if player finished (cards.length === 0)
  - If yes → push to finishedOrder
Block 7: Check if game over (activePlayers <= 1)
  - If yes → status = FINISHED, push last player
Block 8: Advance turn — getNextTurn (skip finished players)
Block 9: Return new state
```

## Block Decomposition: applyAction (game:pass)

```
Block 1: Validate turn
Block 2: Increment passCount
Block 3: Check if all active players passed (passCount >= active - 1)
  - If yes → new round: clear table, lastPlayedBy starts new round
Block 4: Advance turn
Block 5: Return new state
```

## Rank Order (weakest → strongest)

3 < 4 < 5 < 6 < 7 < 8 < 9 < T < J < Q < K < A < 2

## Suit Order (weakest → strongest)

Spade(♠) < Club(♣) < Diamond(♦) < Heart(♥)

## Cut Rules (Chặt)

- Tứ quý (4 of a kind) → chặt con 2 đơn
- Ba đôi thông (3 consecutive pairs) → chặt con 2 đơn
- Bốn đôi thông (4 consecutive pairs) → chặt đôi 2

## Test Coverage

- 53 tests across 4 files: deck, hand-evaluator, game-rules, game-state
