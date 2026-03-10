import { create } from 'zustand';

interface Card {
  rank: string;
  suit: string;
}

interface PlayerState {
  userId: string;
  username: string;
  seat: number;
  cards: Card[];
  cardCount: number;
}

interface GameState {
  roomId: string;
  status: 'PLAYING' | 'FINISHED';
  currentTurn: string;
  players: PlayerState[];
  lastPlayedCards: Card[];
  lastPlayedBy: string | null;
  passCount: number;
  finishedOrder: string[];
  roundNumber: number;
}

interface GameResult {
  userId: string;
  username: string;
  rank: number;
  cardCount: number;
}

interface GameStoreState {
  gameState: GameState | null;
  myCards: Card[];
  selectedCards: Card[];
  isMyTurn: boolean;
  results: GameResult[];
  error: string | null;

  // Actions
  setGameState: (state: GameState, myUserId: string) => void;
  toggleCard: (card: Card) => void;
  clearSelection: () => void;
  setResults: (results: GameResult[]) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

function cardsEqual(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: null,
  myCards: [],
  selectedCards: [],
  isMyTurn: false,
  results: [],
  error: null,

  setGameState: (state: GameState, myUserId: string) => {
    const myPlayer = state.players.find((p) => p.userId === myUserId);
    set({
      gameState: state,
      myCards: myPlayer?.cards || [],
      isMyTurn: state.currentTurn === myUserId,
      selectedCards: [], // Clear selection on state update
    });
  },

  toggleCard: (card: Card) => {
    const { selectedCards } = get();
    const isSelected = selectedCards.some((c) => cardsEqual(c, card));
    if (isSelected) {
      set({ selectedCards: selectedCards.filter((c) => !cardsEqual(c, card)) });
    } else {
      set({ selectedCards: [...selectedCards, card] });
    }
  },

  clearSelection: () => set({ selectedCards: [] }),

  setResults: (results: GameResult[]) => set({ results }),

  setError: (error: string | null) => set({ error }),

  reset: () =>
    set({
      gameState: null,
      myCards: [],
      selectedCards: [],
      isMyTurn: false,
      results: [],
      error: null,
    }),
}));
