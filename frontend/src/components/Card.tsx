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

const SUIT_COLORS: Record<Suit, { main: string; light: string; dark: string }> = {
  S: { main: '#1a1a2e', light: '#2d2d4a', dark: '#000000' },
  C: { main: '#1a1a2e', light: '#2d2d4a', dark: '#000000' },
  D: { main: '#dc2626', light: '#ef4444', dark: '#991b1b' },
  H: { main: '#dc2626', light: '#ef4444', dark: '#991b1b' },
};

const RANK_DISPLAY: Record<Rank, string> = {
  '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
  '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q',
  'K': 'K', 'A': 'A', '2': '2',
};

// Face card emoji decorations
const FACE_ICONS: Record<string, string> = {
  'J': '🤴',
  'Q': '👸',
  'K': '🤴',
  'A': '⭐',
  '2': '💎',
};

const SIZE_CONFIG = {
  sm: { w: 48, h: 68, font: 10, suitFont: 8, pipFont: 12, cornerR: 4, padding: 2 },
  md: { w: 72, h: 100, font: 14, suitFont: 11, pipFont: 16, cornerR: 6, padding: 3 },
  lg: { w: 90, h: 126, font: 18, suitFont: 14, pipFont: 20, cornerR: 8, padding: 4 },
};

/**
 * Pip layout positions for each rank (percentage-based).
 * Standard playing card pip arrangements.
 */
function getPipPositions(rank: Rank): Array<{ x: number; y: number; rotate?: boolean }> {
  switch (rank) {
    case '3': return [
      { x: 50, y: 20 },
      { x: 50, y: 50 },
      { x: 50, y: 80, rotate: true },
    ];
    case '4': return [
      { x: 30, y: 20 }, { x: 70, y: 20 },
      { x: 30, y: 80, rotate: true }, { x: 70, y: 80, rotate: true },
    ];
    case '5': return [
      { x: 30, y: 20 }, { x: 70, y: 20 },
      { x: 50, y: 50 },
      { x: 30, y: 80, rotate: true }, { x: 70, y: 80, rotate: true },
    ];
    case '6': return [
      { x: 30, y: 20 }, { x: 70, y: 20 },
      { x: 30, y: 50 }, { x: 70, y: 50 },
      { x: 30, y: 80, rotate: true }, { x: 70, y: 80, rotate: true },
    ];
    case '7': return [
      { x: 30, y: 20 }, { x: 70, y: 20 },
      { x: 50, y: 35 },
      { x: 30, y: 50 }, { x: 70, y: 50 },
      { x: 30, y: 80, rotate: true }, { x: 70, y: 80, rotate: true },
    ];
    case '8': return [
      { x: 30, y: 20 }, { x: 70, y: 20 },
      { x: 50, y: 35 },
      { x: 30, y: 50 }, { x: 70, y: 50 },
      { x: 50, y: 65, rotate: true },
      { x: 30, y: 80, rotate: true }, { x: 70, y: 80, rotate: true },
    ];
    case '9': return [
      { x: 30, y: 18 }, { x: 70, y: 18 },
      { x: 30, y: 38 }, { x: 70, y: 38 },
      { x: 50, y: 50 },
      { x: 30, y: 62, rotate: true }, { x: 70, y: 62, rotate: true },
      { x: 30, y: 82, rotate: true }, { x: 70, y: 82, rotate: true },
    ];
    case 'T': return [
      { x: 30, y: 18 }, { x: 70, y: 18 },
      { x: 50, y: 30 },
      { x: 30, y: 38 }, { x: 70, y: 38 },
      { x: 30, y: 62, rotate: true }, { x: 70, y: 62, rotate: true },
      { x: 50, y: 70, rotate: true },
      { x: 30, y: 82, rotate: true }, { x: 70, y: 82, rotate: true },
    ];
    default: return []; // Face cards (J, Q, K, A, 2) use center icon
  }
}

