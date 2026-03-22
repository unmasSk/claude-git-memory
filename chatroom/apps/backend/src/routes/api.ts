import { Elysia, t } from 'elysia';
import { join } from 'node:path';
import { mkdirSync, realpathSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import {
  listRooms,
  getRoomById,
  createRoom,
  deleteRoom,
  updateRoomCwd,
  getRecentMessages,
  getMessagesBefore,
  hasMoreMessagesBefore,
  getMessageCreatedAt,
  listAgentSessions,
  upsertAgentSession,
  insertAttachment,
  getAttachmentById,
} from '../db/queries.js';
import { getAllAgents, getAgentConfig } from '../services/agent-registry.js';
import { seedAgentSessions } from '../db/schema.js';
import { generateRoomName } from '../utils-name.js';
import { mapMessageRow, mapRoomRow, mapAgentSessionRow, safeMessage, enrichWithAttachments } from '../utils.js';
import { ROOM_STATE_MESSAGE_LIMIT, UPLOADS_DIR } from '../config.js';
import { validateName, issueToken, peekToken } from '../services/auth-tokens.js';
import { createLogger } from '../logger.js';
import { createTokenBucket } from '../services/rate-limiter.js';
import { broadcast } from '../services/message-bus.js';
import { getGitStatus } from '../services/git-status.js';
import type { Attachment } from '@agent-chatroom/shared';

const log = createLogger('api');
const uploadLog = createLogger('upload');

// ---------------------------------------------------------------------------
// SEC-FIX 7 / SEC-OPEN-002: Token-bucket rate limiters for sensitive API routes.
//
// Intentional global key (not per-IP): X-Forwarded-For headers are trivially
// spoofed when the backend runs behind a proxy we do not control. A global
// bucket provides a hard ceiling on token issuance throughput regardless of
// spoofed source addresses.
//
// Each endpoint uses its own bucket so one route cannot exhaust another's
// quota: 'auth-token' for POST /api/auth/token, 'invite' for POST /invite.
// ---------------------------------------------------------------------------

/**
 * Shared rate limiter for all sensitive API routes (20 req/min global ceiling).
 *
 * Keyed by endpoint name ('auth-token', 'invite') so each route has its own
 * independent bucket and cannot be starved by the other (SEC-OPEN-002).
 * Global key — not per-IP — because X-Forwarded-For headers are trivially
 * spoofed behind an uncontrolled proxy (SEC-FIX 7).
 */
const checkApiRateLimit = createTokenBucket(20, 60_000);

/** Upload rate limiter — separate bucket so upload bursts cannot starve auth/invite. */
const checkUploadRateLimit = createTokenBucket(30, 60_000);

/** cwd update rate limiter — separate bucket. */
const checkCwdRateLimit = createTokenBucket(20, 60_000);

/** Setup validate rate limiter — separate bucket (spawns 2 processes per request). */
const checkSetupRateLimit = createTokenBucket(10, 60_000);

// ---------------------------------------------------------------------------
// Upload constants
// ---------------------------------------------------------------------------

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/markdown',
  'application/pdf',
  'text/x-typescript',
  'text/javascript',
  'application/json',
  'text/yaml',
]);

/** Strip path separators and non-printable chars from a filename. */
function sanitizeFilename(raw: string): string {
  return raw
    .replace(/[/\\]/g, '_')
    .replace(/[^\x20-\x7E]/g, '')
    .slice(0, 200)
    || 'upload';
}

// ---------------------------------------------------------------------------
// API route group
// ---------------------------------------------------------------------------

/**
 * Elysia plugin mounting all REST API routes under the `/api` prefix.
 *
 * Routes:
 * - GET  /api/rooms                    — list all rooms
 * - GET  /api/rooms/:id                — room detail with agent session status
 * - GET  /api/rooms/:id/messages       — paginated message history
 * - GET  /api/agents                   — public agent registry (tools stripped)
 * - POST /api/auth/token               — issue a short-lived WS auth token
 * - POST /api/rooms/:id/invite         — add agents to a room (requires Bearer token)
 */
