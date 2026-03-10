/**
 * Design tokens extracted from Stitch designs
 * Stitch Project ID: 2960647651702440815
 * Theme: DARK, Font: Plus Jakarta Sans, Roundness: 8px, Primary: #5e19e6
 */

export const colors = {
  bg: {
    primary: '#0a0a0f',
    secondary: '#111118',
    surface: '#1a1a2e',
    surfaceHover: '#222238',
    border: '#2d2d44',
    borderLight: '#3d3d55',
  },
  accent: {
    primary: '#5e19e6',
    primaryHover: '#7033f0',
    primaryMuted: '#5e19e640',
    gold: '#e8d5a3',
    goldDark: '#c4a96b',
  },
  text: {
    primary: '#e2e8f0',
    secondary: '#94a3b8',
    muted: '#64748b',
    inverse: '#0a0a0f',
  },
  status: {
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
    info: '#3b82f6',
  },
  rank: {
    first: '#e8d5a3',
    second: '#94a3b8',
    third: '#cd7f32',
    last: '#ef4444',
  },
  card: {
    face: '#ffffff',
    back: '#1e3a5f',
    backPattern: '#2a4a70',
    redSuit: '#dc2626',
    darkSuit: '#1e293b',
    selected: '#e8d5a3',
  },
} as const;

export const spacing = {
  cardOverlap: 28,
  cardLiftSelected: -16,
  cardHoverLift: -4,
} as const;

export const sizes = {
  card: {
    sm: { width: 40, height: 56 },
    md: { width: 60, height: 84 },
    lg: { width: 80, height: 112 },
  },
  borderRadius: 8,
} as const;

export const EMOJI_REACTIONS = ['😂', '😤', '🤯', '🥳', '😢', '😎', '🫵', '👏'] as const;
