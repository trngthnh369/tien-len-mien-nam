# Auth — Design Document

## Block Decomposition: register

```
Block 1: Validate input
  - username: 3-20 chars, unique
  - password: min 6 chars

Block 2: Hash password
  - bcrypt.hash(password, saltRounds=10)

Block 3: Insert user
  - INSERT INTO users (username, password_hash)

Block 4: Generate JWT pair
  - accessToken: { sub: userId, username }, expires 15m
  - refreshToken: { sub: userId }, expires 7d
  - Store refreshToken hash in refresh_tokens table

Block 5: Return response
  - { accessToken, refreshToken, user: { id, username } }
```

## Block Decomposition: login

```
Block 1: Find user by username
Block 2: bcrypt.compare(password, user.password_hash)
Block 3: Generate JWT pair (same as register Block 4)
Block 4: Return response
```

## Block Decomposition: refreshToken

```
Block 1: Verify refresh token signature
Block 2: Find user by token.sub
Block 3: Verify token hash exists in refresh_tokens
Block 4: Delete old token, generate new pair
Block 5: Return new tokens
```

## Files

- `src/auth/auth.module.ts`
- `src/auth/auth.service.ts`
- `src/auth/auth.controller.ts`
- `src/auth/dto/register.dto.ts`
- `src/auth/dto/login.dto.ts`
- `src/auth/guards/jwt-auth.guard.ts`
- `src/auth/strategies/jwt.strategy.ts`
- `src/auth/entities/user.entity.ts`
- `src/auth/entities/refresh-token.entity.ts`