export const apiRoutes = new Elysia({ prefix: '/api' })

  // GET /api/rooms — list all rooms
  .get('/rooms', () => {
    const rows = listRooms();
    return rows.map(mapRoomRow);
  })

  // GET /api/rooms/:id — room detail with participant statuses
  .get(
    '/rooms/:id',
    ({ params, set }) => {
      const room = getRoomById(params.id);
      if (!room) {
        set.status = 404;
        return { error: 'Room not found', code: 'NOT_FOUND' };
      }

      const sessions = listAgentSessions(params.id);
      return {
        room: mapRoomRow(room),
        // SEC-MED-002: strip sessionId — server-internal only
        participants: sessions.map((row) => {
          const s = mapAgentSessionRow(row);
          return { ...s, sessionId: null };
        }),
      };
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // GET /api/rooms/:id/messages?limit=50&before=<id> — paginated messages
  .get(
    '/rooms/:id/messages',
    ({ params, query, set }) => {
      const room = getRoomById(params.id);
      if (!room) {
        set.status = 404;
        return { error: 'Room not found', code: 'NOT_FOUND' };
      }

      const limit = Math.max(1, Math.min(Number(query.limit ?? ROOM_STATE_MESSAGE_LIMIT), 100));

      if (query.before) {
        const rows = getMessagesBefore(params.id, query.before, limit);
        // hasMoreMessagesBefore needs a created_at timestamp, not a message ID
        const pivotCreatedAt = getMessageCreatedAt(query.before);
        const hasMore = pivotCreatedAt ? hasMoreMessagesBefore(params.id, pivotCreatedAt) : false;
        // getMessagesBefore returns DESC — reverse to chronological order
        return {
          messages: enrichWithAttachments(rows.reverse().map(mapMessageRow)).map(safeMessage),
          hasMore,
        };
      }

      const rows = getRecentMessages(params.id, limit);
      return {
        messages: enrichWithAttachments(rows.map(mapMessageRow)).map(safeMessage),
        hasMore: false,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        limit: t.Optional(t.Numeric()),
        before: t.Optional(t.String()),
      }),
    },
  )

  // GET /api/agents — public agent registry (SEC-MED-001: strip allowedTools)
  .get('/agents', () => {
    return getAllAgents().map(({ allowedTools: _omit, ...safe }) => safe);
  })

  // POST /api/auth/token — issue a short-lived WS auth token
  // Body: { name?: string }  →  { token, expiresAt, name }
  .post(
    '/auth/token',
    ({ body, set }) => {
      // SEC-OPEN-002: Separate bucket for auth/token — prevents /invite exhaustion from burning auth quota.
      if (!checkApiRateLimit('auth-token')) {
        log.warn('POST /api/auth/token rate limit exceeded');
        set.status = 429;
        return { error: 'Too many token requests — try again later', code: 'RATE_LIMIT' };
      }
      const name = validateName((body as { name?: string }).name);
      if (name === null) {
        log.warn({ rawName: (body as { name?: string }).name }, 'POST /api/auth/token invalid or reserved name');
        set.status = 400;
        return { error: 'Invalid or reserved name', code: 'NAME_INVALID' };
      }
      const issued = issueToken(name);
      if (issued === null) {
        set.status = 503;
        return { error: 'Token store full — try again later', code: 'TOKEN_STORE_FULL' };
      }
      log.info({ name }, 'POST /api/auth/token issued');
      return issued;
    },
    {
      body: t.Object({ name: t.Optional(t.String()) }),
    },
  )

  // POST /api/rooms/:id/invite — add agents to a room (create agent_session rows)
  // SEC-FIX 8: Requires a valid auth token in the Authorization header.
  // Uses peekToken (non-consuming) so the caller's WS token is not burned.
  .post(
    '/rooms/:id/invite',
    ({ params, body, set, headers }) => {
      // SEC-OPEN-002: Separate bucket for /invite so it cannot starve /auth/token and vice versa.
      if (!checkApiRateLimit('invite')) {
        log.warn('POST /api/rooms/:id/invite rate limit exceeded');
        set.status = 429;
        return { error: 'Too many requests — try again later', code: 'RATE_LIMIT' };
      }

      // FIX 2: headers.authorization is now typed via the schema declaration below.
      // Extract token from "Authorization: Bearer <token>"
      const rawAuth = headers.authorization ?? '';
      const bearerToken = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7).trim() : undefined;
      if (!peekToken(bearerToken)) {
        set.status = 401;
        return { error: 'Unauthorized. Provide a valid token via Authorization: Bearer <token>', code: 'UNAUTHORIZED' };
      }

      const room = getRoomById(params.id);
      if (!room) {
        set.status = 404;
        return { error: 'Room not found', code: 'NOT_FOUND' };
      }

      const added: string[] = [];
      const skipped: string[] = [];

      for (const agentName of [...new Set(body.agents)]) {
        const config = getAgentConfig(agentName);
        if (!config) {
          skipped.push(agentName);
          continue;
        }

        upsertAgentSession({
          agentName: config.name,
          roomId: params.id,
          sessionId: null,
          model: config.model,
          status: 'idle',
        });
        added.push(config.name);
      }

      set.status = 201;
      return { added, skipped };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        agents: t.Array(t.String(), { minItems: 1 }),
      }),
      // FIX 2: Typed header schema so Elysia provides headers.authorization as string | undefined
      // instead of requiring an unsafe cast to Record<string, string | undefined>.
      headers: t.Object({ authorization: t.Optional(t.String()) }),
    },
  )

  // POST /api/rooms — create a new room with an auto-generated adjective-animal name
  // Requires a valid auth token in the Authorization header (same pattern as /invite).
  .post(
    '/rooms',
    ({ set, headers }) => {
      if (!checkApiRateLimit('rooms-create')) {
        log.warn('POST /api/rooms rate limit exceeded');
        set.status = 429;
        return { error: 'Too many requests — try again later', code: 'RATE_LIMIT' };
      }

      const rawAuth = headers.authorization ?? '';
      const bearerToken = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7).trim() : undefined;
      if (!peekToken(bearerToken)) {
        set.status = 401;
        return { error: 'Unauthorized. Provide a valid token via Authorization: Bearer <token>', code: 'UNAUTHORIZED' };
      }

      const id = crypto.randomUUID();
      const name = generateRoomName();
      const room = createRoom(id, name, '');
      seedAgentSessions(getAllAgents(), id);
      log.info({ roomId: id, name }, 'POST /api/rooms created');
      set.status = 201;
      return { room: { id: room.id, name: room.name, topic: room.topic, createdAt: room.created_at } };
    },
    {
      body: t.Object({}),
      headers: t.Object({ authorization: t.Optional(t.String()) }),
    },
  )

  // DELETE /api/rooms/:id — delete room and all its data (forbidden for 'default')
  // Requires a valid auth token in the Authorization header.
  .delete(
    '/rooms/:id',
    ({ params, set, headers }) => {
      if (!checkApiRateLimit('rooms-delete')) {
        log.warn({ roomId: params.id }, 'DELETE /api/rooms/:id rate limit exceeded');
        set.status = 429;
        return { error: 'Too many requests — try again later', code: 'RATE_LIMIT' };
      }

      const rawAuth = headers.authorization ?? '';
      const bearerToken = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7).trim() : undefined;
      if (!peekToken(bearerToken)) {
        set.status = 401;
        return { error: 'Unauthorized. Provide a valid token via Authorization: Bearer <token>', code: 'UNAUTHORIZED' };
      }

      if (params.id === 'default') {
        set.status = 403;
        return { error: 'Cannot delete the default room', code: 'FORBIDDEN' };
      }
      const deleted = deleteRoom(params.id);
      if (!deleted) {
        set.status = 404;
        return { error: 'Room not found', code: 'NOT_FOUND' };
      }
      log.info({ roomId: params.id }, 'DELETE /api/rooms/:id deleted');
      set.status = 200;
      return { deleted: params.id };
    },
    {
      params: t.Object({ id: t.String() }),
      headers: t.Object({ authorization: t.Optional(t.String()) }),
    },
  )

  // PUT /api/rooms/:id/cwd — set the working directory for agents in this room.
  // Requires a valid Bearer auth token.
  // Body: { cwd: string } — must be an absolute path with no ".." traversal.
  .put(
    '/rooms/:id/cwd',
    ({ params, body, set, headers }) => {
      if (!checkCwdRateLimit('rooms-cwd')) {
        log.warn({ roomId: params.id }, 'PUT /api/rooms/:id/cwd rate limit exceeded');
        set.status = 429;
        return { error: 'Too many requests — try again later', code: 'RATE_LIMIT' };
      }

      const rawAuth = headers.authorization ?? '';
      const bearerToken = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7).trim() : undefined;
      if (!peekToken(bearerToken)) {
        set.status = 401;
        return { error: 'Unauthorized. Provide a valid token via Authorization: Bearer <token>', code: 'UNAUTHORIZED' };
      }

      const room = getRoomById(params.id);
      if (!room) {
        set.status = 404;
        return { error: 'Room not found', code: 'NOT_FOUND' };
      }

      const { cwd } = body as { cwd: string };

      // Empty string = reset to server default (null in DB)
      if (cwd === '') {
        updateRoomCwd(params.id, null);
        log.info({ roomId: params.id }, 'PUT /api/rooms/:id/cwd reset to default');
        void broadcast(params.id, { type: 'room_cwd_changed', roomId: params.id, cwd: null });
        return { cwd: null };
      }

      // Validate: must be absolute, no ".." traversal
      if (!cwd.startsWith('/')) {
        set.status = 400;
        return { error: 'cwd must be an absolute path (must start with /)', code: 'INVALID_CWD' };
      }
      if (cwd.includes('..')) {
        set.status = 400;
        return { error: 'cwd must not contain ".." path traversal', code: 'INVALID_CWD' };
      }

      // Validate: directory must exist and be accessible. Resolve to canonical path
      // (follows symlinks + normalizes macOS /tmp → /private/tmp) so what is stored
      // in DB is always the real, absolute path — no symlink bypass, no false positives.
      let resolved: string;
      try {
        const stat = statSync(cwd);
        if (!stat.isDirectory()) {
          set.status = 400;
          return { error: `cwd is not a directory: ${cwd}`, code: 'NOT_A_DIRECTORY' };
        }
        resolved = realpathSync(cwd);
      } catch {
        set.status = 400;
        return { error: `cwd does not exist or is not accessible: ${cwd}`, code: 'CWD_NOT_FOUND' };
      }

      updateRoomCwd(params.id, resolved);
      log.info({ roomId: params.id, cwd: resolved }, 'PUT /api/rooms/:id/cwd updated');

      void broadcast(params.id, { type: 'room_cwd_changed', roomId: params.id, cwd: resolved });
      void broadcast(params.id, { type: 'git_status', ...getGitStatus(resolved) });

      return { cwd: resolved };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ cwd: t.String() }),
      headers: t.Object({ authorization: t.Optional(t.String()) }),
    },
  )

  // POST /api/rooms/:id/upload — upload a file attachment for a room message.
  // Requires a valid Bearer auth token. File is stored on disk under UPLOADS_DIR.
  // Returns { attachment: Attachment } with 201 on success.
  .post(
    '/rooms/:id/upload',
    async ({ params, request, set, headers }) => {
      if (!checkUploadRateLimit('upload')) {
        uploadLog.warn({ roomId: params.id }, 'POST /api/rooms/:id/upload rate limit exceeded');
        set.status = 429;
        return { error: 'Too many upload requests — try again later', code: 'RATE_LIMIT' };
      }

      const rawAuth = headers.authorization ?? '';
      const bearerToken = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7).trim() : undefined;
      if (!peekToken(bearerToken)) {
        set.status = 401;
        return { error: 'Unauthorized. Provide a valid token via Authorization: Bearer <token>', code: 'UNAUTHORIZED' };
      }

      const room = getRoomById(params.id);
      if (!room) {
        set.status = 404;
        return { error: 'Room not found', code: 'NOT_FOUND' };
      }

      let formData: FormData;
      try {
        formData = await request.formData();
      } catch {
        set.status = 400;
        return { error: 'Invalid multipart/form-data body', code: 'INVALID_BODY' };
      }

      const file = formData.get('file');
      if (!(file instanceof File)) {
        set.status = 400;
        return { error: 'Missing "file" field in form data', code: 'MISSING_FILE' };
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        set.status = 413;
        return { error: 'File exceeds 10MB limit', code: 'FILE_TOO_LARGE' };
      }

      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        set.status = 415;
        return { error: `Unsupported file type: ${file.type}`, code: 'UNSUPPORTED_TYPE' };
      }

      const fileId = crypto.randomUUID();
      const safeName = sanitizeFilename(file.name);
      const roomDir = join(UPLOADS_DIR, params.id);
      const storageFilename = `${fileId}-${safeName}`;
      const storagePath = join(roomDir, storageFilename);

      try {
        mkdirSync(roomDir, { recursive: true });
        await Bun.write(storagePath, file);
      } catch (err) {
        uploadLog.error({ err, roomId: params.id, fileId }, 'POST /api/rooms/:id/upload: disk write failed');
        set.status = 500;
        return { error: 'Failed to save file', code: 'STORAGE_ERROR' };
      }

      const createdAt = new Date().toISOString();
      try {
        insertAttachment({
          id: fileId,
          roomId: params.id,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          storagePath,
          createdAt,
        });
      } catch (err) {
        uploadLog.error({ err, roomId: params.id, fileId }, 'POST /api/rooms/:id/upload: DB insert failed');
        set.status = 500;
        return { error: 'Failed to record attachment', code: 'DB_ERROR' };
      }

      const attachment: Attachment = {
        id: fileId,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        url: `/api/uploads/${params.id}/${fileId}`,
      };

      uploadLog.info({ roomId: params.id, fileId, filename: file.name, sizeBytes: file.size }, 'POST /api/rooms/:id/upload saved');
      set.status = 201;
      return { attachment };
    },
    {
      params: t.Object({ id: t.String() }),
      headers: t.Object({ authorization: t.Optional(t.String()) }),
    },
  )

  // GET /api/setup/validate — run environment checks (bun, claude CLI, plugin count).
  // Returns { bun, claude, plugins } with ok flag and optional version string per check.
  // No auth required — read-only diagnostic endpoint.
  // Rate limited: 10/min — each request spawns 2 subprocesses.
  .get('/setup/validate', async ({ set }) => {
    if (!checkSetupRateLimit('setup-validate')) {
      log.warn('GET /api/setup/validate rate limit exceeded');
      set.status = 429;
      return { error: 'Too many requests — try again later', code: 'RATE_LIMIT' };
    }
    const CHECK_TIMEOUT_MS = 5_000;
    async function runCheck(cmd: string[]): Promise<{ ok: boolean; version: string }> {
      try {
        const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' });
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => { proc.kill(); reject(new Error('timeout')); }, CHECK_TIMEOUT_MS),
        );
        const text = await Promise.race([new Response(proc.stdout).text(), timeout]);
        const exit = await proc.exited;
        if (exit !== 0) return { ok: false, version: '' };
        return { ok: true, version: text.trim().split('\n')[0] ?? '' };
      } catch {
        return { ok: false, version: '' };
      }
    }

    const [bunResult, claudeResult] = await Promise.all([
      runCheck(['bun', '--version']),
      runCheck(['claude', '--version']),
    ]);

    let pluginCount = 0;
    try {
      const pluginsDir = join(process.env['HOME'] ?? '', '.claude', 'plugins');
      const entries = await readdir(pluginsDir, { withFileTypes: true });
      pluginCount = entries.filter((e) => e.isDirectory()).length;
    } catch {
      // plugins dir missing or inaccessible — count stays 0
    }

    return {
      bun: bunResult,
      claude: claudeResult,
      plugins: { ok: pluginCount > 0, count: pluginCount },
    };
  })

  // GET /api/uploads/:roomId/:fileId — serve an uploaded file from disk.
  // No auth required — URLs are unguessable UUIDs. Content-Type set from DB record.
  .get(
    '/uploads/:roomId/:fileId',
    async ({ params, set }) => {
      const row = getAttachmentById(params.fileId);
      if (!row || row.room_id !== params.roomId) {
        set.status = 404;
        return { error: 'Attachment not found', code: 'NOT_FOUND' };
      }

      let file: Bun.BunFile;
      try {
        file = Bun.file(row.storage_path);
        const exists = await file.exists();
        if (!exists) {
          uploadLog.error({ fileId: params.fileId, storagePath: row.storage_path }, 'GET /api/uploads: file missing from disk');
          set.status = 404;
          return { error: 'Attachment file not found', code: 'NOT_FOUND' };
        }
      } catch (err) {
        uploadLog.error({ err, fileId: params.fileId }, 'GET /api/uploads: disk read error');
        set.status = 500;
        return { error: 'Failed to read attachment', code: 'STORAGE_ERROR' };
      }

      set.headers['Content-Type'] = row.mime_type;
      set.headers['Cache-Control'] = 'private, max-age=31536000, immutable';
      return file;
    },
    {
      params: t.Object({ roomId: t.String(), fileId: t.String() }),
    },
  );
