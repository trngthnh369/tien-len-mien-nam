# Change Proposal: Game Engine

## Summary

Pure TypeScript game engine for Tiến Lên Miền Nam. Zero I/O dependencies.

## Files to Create

- `backend/src/game/core/types.ts`
- `backend/src/game/core/constants.ts`
- `backend/src/game/core/deck.ts`
- `backend/src/game/core/hand-evaluator.ts`
- `backend/src/game/core/game-rules.ts`
- `backend/src/game/core/game-state.ts`

## Operations

1. **validateHand** — Classify: Single, Pair, Triple, FourOfAKind, Straight, ConsecutivePairs
2. **compareHands** — Compare attack vs defense, handle cuts
3. **canCut** — FourOfAKind cuts Single 2, ConsecutivePairs cuts Single 2 / Pair 2
4. **sortCards** — Sort by rank then suit
5. **initGameState** — Create 52-card deck, deal 13 each, find 3♠ holder
6. **applyAction** — Process PLAY/PASS actions
7. **getNextTurn** — Skip finished players
8. **finalizeGame** — Lock rankings, prepare persist data

## Rank Order

3 < 4 < 5 < 6 < 7 < 8 < 9 < T < J < Q < K < A < 2

## Suit Order

Spade(♠) < Club(♣) < Diamond(♦) < Heart(♥)
