'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRoomStore } from '@/lib/stores/room-store';

/**
 * Round History Page — fetches real data from GET /history/:roomId
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SessionResult {
  userId: string;
  username: string;
  rank: number;
}

interface SessionRecord {
  sessionId: string;
  sessionNumber: number;
  startedAt: string;
  endedAt: string | null;
  results: SessionResult[];
}

const RANK_ICONS = ['🥇', '🥈', '🥉', '💀'];
const RANK_COLORS = [
  'text-[var(--color-rank-first)]',
  'text-[var(--color-rank-second)]',
  'text-[var(--color-rank-third)]',
  'text-[var(--color-rank-last)]',
];

function formatDuration(start: string, end: string | null): string {
  if (!end) return 'Đang chơi';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.round(ms / 60000);
  return `${mins} phút`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function HistoryPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { isAuthenticated, accessToken } = useAuthStore();
  const { room } = useRoomStore();

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) router.push('/auth');
  }, [mounted, isAuthenticated, router]);

  // Fetch history from API
  useEffect(() => {
    if (!mounted || !isAuthenticated || !room?.id) return;

    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/history/${room.id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setSessions(data);
        }
      } catch {
        console.error('Failed to fetch history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [mounted, isAuthenticated, room?.id, accessToken]);

  // Calculate player summary stats
  const playerStats: Record<string, number[]> = {};
  sessions.forEach(session => {
    session.results.forEach(r => {
      if (!playerStats[r.username]) playerStats[r.username] = [0, 0, 0, 0];
      if (r.rank >= 1 && r.rank <= 4) playerStats[r.username][r.rank - 1]++;
    });
  });

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-4xl animate-pulse">🃏</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 bg-[var(--color-secondary)] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🃏</span>
          <h1 className="text-2xl font-bold">Tiên Lên Miền Nam</h1>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-1">Round History</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Room #{code} · {sessions.length} ván đã chơi
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <span className="text-4xl animate-pulse">⏳</span>
            <p className="text-sm text-[var(--color-text-muted)] mt-4">Đang tải lịch sử...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl">📋</span>
            <p className="text-sm text-[var(--color-text-muted)] mt-4">Chưa có ván nào được chơi trong phòng này.</p>
          </div>
        ) : (
          <>
            {/* Sessions table */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden mb-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="px-5 py-3 text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Ván #</th>
                    <th className="px-5 py-3 text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Thời gian</th>
                    <th className="px-5 py-3 text-center text-xs text-[var(--color-text-muted)] uppercase tracking-wider">🥇 Nhất</th>
                    <th className="px-5 py-3 text-center text-xs text-[var(--color-text-muted)] uppercase tracking-wider">🥈 Nhì</th>
                    <th className="px-5 py-3 text-center text-xs text-[var(--color-text-muted)] uppercase tracking-wider">🥉 Ba</th>
                    <th className="px-5 py-3 text-center text-xs text-[var(--color-text-muted)] uppercase tracking-wider">💀 Bét</th>
                    <th className="px-5 py-3 text-right text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(session => (
                    <tr
                      key={session.sessionId}
                      className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-hover)] transition-colors"
                    >
                      <td className="px-5 py-4 font-mono font-bold text-sm">
                        #{session.sessionNumber}
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--color-text-secondary)]">
                        {formatTime(session.startedAt)}
                      </td>
                      {[1, 2, 3, 4].map(rank => {
                        const player = session.results.find(r => r.rank === rank);
                        return (
                          <td key={rank} className="px-5 py-4 text-center">
                            <span className={`text-sm font-semibold ${RANK_COLORS[rank - 1]}`}>
                              {player?.username || '—'}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-5 py-4 text-right text-xs text-[var(--color-text-muted)]">
                        {formatDuration(session.startedAt, session.endedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Player summary */}
            {Object.keys(playerStats).length > 0 && (
              <>
                <h3 className="text-lg font-bold mb-4">Player Stats</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(playerStats).map(([username, stats]) => (
                    <div
                      key={username}
                      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4"
                    >
                      <p className="font-semibold text-sm mb-2">{username}</p>
                      <div className="flex gap-2 text-xs">
                        {stats.map((count, i) => (
                          <span key={i} className={RANK_COLORS[i]}>
                            {RANK_ICONS[i]}×{count}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Back button */}
        <div className="mt-8 text-center">
          <button className="btn-outline" onClick={() => router.push(`/room/${code}`)}>
            ← Quay Về Phòng
          </button>
        </div>
      </main>
    </div>
  );
}
