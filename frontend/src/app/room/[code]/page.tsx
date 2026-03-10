'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRoomStore } from '@/lib/stores/room-store';
import { socketManager } from '@/lib/socket';

/**
 * Waiting Room — Socket.io + REST fallback for robust sync.
 * Real-time: chat, player join/leave, ready, start game.
 */

const EMOJIS = ['😂', '😤', '🤯', '🥳', '😢', '😎', '🫵', '👏'];

const seatPositions = [
  'col-start-2 row-start-1',
  'col-start-1 row-start-2',
  'col-start-3 row-start-2',
  'col-start-2 row-start-3',
];

export default function WaitingRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { room, players, messages, isLoading, getRoomDetail, leaveRoom, addMessage } = useRoomStore();

  const [chatInput, setChatInput] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const socketInitialized = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => { setMounted(true); }, []);

  // Auth guard
  useEffect(() => {
    if (mounted && !isAuthenticated) router.push('/auth');
  }, [mounted, isAuthenticated, router]);

  // Refresh room detail from REST (used as backup sync mechanism)
  const refreshRoom = useCallback(() => {
    if (code) getRoomDetail(code);
  }, [code, getRoomDetail]);

  // Initialize: fetch room detail + connect socket + start polling
  useEffect(() => {
    if (!mounted || !isAuthenticated || !code) return;

    // Fetch room detail immediately from REST
    refreshRoom();

    // Connect socket once
    if (!socketInitialized.current) {
      socketInitialized.current = true;

      const roomSock = socketManager.connectRoom();
      socketManager.connectChat();

      // Join room via socket
      socketManager.joinRoom(code);

      // Listen for game start → redirect to game
      roomSock.on('room:gameStarting', (data: { roomId: string; roomCode: string }) => {
        if (pollRef.current) clearInterval(pollRef.current);
        router.push(`/room/${data.roomCode}/game`);
      });

      // When a player joins/leaves, also refresh from REST as backup
      roomSock.on('room:playerJoined', () => {
        setTimeout(refreshRoom, 500); // Small delay to let DB settle
      });
      roomSock.on('room:playerLeft', () => {
        setTimeout(refreshRoom, 500);
      });
    }

    // Poll room detail every 5s as robust fallback
    pollRef.current = setInterval(refreshRoom, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [mounted, isAuthenticated, code, refreshRoom, router]);

  // Join chat room once room data is available
  useEffect(() => {
    if (room?.id) {
      socketManager.joinChat(room.id);
    }
  }, [room?.id]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/?room=${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    socketManager.disconnectAll();
    socketInitialized.current = false;
    await leaveRoom();
    router.push('/');
  };

  const handleReady = () => {
    setIsReady(!isReady);
    socketManager.readyUp();
  };

  const handleStartGame = () => {
    socketManager.startGame();
  };

  // Chat via Socket.io
  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    socketManager.sendMessage(chatInput.trim());
    // Local echo
    if (user) {
      addMessage({
        userId: user.id,
        username: user.username,
        content: chatInput.trim(),
        type: 'text',
        createdAt: new Date().toISOString(),
      });
    }
    setChatInput('');
  };

  const handleSendEmoji = (emoji: string, index: number) => {
    socketManager.sendEmoji(index);
    if (user) {
      addMessage({
        userId: user.id,
        username: user.username,
        content: emoji,
        type: 'text',
        createdAt: new Date().toISOString(),
      });
    }
  };

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl mb-4 block animate-pulse">🃏</span>
          <p className="text-[var(--color-text-secondary)]">Đang tải...</p>
        </div>
      </div>
    );
  }

  const isHost = room?.hostId === user?.id;
  const nonHostPlayers = players.filter(p => !p.isHost);
  const allReady = players.length >= 2 && nonHostPlayers.every(p => p.isReady);
  const canStart = players.length >= 2;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-16 bg-[var(--color-secondary)] border-r border-[var(--color-border)] flex flex-col items-center py-4 gap-4">
        <span className="text-xl">🃏</span>
        <div className="flex-1" />
        <button onClick={() => router.push('/')} className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors" title="Về Lobby">🏠</button>
      </aside>

      <main className="flex-1 flex">
        {/* Room area */}
        <div className="flex-1 p-8 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {room?.roomName || `Room #${code}`}
                <span className="badge badge-waiting">👥 {room?.status === 'WAITING' ? 'ĐANG CHỜ' : room?.status} ({players.length}/4)</span>
              </h1>
              <p className="text-xs text-[var(--color-text-muted)] font-mono mt-1">Code: {code}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-outline text-xs px-3 py-2" onClick={handleCopyCode}>
                📋 {copied ? 'Đã copy!' : 'Copy Code'}
              </button>
              <button className="btn-outline text-xs px-3 py-2" onClick={handleCopyLink}>
                🔗 Invite Link
              </button>
            </div>
          </div>

          {/* Player seats */}
          <div className="flex-1 flex items-center justify-center">
            {isLoading && players.length === 0 ? (
              <div className="text-center">
                <span className="text-4xl mb-4 block animate-pulse">🔄</span>
                <p className="text-[var(--color-text-secondary)]">Đang tải phòng...</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 grid-rows-3 gap-6 max-w-2xl w-full">
                {Array.from({ length: 4 }).map((_, seatIndex) => {
                  const player = players.find(p => p.seat === seatIndex);
                  return (
                    <div key={seatIndex} className={`${seatPositions[seatIndex]} flex flex-col items-center`}>
                      {player ? (
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 w-48 text-center hover:border-[var(--color-accent)] transition-colors">
                          <div className="relative mx-auto mb-3">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold ${player.isHost ? 'bg-[var(--color-gold-dark)]' : 'bg-[var(--color-accent)]'}`}>
                              {player.username[0]?.toUpperCase()}
                            </div>
                            {player.isHost && <span className="absolute -top-1 -right-1 text-sm">👑</span>}
                          </div>
                          <h3 className="font-semibold text-sm">{player.username}</h3>
                          <div className="mt-3">
                            <span className={`badge text-xs ${player.isReady || player.isHost ? 'badge-ready' : 'badge-waiting'}`}>
                              {player.isHost ? '👑 HOST' : player.isReady ? '✓ SẴN SÀNG' : 'ĐANG CHỜ'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-48 h-[180px] border-2 border-dashed border-[var(--color-border)] rounded-xl flex flex-col items-center justify-center text-[var(--color-text-muted)]">
                          <span className="text-2xl mb-2">👤</span>
                          <span className="text-xs">Chỗ trống</span>
                          <span className="text-xs mt-1">Đang chờ...</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-4 mt-6">
            {isHost ? (
              <button className="btn-gold px-8 py-3 text-base disabled:opacity-50" disabled={!canStart} onClick={handleStartGame}
                title={!canStart ? 'Cần ít nhất 2 người' : 'Bắt đầu!'}>
                🎮 BẮT ĐẦU VÁN ĐẤU
              </button>
            ) : (
              <button className={`px-6 py-3 rounded-lg text-sm font-semibold transition-colors ${isReady ? 'bg-[var(--color-success)] text-white' : 'btn-outline'}`} onClick={handleReady}>
                {isReady ? '✓ SẴN SÀNG' : 'SẴN SÀNG?'}
              </button>
            )}
            <button onClick={handleLeave} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors">
              🚪 Rời Phòng
            </button>
          </div>
        </div>

        {/* Chat panel */}
        <div className="w-80 bg-[var(--color-secondary)] border-l border-[var(--color-border)] flex flex-col">
          <div className="p-4 border-b border-[var(--color-border)]">
            <h3 className="font-semibold text-sm">💬 Chat Room</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-[var(--color-text-muted)] text-center mt-4">Chưa có tin nhắn. Hãy chào mọi người! 👋</p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={msg.type === 'system' ? 'text-center' : ''}>
                {msg.type === 'system' ? (
                  <p className="text-xs text-[var(--color-text-muted)] italic">{msg.content}</p>
                ) : (
                  <>
                    <span className="text-xs font-semibold text-[var(--color-accent)]">{msg.username}</span>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{msg.content}</p>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="px-4 py-2 flex gap-1 justify-center border-t border-[var(--color-border)]">
            {EMOJIS.map((emoji, i) => (
              <button key={emoji} className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--color-surface)] transition-colors text-lg"
                onClick={() => handleSendEmoji(emoji, i)}>{emoji}</button>
            ))}
          </div>
          <div className="p-3 border-t border-[var(--color-border)]">
            <div className="flex gap-2">
              <input type="text" className="input-field text-sm" placeholder="Nhập tin nhắn..."
                value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} maxLength={200} />
              <button className="btn-primary text-sm px-3" onClick={handleSendChat}>Gửi</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
