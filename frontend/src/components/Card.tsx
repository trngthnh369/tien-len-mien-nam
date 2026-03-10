'use client';

import { useMemo } from 'react';

type Suit = 'S' | 'C' | 'D' | 'H';
type Rank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A' | '2';

interface CardProps {
  suit: Suit;
  rank: Rank;
  faceDown?: boolean;
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  animationDelay?: number;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  S: '♠', C: '♣', D: '♦', H: '♥',
};

const RANK_DISPLAY: Record<Rank, string> = {
  '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
  '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q',
  'K': 'K', 'A': 'A', '2': '2',
};

const SIZE_CLASSES = {
  sm: 'w-[40px] h-[56px] text-[10px]',
  md: 'w-[60px] h-[84px] text-[14px]',
  lg: 'w-[80px] h-[112px] text-[18px]',
};

/**
 * Playing card component matching Stitch design.
 * - Face-up: white bg, rank top-left + bottom-right (rotated 180°)
 * - Face-down: dark navy with subtle pattern
 * - Selected: lift up 16px + gold border + glow
 * - Hover: lift up 4px
 */
export default function Card({
  suit,
  rank,
  faceDown = false,
  selected = false,
  size = 'md',
  onClick,
  className = '',
  animationDelay = 0,
}: CardProps) {
  const isRed = suit === 'H' || suit === 'D';
  const suitColor = isRed ? 'text-[#dc2626]' : 'text-[#1e293b]';

  const sizeClass = SIZE_CLASSES[size];

  const cardClasses = useMemo(() => {
    const classes = [
      'playing-card',
      sizeClass,
      'rounded-lg relative flex flex-col justify-between select-none cursor-pointer',
      'transition-all duration-150 ease-out',
    ];

    if (faceDown) {
      classes.push('bg-[#1e3a5f] border border-[#2a4a70]');
    } else {
      classes.push('bg-white border border-[#e2e8f0]');
    }

    if (selected) {
      classes.push('-translate-y-4 border-2 !border-[#e8d5a3] shadow-[0_0_12px_#e8d5a3,0_0_4px_#e8d5a3]');
    } else {
      classes.push('hover:-translate-y-1');
    }

    return classes.join(' ');
  }, [faceDown, selected, sizeClass]);

  if (faceDown) {
    return (
      <div
        className={`${cardClasses} ${className}`}
        onClick={onClick}
        style={{ animationDelay: `${animationDelay}ms` }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[#2a4a70] opacity-50 text-xl">♠</span>
        </div>
        {/* Diamond pattern overlay */}
        <div className="absolute inset-1 border border-[#2a4a70] rounded opacity-30" />
      </div>
    );
  }

  return (
    <div
      className={`${cardClasses} ${className} p-1`}
      onClick={onClick}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Top-left: rank + suit */}
      <div className={`flex flex-col items-start leading-none ${suitColor}`}>
        <span className="font-bold">{RANK_DISPLAY[rank]}</span>
        <span className="text-[0.8em]">{SUIT_SYMBOLS[suit]}</span>
      </div>

      {/* Center suit (large) */}
      <div className={`absolute inset-0 flex items-center justify-center ${suitColor}`}>
        <span className="text-[1.8em] opacity-80">{SUIT_SYMBOLS[suit]}</span>
      </div>

      {/* Bottom-right: rank + suit (rotated 180°) */}
      <div className={`flex flex-col items-end leading-none rotate-180 ${suitColor}`}>
        <span className="font-bold">{RANK_DISPLAY[rank]}</span>
        <span className="text-[0.8em]">{SUIT_SYMBOLS[suit]}</span>
      </div>
    </div>
  );
}
