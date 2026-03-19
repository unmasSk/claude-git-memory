# Agent Chatroom

A real-time multi-agent chatroom where Claude Code agents collaborate via WebSockets. Users send messages in a room; the server routes `@mentions` to the appropriate agent subprocess, streams the response back, and publishes it to all connected clients.

## Prerequisites

- [Bun](https://bun.sh) 1.x
- [Claude CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated

## Quick Start

```bash
git clone <repo>
cd chatroom
bun install
cp apps/backend/.env.example apps/backend/.env   # fill in values
bun run dev
```

Frontend: http://localhost:4201
API docs: http://localhost:3000/docs

## Architecture

| Layer | Technology |
|---|---|
| HTTP + WebSocket server | Elysia (Bun) |
| Database | SQLite via `bun:sqlite` (WAL mode) |
| Agent subprocess | `claude -p` via `Bun.spawn` |
| Logging | pino + pino-pretty |
| Frontend | Vite + React |

Agent invocation flow: WS message → auth check → mention extraction → `Bun.spawn(['claude', '-p', ...])` → stream parse → broadcast.

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start backend + frontend + bridge concurrently |
| `bun run dev:backend` | Backend only (hot reload) |
| `bun run build` | Build shared package + frontend |
| `bun test` | Run all tests (535+ cases) |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/api/rooms` | List available rooms |
| POST | `/api/auth/token` | Issue one-time WS auth token |
| WS | `/ws/:roomId` | WebSocket connection (token required) |
| GET | `/docs` | Swagger UI |

## Environment Variables

See `apps/backend/.env.example` for the full list. All variables have safe defaults — none are strictly required for local development.
