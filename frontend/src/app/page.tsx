'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRoomStore } from '@/lib/stores/room-store';

/**
 * Game Lobby Page — Connected to real backend API
 * Fetches room list, creates rooms, joins rooms via Zustand stores.
 */
export default function LobbyPage() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { roomList, isLoading, error, fetchRoomList, createRoom, joinRoom, setError } = useRoomStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth guard
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/auth');
    }
  }, [mounted, isAuthenticated, router]);

  // Fetch rooms on mount
  useEffect(() => {
    if (mounted && isAuthenticated) {
      fetchRoomList();
    }
  }, [mounted, isAuthenticated, fetchRoomList]);

  // Create room handler
  const handleCreateRoom = async () => {
    const roomCode = await createRoom(newRoomName || undefined);
    if (roomCode) {
      setShowCreateModal(false);
      setNewRoomName('');
      router.push(`/room/${roomCode}`);
    }
  };

  // Join room by code
  const handleJoinByCode = async () => {
    if (joinCode.length !== 6) return;
    const success = await joinRoom(joinCode);
    if (success) {
      router.push(`/room/${joinCode}`);
    }
  };

  // Join room from card
  const handleJoinRoom = async (roomCode: string) => {
    const success = await joinRoom(roomCode);
    if (success) {
      router.push(`/room/${roomCode}`);
    }
  };

  // Loading state
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

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--color-secondary)] border-r border-[var(--color-border)] flex flex-col">
        <div className="p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🃏</span>
            <span className="text-lg font-bold">Tiên Lên Miền Nam</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {[
            { icon: '🎮', label: 'Lobby', active: true },
            { icon: '🏆', label: 'Rankings', active: false },
            { icon: '⚔️', label: 'Tournaments', active: false },
            { icon: '🛒', label: 'Shop', active: false },
          ].map(item => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                item.active
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Player Info */}
        <div className="p-4 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white font-bold">
              {user?.username?.charAt(0).toUpperCase() || 'P'}
            </div>
            <div>
              <p className="text-sm font-semibold">{user?.username || 'Player'}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Online</p>
            </div>
          </div>
          <div className="space-y-1">
            {[
              { icon: '👤', label: 'Profile' },
              { icon: '👥', label: 'Friends' },
              { icon: '📜', label: 'History' },
            ].map(item => (
              <button
                key={item.label}
                className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
            <button
              onClick={() => { logout(); router.push('/auth'); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-[var(--color-error)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <span>🚪</span>
              <span>Đăng Xuất</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Game Lobby</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Chào {user?.username}! Tham gia hoặc tạo phòng mới.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Join by code */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="input-field w-40 text-center font-mono uppercase tracking-widest"
                placeholder="ROOM CODE"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
              <button
                className="btn-outline"
                disabled={joinCode.length !== 6 || isLoading}
                onClick={handleJoinByCode}
              >
                Tham Gia
              </button>
            </div>
            <button
              className="btn-primary flex items-center gap-2"
              onClick={() => setShowCreateModal(true)}
            >
              <span>+</span>
              <span>Tạo Phòng</span>
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 text-[var(--color-error)] text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-xs hover:underline">✕</button>
          </div>
        )}

        {/* Loading */}
        {isLoading && roomList.length === 0 && (
          <div className="text-center py-20">
            <span className="text-4xl mb-4 block animate-pulse">🔄</span>
            <p className="text-[var(--color-text-secondary)]">Đang tải danh sách phòng...</p>
          </div>
        )}

        {/* Room Grid */}
        {roomList.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roomList.map((room: any) => (
              <div
                key={room.id}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 hover:border-[var(--color-accent)] transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold group-hover:text-[var(--color-accent)] transition-colors">
                      {room.roomName || `Phòng #${room.roomCode}`}
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)] font-mono mt-1">
                      #{room.roomCode}
                    </p>
                  </div>
                  <span className={`badge ${room.status === 'WAITING' ? 'badge-waiting' : 'badge-playing'}`}>
                    {room.status === 'WAITING' ? 'Đang chờ' : 'Đang chơi'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-secondary)]">Host:</span>
                    <span className="text-xs font-medium">{room.hostUsername || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs">👥</span>
                      <span className={`text-sm font-bold ${
                        room.playerCount === 4 ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'
                      }`}>
                        {room.playerCount}/4
                      </span>
                    </div>
                    {room.status === 'WAITING' && room.playerCount < 4 && (
                      <button
                        className="btn-primary text-xs px-4 py-2"
                        onClick={() => handleJoinRoom(room.roomCode)}
                        disabled={isLoading}
                      >
                        JOIN
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 mt-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        i < room.playerCount
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {i < room.playerCount ? 'P' : '?'}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && roomList.length === 0 && (
          <div className="text-center py-20">
            <span className="text-6xl mb-4 block">🃏</span>
            <h3 className="text-xl font-semibold mb-2">Chưa có phòng nào</h3>
            <p className="text-[var(--color-text-secondary)] mb-6">Hãy tạo phòng mới để bắt đầu chơi!</p>
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              Tạo Phòng Ngay
            </button>
          </div>
        )}

        {/* Refresh button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => fetchRoomList()}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
            disabled={isLoading}
          >
            🔄 Làm mới danh sách
          </button>
        </div>
      </main>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowCreateModal(false)}>
          <div
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-1">Tạo Phòng Mới</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Tiên Lên Miền Nam · 4 người chơi
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
                  Tên Phòng (tùy chọn)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="VD: Phòng Vui Vẻ"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  maxLength={30}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button className="btn-outline flex-1" onClick={() => setShowCreateModal(false)}>
                Hủy
              </button>
              <button
                className="btn-gold flex-1"
                onClick={handleCreateRoom}
                disabled={isLoading}
              >
                {isLoading ? 'Đang tạo...' : 'Tạo Phòng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