/**
 * Premium playing card component.
 * Features: realistic pip layouts, gradient backgrounds, 3D effects,
 * face card illustrations, inner border, premium shadows.
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
  const config = SIZE_CONFIG[size];
  const isRed = suit === 'H' || suit === 'D';
  const colors = SUIT_COLORS[suit];
  const isFace = ['J', 'Q', 'K'].includes(rank);
  const isAceOrTwo = rank === 'A' || rank === '2';
  const pips = getPipPositions(rank);

  // Card back (face down)
  if (faceDown) {
    return (
      <div
        className={`relative select-none cursor-pointer transition-all duration-200 ease-out ${selected ? '-translate-y-4' : 'hover:-translate-y-1'} ${className}`}
        onClick={onClick}
        style={{
          width: config.w,
          height: config.h,
          borderRadius: config.cornerR,
          animationDelay: `${animationDelay}ms`,
          background: 'linear-gradient(135deg, #1a2744 0%, #0f1a2e 50%, #1a2744 100%)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
          border: '1px solid #2a3a55',
        }}
      >
        {/* Inner decorative border */}
        <div
          className="absolute"
          style={{
            inset: 3,
            borderRadius: config.cornerR - 2,
            border: '1px solid #2a3a55',
            background: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 3px,
              rgba(42, 58, 85, 0.3) 3px,
              rgba(42, 58, 85, 0.3) 6px
            )`,
          }}
        />
        {/* Center emblem */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            style={{
              width: config.w * 0.35,
              height: config.w * 0.35,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #e8d5a3 0%, #c4a46f 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }}
          >
            <span style={{ fontSize: config.pipFont * 0.8, filter: 'brightness(0.6)' }}>♠</span>
          </div>
        </div>
      </div>
    );
  }

  // Face-up card
  return (
    <div
      className={`relative select-none cursor-pointer transition-all duration-200 ease-out ${selected ? '-translate-y-4' : 'hover:-translate-y-1'} ${className}`}
      onClick={onClick}
      style={{
        width: config.w,
        height: config.h,
        borderRadius: config.cornerR,
        animationDelay: `${animationDelay}ms`,
        background: isFace
          ? `linear-gradient(180deg, #fffdf7 0%, #f5f0e8 100%)`
          : `linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)`,
        boxShadow: selected
          ? '0 8px 24px rgba(232, 213, 163, 0.4), 0 0 0 2px #e8d5a3, inset 0 1px 0 rgba(255,255,255,0.8)'
          : '0 2px 6px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
        border: selected ? '2px solid #e8d5a3' : '1px solid #d1d5db',
      }}
    >
      {/* Top-left corner: rank + suit */}
      <div
        style={{
          position: 'absolute',
          top: config.padding,
          left: config.padding + 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          lineHeight: 1,
          color: colors.main,
        }}
      >
        <span style={{
          fontSize: config.font,
          fontWeight: 800,
          fontFamily: "'Georgia', 'Times New Roman', serif",
        }}>
          {RANK_DISPLAY[rank]}
        </span>
        <span style={{ fontSize: config.suitFont, marginTop: -1 }}>
          {SUIT_SYMBOLS[suit]}
        </span>
      </div>

      {/* Bottom-right corner: rank + suit (rotated) */}
      <div
        style={{
          position: 'absolute',
          bottom: config.padding,
          right: config.padding + 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          lineHeight: 1,
          transform: 'rotate(180deg)',
          color: colors.main,
        }}
      >
        <span style={{
          fontSize: config.font,
          fontWeight: 800,
          fontFamily: "'Georgia', 'Times New Roman', serif",
        }}>
          {RANK_DISPLAY[rank]}
        </span>
        <span style={{ fontSize: config.suitFont, marginTop: -1 }}>
          {SUIT_SYMBOLS[suit]}
        </span>
      </div>

      {/* Center content */}
      <div className="absolute" style={{ inset: 0 }}>
        {/* Number cards: pip layout */}
        {pips.length > 0 && (
          <div className="absolute" style={{
            top: config.h * 0.12,
            bottom: config.h * 0.12,
            left: config.w * 0.15,
            right: config.w * 0.15,
          }}>
            {pips.map((pip, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${pip.x}%`,
                  top: `${pip.y}%`,
                  transform: `translate(-50%, -50%)${pip.rotate ? ' rotate(180deg)' : ''}`,
                  fontSize: config.pipFont,
                  color: colors.main,
                  lineHeight: 1,
                }}
              >
                {SUIT_SYMBOLS[suit]}
              </span>
            ))}
          </div>
        )}

        {/* Face cards: J, Q, K */}
        {isFace && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div style={{
              width: config.w * 0.55,
              height: config.h * 0.5,
              borderRadius: config.cornerR - 2,
              background: rank === 'K'
                ? `linear-gradient(180deg, ${isRed ? '#fef3c7' : '#e0e7ff'} 0%, ${isRed ? '#fcd34d' : '#a5b4fc'} 100%)`
                : rank === 'Q'
                ? `linear-gradient(180deg, ${isRed ? '#fce7f3' : '#dbeafe'} 0%, ${isRed ? '#f9a8d4' : '#93c5fd'} 100%)`
                : `linear-gradient(180deg, ${isRed ? '#fee2e2' : '#e2e8f0'} 0%, ${isRed ? '#fca5a5' : '#94a3b8'} 100%)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${isRed ? 'rgba(220,38,38,0.2)' : 'rgba(26,26,46,0.15)'}`,
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5)',
            }}>
              <span style={{ fontSize: config.pipFont * 1.5, lineHeight: 1 }}>
                {FACE_ICONS[rank]}
              </span>
              <span style={{
                fontSize: config.suitFont * 0.9,
                color: colors.main,
                marginTop: 2,
                fontWeight: 600,
              }}>
                {SUIT_SYMBOLS[suit]}
              </span>
            </div>
          </div>
        )}

        {/* Ace: large centered suit with decorative ring */}
        {rank === 'A' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div style={{
              width: config.w * 0.5,
              height: config.w * 0.5,
              borderRadius: '50%',
              border: `2px solid ${colors.light}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `radial-gradient(circle, ${isRed ? 'rgba(220,38,38,0.05)' : 'rgba(26,26,46,0.05)'} 0%, transparent 70%)`,
            }}>
              <span style={{
                fontSize: config.pipFont * 1.8,
                color: colors.main,
                lineHeight: 1,
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))',
              }}>
                {SUIT_SYMBOLS[suit]}
              </span>
            </div>
          </div>
        )}

        {/* 2 (Heo): large centered suit with golden ring */}
        {rank === '2' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div style={{
              width: config.w * 0.52,
              height: config.w * 0.52,
              borderRadius: '50%',
              border: '2px solid #e8d5a3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `radial-gradient(circle, rgba(232,213,163,0.15) 0%, transparent 70%)`,
              boxShadow: '0 0 8px rgba(232,213,163,0.2)',
            }}>
              <span style={{
                fontSize: config.pipFont * 1.8,
                color: colors.main,
                lineHeight: 1,
                filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))',
              }}>
                {SUIT_SYMBOLS[suit]}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Subtle inner highlight for premium feel */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 0,
          borderRadius: config.cornerR,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 40%)',
        }}
      />
    </div>
  );
}
