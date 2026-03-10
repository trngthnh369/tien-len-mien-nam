'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useGameStore } from '@/lib/stores/game-store';
import { useRoomStore } from '@/lib/stores/room-store';
import { socketManager } from '@/lib/socket';
import Card from '@/components/Card';
import PlayerHand from '@/components/PlayerHand';

/**
 * Game Page — Real-time Socket.io gameplay.
 * Receives masked game state from server, plays/passes via socket.
 */

const EMOJIS = ['😂', '😤', '🤯', '🥳', '😢', '😎', '🫵', '👏'];

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { gameState, myCards, selectedCards, isMyTurn, results, error, toggleCard, clearSelection, setError, reset } = useGameStore();
  const { room, messages, addMessage } = useRoomStore();

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [mounted, setMounted] = useState(false);
  const socketConnected = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  // Auth guard
  useEffect(() => {
    if (mounted && !isAuthenticated) router.push('/auth');
  }, [mounted, isAuthenticated, router]);

  // Connect game socket + join game
  useEffect(() => {
    if (!mounted || !isAuthenticated || !room || socketConnected.current) return;
    socketConnected.current = true;

    const gameSock = socketManager.connectGame();
    socketManager.connectChat();

    // Join game channel with roomId
    socketManager.joinGame(room.id);

    // Join chat room for real-time messages
    socketManager.joinChat(room.id);

    // Listen for game finished → redirect to result
    gameSock.on('game:finished', () => {
      setTimeout(() => router.push(`/room/${code}/result`), 1500);
    });

    return () => {};
  }, [mounted, isAuthenticated, room, code, router]);

  // If no room state, try fetching
  useEffect(() => {
    if (mounted && isAuthenticated && !room && code) {
      // Try to get room detail
      useRoomStore.getState().getRoomDetail(code);
    }
  }, [mounted, isAuthenticated, room, code]);

  const handlePlay = useCallback(() => {
    if (selectedCards.length === 0) return;
    socketManager.playCards(selectedCards);
    clearSelection();
  }, [selectedCards, clearSelection]);

  const handlePass = useCallback(() => {
    socketManager.passAction();
    clearSelection();
  }, [clearSelection]);

  const handleCardClick = useCallback((card: { rank: string; suit: string }) => {
    toggleCard(card);
  }, [toggleCard]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    socketManager.sendMessage(chatInput.trim());
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

  if (!mounted || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <span className="text-4xl animate-pulse">🃏</span>
      </div>
    );
  }

  // Waiting for game state
  if (!gameState) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <span className="text-5xl animate-bounce">🃏</span>
        <p className="text-[var(--color-text-secondary)]">Đang tải ván đấu...</p>
        {error && <p className="text-[var(--color-error)] text-sm">{error}</p>}
      </div>
    );
  }

  // Get opponents (everyone except me)
  const opponents = gameState.players.filter(p => p.userId !== user?.id);
  const positionMap = ['top', 'left', 'right'] as const;

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 bg-[var(--color-secondary)] border-b border-[var(--color-border)] z-20">
        <div className="flex items-center gap-3">
          <span className="text-lg">🃏</span>
          <span className="font-bold text-sm">Tiên Lên Miền Nam</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--color-text-muted)]">Room #{code}</span>
            <span className="text-[var(--color-text-muted)]">•</span>
            <span className="font-mono text-[var(--color-gold)]">VÁN {gameState.roundNumber}</span>
          </div>
          <button
            className="relative btn-outline text-xs px-3 py-1.5"
            onClick={() => setChatOpen(!chatOpen)}
          >
            💬 Chat
          </button>
        </div>
      </header>

      {/* Game area */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Opponents */}
        {opponents.map((opp, i) => {
          const pos = positionMap[i] || 'top';
          const isTheirTurn = gameState.currentTurn === opp.userId;
          const finished = gameState.finishedOrder.includes(opp.userId);

          if (pos === 'top') {
            return (
              <div key={opp.userId} className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isTheirTurn ? 'bg-[var(--color-success)] ring-2 ring-[var(--color-success)]' : 'bg-[var(--color-accent)]'}`}>
                    {opp.username[0]?.toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold">{opp.username}</span>
                  <span className={`badge text-[10px] ${finished ? 'badge-ready' : 'badge-playing'}`}>
                    {finished ? '✓ Xong' : `${opp.cardCount} lá`}
                  </span>
                </div>
                {!finished && (
                  <div className="flex">
                    {Array.from({ length: Math.min(opp.cardCount, 13) }).map((_, j) => (
                      <div key={j} style={{ marginLeft: j === 0 ? 0 : -25 }}>
                        <Card suit="S" rank="3" faceDown size="sm" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          const isLeft = pos === 'left';
          return (
            <div key={opp.userId} className={`absolute ${isLeft ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 flex items-center gap-2 z-10`}>
              {isLeft && (
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isTheirTurn ? 'bg-[var(--color-success)] ring-2 ring-[var(--color-success)]' : 'bg-[var(--color-accent)]'}`}>
                    {opp.username[0]?.toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold writing-vertical">{opp.username}</span>
                  <span className={`badge text-[10px] ${finished ? 'badge-ready' : 'badge-playing'}`}>
                    {finished ? '✓' : opp.cardCount}
                  </span>
                </div>
              )}
              {!finished && (
                <div className="flex flex-col">
                  {Array.from({ length: Math.min(opp.cardCount, 8) }).map((_, j) => (
                    <div key={j} style={{ marginTop: j === 0 ? 0 : -40 }}>
                      <Card suit="S" rank="3" faceDown size="sm" />
                    </div>
                  ))}
                </div>
              )}
              {!isLeft && (
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isTheirTurn ? 'bg-[var(--color-success)] ring-2 ring-[var(--color-success)]' : 'bg-[var(--color-accent)]'}`}>
                    {opp.username[0]?.toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold writing-vertical">{opp.username}</span>
                  <span className={`badge text-[10px] ${finished ? 'badge-ready' : 'badge-playing'}`}>
                    {finished ? '✓' : opp.cardCount}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Center table */}
        <div className="game-table w-[500px] h-[300px] flex flex-col items-center justify-center gap-4">
          {/* Turn indicator */}
          <div className={`text-xs font-semibold px-4 py-1.5 rounded-full ${
            isMyTurn
              ? 'bg-[var(--color-accent)] text-white animate-pulse'
              : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
          }`}>
            {isMyTurn ? 'LƯỢT CỦA BẠN' : `Lượt: ${gameState.players.find(p => p.userId === gameState.currentTurn)?.username || '...'}`}
          </div>

          {/* Last played cards */}
          {gameState.lastPlayedCards && gameState.lastPlayedCards.length > 0 ? (
            <div className="flex items-center gap-1">
              {gameState.lastPlayedCards.map((card: any, i: number) => (
                <Card
                  key={`${card.rank}${card.suit}`}
                  suit={card.suit}
                  rank={card.rank}
                  size="lg"
                  className="card-deal"
                  animationDelay={i * 100}
                />
              ))}
            </div>
          ) : (
            <div className="text-[var(--color-text-muted)] text-sm">
              Bàn trống — Đánh bất kỳ bộ hợp lệ
            </div>
          )}

          {/* Last played by */}
          {gameState.lastPlayedBy && (
            <p className="text-xs text-[var(--color-text-secondary)]">
              Đánh bởi: <span className="font-semibold text-[var(--color-accent)]">
                {gameState.players.find(p => p.userId === gameState.lastPlayedBy)?.username || '...'}
              </span>
            </p>
          )}
        </div>

        {/* Error toast */}
        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-[var(--color-error)] text-white text-sm px-4 py-2 rounded-lg z-50 animate-pulse">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-xs">✕</button>
          </div>
        )}
      </div>

      {/* Bottom: Your hand */}
      <div className="bg-[var(--color-secondary)] border-t border-[var(--color-border)] p-4 z-20">
        <PlayerHand
          cards={myCards as any}
          selectedCards={selectedCards as any}
          onCardClick={handleCardClick}
          onPlay={handlePlay}
          onPass={handlePass}
          isMyTurn={isMyTurn}
          canPlay={selectedCards.length > 0}
        />
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <div className="absolute right-0 top-[52px] bottom-0 w-80 bg-[var(--color-secondary)] border-l border-[var(--color-border)] flex flex-col z-30">
          <div className="p-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <h3 className="font-semibold text-sm">💬 Chat</h3>
            <button className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-lg" onClick={() => setChatOpen(false)}>✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((msg, i) => (
              <div key={i}>
                <span className="text-xs font-semibold text-[var(--color-accent)]">{msg.username}</span>
                <p className="text-sm text-[var(--color-text-secondary)]">{msg.content}</p>
              </div>
            ))}
          </div>
          <div className="px-3 py-2 flex gap-1 justify-center border-t border-[var(--color-border)]">
            {EMOJIS.map((emoji, i) => (
              <button key={emoji} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--color-surface)] transition-colors"
                onClick={() => { socketManager.sendEmoji(i); }}>{emoji}</button>
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
      )}

      {/* Game finished overlay */}
      {results.length > 0 && (
        <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 text-center max-w-md">
            <h2 className="text-2xl font-bold mb-4">🎉 VÁN ĐẤU KẾT THÚC!</h2>
            <div className="space-y-2 mb-6">
              {results.map((r: any, i: number) => (
                <div key={r.userId} className="flex items-center justify-between px-4 py-2 rounded-lg bg-[var(--color-secondary)]">
                  <span className="text-lg">{['🥇', '🥈', '🥉', '💀'][i]}</span>
                  <span className="font-semibold">{r.username}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{r.cardCount} lá còn</span>
                </div>
              ))}
            </div>
            <button className="btn-gold px-8 py-3" onClick={() => router.push(`/room/${code}/result`)}>
              Xem Kết Quả
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
