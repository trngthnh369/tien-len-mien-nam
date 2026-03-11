import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './stores/auth-store';
import { useRoomStore } from './stores/room-store';
import { useGameStore } from './stores/game-store';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

/**
 * Singleton Socket.io manager.
 * Creates namespace connections for /room, /game, /chat.
 * Auto-attaches JWT from auth store.
 */
class SocketManager {
  private roomSocket: Socket | null = null;
  private gameSocket: Socket | null = null;
  private chatSocket: Socket | null = null;

  private getAuth() {
    const token = useAuthStore.getState().accessToken;
    return { token };
  }

  // ========== Room Namespace ==========

  connectRoom(): Socket {
    if (this.roomSocket?.connected) return this.roomSocket;

    this.roomSocket = io(`${SOCKET_URL}/room`, {
      auth: this.getAuth(),
      transports: ['websocket'],
      autoConnect: true,
    });

    // Full state sync — sent when any player joins, everyone gets updated player list with seats
    // IMPORTANT: Preserve isReady state from existing players since server doesn't track it
    this.roomSocket.on('room:sync', (data: { room: any; players: any[] }) => {
      const currentPlayers = useRoomStore.getState().players;
      const mergedPlayers = (data.players || []).map((p: any) => {
        const existing = currentPlayers.find(ep => ep.userId === p.userId);
        return {
          ...p,
          isReady: existing?.isReady ?? false,
        };
      });
      useRoomStore.getState().syncRoomState(data.room, mergedPlayers);
    });

    this.roomSocket.on('room:playerJoined', (data) => {
      // Add system message (player list already updated by room:sync)
      useRoomStore.getState().addMessage({
        userId: 'system',
        username: 'Hệ thống',
        content: `${data.username} đã vào phòng`,
        type: 'system',
        createdAt: new Date().toISOString(),
      });
    });

    this.roomSocket.on('room:playerLeft', (data) => {
      useRoomStore.getState().removePlayer(data.userId);
      useRoomStore.getState().addMessage({
        userId: 'system',
        username: 'Hệ thống',
        content: `${data.username || 'Người chơi'} đã rời phòng`,
        type: 'system',
        createdAt: new Date().toISOString(),
      });
    });

    this.roomSocket.on('room:playerReady', (data: { userId: string; isReady: boolean }) => {
      if (data.isReady) {
        useRoomStore.getState().setPlayerReady(data.userId);
      } else {
        useRoomStore.getState().setPlayerUnready(data.userId);
      }
    });

    this.roomSocket.on('room:gameStarting', () => {
      // Navigation handled by the component
    });

    this.roomSocket.on('room:playerKicked', (data) => {
      const myUser = useAuthStore.getState().user;
      if (myUser && data.userId === myUser.id) {
        useRoomStore.getState().setRoom(null);
      } else {
        useRoomStore.getState().removePlayer(data.userId);
      }
    });

    return this.roomSocket;
  }

  joinRoom(roomCode: string) {
    this.connectRoom();
    this.roomSocket?.emit('room:join', { roomCode });
  }

  readyUp() {
    this.roomSocket?.emit('room:ready');
  }

  startGame() {
    this.roomSocket?.emit('room:start');
  }

  kickPlayer(userId: string) {
    this.roomSocket?.emit('room:kick', { userId });
  }

  // ========== Game Namespace ==========

  connectGame(): Socket {
    if (this.gameSocket?.connected) return this.gameSocket;

    this.gameSocket = io(`${SOCKET_URL}/game`, {
      auth: this.getAuth(),
      transports: ['websocket'],
      autoConnect: true,
    });

    this.gameSocket.on('game:state', (state) => {
      const myUser = useAuthStore.getState().user;
      if (myUser) {
        useGameStore.getState().setGameState(state, myUser.id);
      }
    });

    this.gameSocket.on('game:played', (data) => {
      // UI animation handled by component
    });

    this.gameSocket.on('game:passed', (data) => {
      // UI update handled via game:state
    });

    this.gameSocket.on('game:turnChange', (data) => {
      // Already handled via game:state
    });

    this.gameSocket.on('game:finished', (data) => {
      useGameStore.getState().setResults(data.results);
    });

    this.gameSocket.on('game:error', (data) => {
      useGameStore.getState().setError(data.message);
    });

    return this.gameSocket;
  }

  joinGame(roomId: string) {
    this.connectGame();
    this.gameSocket?.emit('game:join', { roomId });
  }

  playCards(cards: Array<{ rank: string; suit: string }>) {
    this.gameSocket?.emit('game:play', { cards });
  }

  passAction() {
    this.gameSocket?.emit('game:pass');
  }

  reconnectGame(roomId: string) {
    this.connectGame();
    this.gameSocket?.emit('game:reconnect', { roomId });
  }

  // ========== Chat Namespace ==========

  connectChat(): Socket {
    if (this.chatSocket?.connected) return this.chatSocket;

    this.chatSocket = io(`${SOCKET_URL}/chat`, {
      auth: this.getAuth(),
      transports: ['websocket'],
      autoConnect: true,
    });

    this.chatSocket.on('chat:newMessage', (data) => {
      // Skip messages from self (already shown via local echo)
      const myUser = useAuthStore.getState().user;
      if (myUser && data.userId === myUser.id) return;
      
      useRoomStore.getState().addMessage({
        userId: data.userId,
        username: data.username,
        content: data.content,
        type: data.type || 'text',
        createdAt: data.createdAt,
      });
    });

    this.chatSocket.on('chat:emojiReaction', (data) => {
      // Emoji animation handled by component
    });

    return this.chatSocket;
  }

  sendMessage(content: string) {
    this.chatSocket?.emit('chat:message', { content });
  }

  sendEmoji(emojiIndex: number) {
    this.chatSocket?.emit('chat:emoji', { emojiIndex });
  }

  joinChat(roomId: string) {
    this.connectChat();
    this.chatSocket?.emit('chat:join', { roomId });
  }

  // ========== Lifecycle ==========

  connectAll() {
    this.connectRoom();
    this.connectGame();
    this.connectChat();
  }

  disconnectAll() {
    this.roomSocket?.disconnect();
    this.gameSocket?.disconnect();
    this.chatSocket?.disconnect();
    this.roomSocket = null;
    this.gameSocket = null;
    this.chatSocket = null;
  }
}

// Singleton export
export const socketManager = new SocketManager();
