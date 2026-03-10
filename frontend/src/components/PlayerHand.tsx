'use client';

import { useState } from 'react';
import Card from '@/components/Card';

type Suit = 'S' | 'C' | 'D' | 'H';
type Rank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A' | '2';
interface CardData { suit: Suit; rank: Rank }

interface PlayerHandProps {
  cards: CardData[];
  selectedCards: CardData[];
  onCardClick: (card: CardData) => void;
  onPlay: () => void;
  onPass: () => void;
  isMyTurn: boolean;
  canPlay: boolean;
}

/**
 * Player's hand - fan layout with multi-select.
 * "ĐÁNH BÀI" appears when valid hand selected.
 * "BỎ LƯỢT" always visible on your turn.
 */
export default function PlayerHand({
  cards,
  selectedCards,
  onCardClick,
  onPlay,
  onPass,
  isMyTurn,
  canPlay,
}: PlayerHandProps) {
  const isSelected = (card: CardData) =>
    selectedCards.some(c => c.rank === card.rank && c.suit === card.suit);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Hand label */}
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <span>BÀI CỦA BẠN</span>
        <span className="badge badge-playing">{cards.length} lá</span>
      </div>

      {/* Cards fan layout */}
      <div className="flex items-end justify-center">
        {cards.map((card, index) => (
          <div
            key={`${card.rank}${card.suit}`}
            style={{ marginLeft: index === 0 ? 0 : -32 }}
            className="relative"
          >
            <Card
              suit={card.suit}
              rank={card.rank}
              selected={isSelected(card)}
              size="lg"
              onClick={() => isMyTurn && onCardClick(card)}
              animationDelay={index * 30}
            />
          </div>
        ))}
      </div>

      {/* Action buttons */}
      {isMyTurn && (
        <div className="flex gap-3 mt-2">
          <button
            className="btn-gold px-8 py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={onPlay}
            disabled={!canPlay || selectedCards.length === 0}
          >
            ĐÁNH BÀI
          </button>
          <button
            className="btn-outline px-6 py-3 text-base"
            onClick={onPass}
          >
            BỎ LƯỢT
          </button>
        </div>
      )}
    </div>
  );
}
