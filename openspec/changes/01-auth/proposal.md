# Change Proposal: Authentication System

## Summary

Implement user authentication with username/password, JWT tokens, and session management.

## Files to Create

- `backend/src/auth/auth.module.ts`
- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/dto/register.dto.ts`
- `backend/src/auth/dto/login.dto.ts`
- `backend/src/auth/guards/jwt-auth.guard.ts`
- `backend/src/auth/strategies/jwt.strategy.ts`

## Operations

1. **register** — Create user, hash password (bcrypt, saltRounds=10), return JWT
2. **login** — Validate credentials, return JWT pair
3. **refreshToken** — Exchange refresh token for new access token
4. **logout** — Invalidate refresh token

## Stitch Screens

- Login/Register: `3e00707a363a491d9a3633f4f4b3189a`
