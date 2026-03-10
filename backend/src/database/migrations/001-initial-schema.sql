-- Tiến Lên Miền Nam - Database Schema
-- PostgreSQL Migration: 001-initial-schema.sql

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(6) UNIQUE NOT NULL,
  room_name VARCHAR(30),
  host_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'WAITING', -- WAITING, PLAYING, FINISHED
  player_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE room_players (
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  seat INT NOT NULL CHECK (seat BETWEEN 0 AND 3),
  is_host BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  session_number INT NOT NULL, -- ván thứ mấy trong phòng
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ
);

CREATE TABLE game_results (
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  rank INT NOT NULL CHECK (rank BETWEEN 1 AND 4), -- 1=nhất, 4=bét
  PRIMARY KEY (session_id, user_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  content VARCHAR(200),
  type VARCHAR(10) DEFAULT 'text', -- 'text' or 'system'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rooms_code ON rooms(room_code);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_room_players_room ON room_players(room_id);
CREATE INDEX idx_room_players_user ON room_players(user_id);
CREATE INDEX idx_game_sessions_room ON game_sessions(room_id);
CREATE INDEX idx_game_results_session ON game_results(session_id);
CREATE INDEX idx_messages_room ON messages(room_id, created_at DESC);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
