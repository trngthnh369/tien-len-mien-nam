'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useGameStore } from '@/lib/stores/game-store';
import { useRoomStore } from '@/lib/stores/room-store';
import { socketManager } from '@/lib/socket';

/**
 * Game Result Page — Real rankings from game store.
 * Shows Nhất, Nhì, Ba, Bét with actual data.
 */

const RANK_CONFIG = {
  1: { label: '🥇 NHẤT', color: 'border-[var(--color-rank-first)]', bg: 'bg-[#e8d5a315]', text: 'text-[var(--color-rank-first)]' },
  2: { label: '🥈 NHÌ', color: 'border-[var(--color-rank-second)]', bg: 'bg-[#94a3b815]', text: 'text-[var(--color-rank-second)]' },
  3: { label: '🥉 BA', color: 'border-[var(--color-rank-third)]', bg: 'bg-[#cd7f3215]', text: 'text-[var(--color-rank-third)]' },
  4: { label: '💀 BÉT', color: 'border-[var(--color-rank-last)]', bg: 'bg-[#ef444415]', text: 'text-[var(--color-rank-last)]' },
} as const;

export default function ResultPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { results, reset: resetGame } = useGameStore();
  const { leaveRoom } = useRoomStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) router.push('/auth');
  }, [mounted, isAuthenticated, router]);

  const handleNewGame = () => {
    resetGame();
    router.push(`/room/${code}`);
  };

  const handleLeave = async () => {
    socketManager.disconnectAll();
    resetGame();
    await leaveRoom();
    router.push('/');
  };

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-4xl animate-pulse">🃏</span>
      </div>
    );
  }

  // Find my result
  const myResult = results.find(r => r.userId === user?.id);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="flex items-center justify-between px-6 py-3 bg-[var(--color-secondary)] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <span className="text-lg">🃏</span>
          <span className="font-bold text-sm">Tiến Lên Miền Nam</span>
        </div>
        <nav className="flex gap-4 text-sm text-[var(--color-text-secondary)]">
          <button onClick={() => router.push('/')} className="hover:text-[var(--color-text-primary)]">Lobby</button>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Title */}
        <h1 className="text-3xl font-bold mb-2">🎉 Kết Quả Ván Đấu</h1>
        <p className="text-[var(--color-text-secondary)] mb-8">
          Room #{code} — {results.length > 0 ? `${results.length} người chơi` : 'Chưa có kết quả'}
        </p>

        {/* My result highlight */}
        {myResult && (
          <div className="mb-8 text-center">
            <p className="text-sm text-[var(--color-text-muted)] mb-1">Kết quả của bạn</p>
            <p className="text-4xl font-bold">
              {['🥇', '🥈', '🥉', '💀'][myResult.rank - 1]} Hạng {myResult.rank}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {myResult.cardCount === 0 ? 'Hết bài!' : `Còn ${myResult.cardCount} lá`}
            </p>
          </div>
        )}

        {/* Rankings */}
        {results.length > 0 ? (
          <div className="flex gap-4 mb-10 flex-wrap justify-center">
            {results.map(player => {
              const config = RANK_CONFIG[player.rank as keyof typeof RANK_CONFIG] || RANK_CONFIG[4];
              const isMe = player.userId === user?.id;
              return (
                <div
                  key={player.userId}
                  className={`${config.bg} border-2 ${config.color} rounded-xl p-6 w-48 text-center transition-transform hover:scale-105 ${isMe ? 'ring-2 ring-[var(--color-accent)]' : ''}`}
                >
                  <div className="mb-3">
                    <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-white text-xl font-bold ${
                      player.rank === 1 ? 'bg-[var(--color-gold-dark)]' : 'bg-[var(--color-accent)]'
                    }`}>
                      {player.username[0]?.toUpperCase()}
                    </div>
                  </div>
                  <p className={`font-bold text-lg ${config.text}`}>
                    {config.label}
                  </p>
                  <p className="text-sm font-semibold mt-1">{player.username}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {player.cardCount === 0 ? 'Hết bài' : `Còn ${player.cardCount} lá`}
                  </p>
                  {isMe && <span className="text-xs text-[var(--color-accent)]">(Bạn)</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mb-10 text-center">
            <p className="text-[var(--color-text-muted)]">Không có dữ liệu kết quả.</p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-2">Có thể bạn đã refresh trang — kết quả không được lưu trong bộ nhớ.</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-4">
          <button className="btn-gold px-8 py-3 text-base" onClick={handleNewGame}>
            🎮 VÁN MỚI
          </button>
          <button className="btn-outline px-6 py-3 text-[var(--color-text-muted)]" onClick={handleLeave}>
            🚪 Rời Phòng
          </button>
        </div>
      </main>
    </div>
  );
}
