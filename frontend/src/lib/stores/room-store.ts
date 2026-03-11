import { create } from 'zustand';
import { useAuthStore } from './auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Player {
  userId: string;
  username: string;
  seat: number;
  isHost: boolean;
  isReady?: boolean;
}

interface Message {
  userId: string;
  username: string;
  content: string;
  type: 'text' | 'system';
  createdAt: string;
}

interface Room {
  id: string;
  roomCode: string;
  roomName: string;
  hostId: string;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  playerCount: number;
}

interface RoomState {
  room: Room | null;
  players: Player[];
  messages: Message[];
  roomList: Room[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchRoomList: () => Promise<void>;
  createRoom: (roomName?: string) => Promise<string | null>;
  joinRoom: (roomCode: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  getRoomDetail: (roomCode: string) => Promise<void>;
  addMessage: (msg: Message) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (userId: string) => void;
  setPlayerReady: (userId: string) => void;
  setPlayerUnready: (userId: string) => void;
  setRoom: (room: Room | null) => void;
  setPlayers: (players: Player[]) => void;
  syncRoomState: (room: Room, players: Player[]) => void;
  setError: (error: string | null) => void;
}

function getHeaders() {
  const token = useAuthStore.getState().accessToken;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const useRoomStore = create<RoomState>((set, get) => ({
  room: null,
  players: [],
  messages: [],
  roomList: [],
  isLoading: false,
  error: null,

  fetchRoomList: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/rooms`, { headers: getHeaders() });
      const data = await res.json();
      set({ roomList: data, isLoading: false });
    } catch {
      set({ error: 'Không thể tải danh sách phòng', isLoading: false });
    }
  },

  createRoom: async (roomName?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ roomName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      set({ isLoading: false });
      return data.roomCode;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return null;
    }
  },

  joinRoom: async (roomCode: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/rooms/join`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ roomCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      set({
        room: data,
        players: data.players,
        isLoading: false,
      });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  leaveRoom: async () => {
    const room = get().room;
    if (!room) return;
    try {
      await fetch(`${API_URL}/rooms/${room.id}/leave`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
    } catch {}
    set({ room: null, players: [], messages: [] });
  },

  getRoomDetail: async (roomCode: string) => {
    try {
      const res = await fetch(`${API_URL}/rooms/${roomCode}`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        // Preserve isReady state from existing players (REST doesn't return isReady)
        const currentPlayers = get().players;
        const mergedPlayers = (data.players || []).map((p: any) => {
          const existing = currentPlayers.find(ep => ep.userId === p.userId);
          return {
            ...p,
            isReady: existing?.isReady ?? false,
          };
        });
        set({ room: data, players: mergedPlayers });
      }
    } catch {}
  },

  addMessage: (msg: Message) =>
    set((s) => ({ messages: [...s.messages, msg].slice(-100) })),

  addPlayer: (player: Player) =>
    set((s) => ({
      players: [...s.players.filter((p) => p.userId !== player.userId), player],
    })),

  removePlayer: (userId: string) =>
    set((s) => ({ players: s.players.filter((p) => p.userId !== userId) })),

  setPlayerReady: (userId: string) =>
    set((s) => ({
      players: s.players.map((p) =>
        p.userId === userId ? { ...p, isReady: true } : p,
      ),
    })),

  setPlayerUnready: (userId: string) =>
    set((s) => ({
      players: s.players.map((p) =>
        p.userId === userId ? { ...p, isReady: false } : p,
      ),
    })),

  setRoom: (room: Room | null) => set({ room }),
  setPlayers: (players: Player[]) => set({ players }),
  syncRoomState: (room: Room, players: Player[]) => set({ room, players }),
  setError: (error: string | null) => set({ error }),
}));
