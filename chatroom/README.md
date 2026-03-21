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
| `bun run dev` | Start backend + frontend concurrently |
| `bun run dev:backend` | Backend only (hot reload) |
| `bun run build` | Build shared package + frontend |
| `bun test` | Run all tests (535+ cases) |

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Liveness check |
| GET | `/api/rooms` | — | List all rooms |
| GET | `/api/rooms/:id` | — | Room detail + agent participant statuses |
| GET | `/api/rooms/:id/messages` | — | Paginated message history (`?limit=50&before=<id>`) |
| POST | `/api/rooms` | Bearer | Create new room (auto-generates adjective-animal name, seeds 10 agents) |
| DELETE | `/api/rooms/:id` | Bearer | Delete room and all its data (`default` is protected) |
| POST | `/api/rooms/:id/invite` | Bearer | Add agents to a room |
| GET | `/api/agents` | — | Public agent registry |
| POST | `/api/auth/token` | — | Issue one-time Bearer token (rate: 20/min) |
| WS | `/ws/:roomId` | Token | WebSocket connection |
| GET | `/docs` | — | Swagger UI |

### Room Management

Rooms are created and deleted from the UI (+ button in the titlebar). Each new room is automatically seeded with all 10 registered agents. The `default` room cannot be deleted. All mutating room operations require a Bearer token obtained from `POST /api/auth/token`.

## Environment Variables

See `apps/backend/.env.example` for the full list. All variables have safe defaults — none are strictly required for local development.
