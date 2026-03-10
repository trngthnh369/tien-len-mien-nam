'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Auth Page - Login and Registration
 * Based on Stitch Screen: 3e00707a363a491d9a3633f4f4b3189a
 *
 * Features:
 * - Toggle tabs: ĐĂNG NHẬP | ĐĂNG KÝ
 * - Username + password form
 * - Connected to backend API via Zustand auth store
 */
export default function AuthPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, error: authError, login, register, setError } = useAuthStore();

  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setError(null);

    if (!username || !password) {
      setLocalError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (username.length < 3 || username.length > 20) {
      setLocalError('Username phải từ 3-20 ký tự');
      return;
    }

    if (password.length < 6) {
      setLocalError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setLocalError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (isLogin) {
      await login(username, password);
    } else {
      await register(username, password);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background card suit texture */}
      <div className="absolute inset-0 opacity-[0.03] select-none pointer-events-none">
        <div className="grid grid-cols-8 gap-16 p-8 text-6xl text-white rotate-12 scale-125">
          {Array.from({ length: 64 }).map((_, i) => (
            <span key={i}>{['♠', '♣', '♦', '♥'][i % 4]}</span>
          ))}
        </div>
      </div>

      {/* Auth card */}
      <div className="relative z-10 w-full max-w-[420px] mx-4">
        {/* Nav bar */}
        <nav className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🃏</span>
            <span className="text-lg font-bold">Tiên Lên Miền Nam</span>
          </div>
          <div className="flex gap-4 text-sm text-[var(--color-text-secondary)]">
            <a href="/" className="hover:text-[var(--color-text-primary)] transition-colors">Home</a>
            <a href="#" className="hover:text-[var(--color-text-primary)] transition-colors">Rules</a>
          </div>
        </nav>

        {/* Hero text */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Master the deck. Claim your rank.
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Join thousands of players in the ultimate Tiên Lên Miền Nam experience.
          </p>
        </div>

        {/* Auth form */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
          {/* Tab toggle */}
          <div className="flex border-b border-[var(--color-border)] mb-6">
            <button
              className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
                isLogin
                  ? 'border-[var(--color-accent)] text-[var(--color-text-primary)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
              onClick={() => { setIsLogin(true); setLocalError(''); setError(null); }}
            >
              ĐĂNG NHẬP
            </button>
            <button
              className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
                !isLogin
                  ? 'border-[var(--color-accent)] text-[var(--color-text-primary)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
              onClick={() => { setIsLogin(false); setLocalError(''); setError(null); }}
            >
              ĐĂNG KÝ
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Nhập username (3-20 ký tự)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                minLength={3}
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Nhập mật khẩu (min 6 ký tự)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
                  Xác nhận mật khẩu
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            {displayError && (
              <p className="text-[var(--color-error)] text-sm">{displayError}</p>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-3"
              disabled={isLoading}
            >
              {isLoading ? 'Đang xử lý...' : isLogin ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ'}
            </button>

            {isLogin && (
              <p className="text-center text-xs text-[var(--color-text-muted)]">
                <a href="#" className="hover:text-[var(--color-accent)] transition-colors">
                  Forgot Password?
                </a>
              </p>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
          © 2024 Tiên Lên Miền Nam. All rights reserved.
        </p>
      </div>
    </div>
  );
}
