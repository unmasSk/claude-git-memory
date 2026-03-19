import pino from 'pino';

/**
 * Structured logger for the chatroom backend.
 * In development: pretty-prints to stderr via pino-pretty.
 * In production: outputs NDJSON to stderr (structured, parseable by log aggregators).
 *
 * Usage:
 *   import { createLogger } from './logger';
 *   const log = createLogger('agent-invoker');
 *   log.info({ agentName, roomId }, 'invocation started');
 *   log.warn({ stderrOutput }, 'stderr from subprocess');
 *   log.error({ err }, 'invocation failed');
 */

// SEC-BOOT-001: allowlist pattern — only known safe envs enable dev mode.
// Blacklist (`!== 'production'`) would treat unknown/missing NODE_ENV as dev,
// leaking pretty-printed logs in staging or misconfigured deployments.
const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

// LOG_LEVEL validation — duplicated inline because importing config.ts here
// would create a circular dependency (config.ts imports createLogger from logger.ts).
// Keep this allowlist in sync with config.ts requireEnumEnv('LOG_LEVEL', ...).
const LOG_LEVEL_ALLOWED = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;
type LogLevel = typeof LOG_LEVEL_ALLOWED[number];
const _rawLogLevel = process.env.LOG_LEVEL;
if (_rawLogLevel && !(LOG_LEVEL_ALLOWED as readonly string[]).includes(_rawLogLevel)) {
  // Cannot use the structured logger here — it has not been created yet.
  process.stderr.write(
    JSON.stringify({ level: 'fatal', msg: 'Invalid LOG_LEVEL: "' + _rawLogLevel + '" — must be one of: ' + LOG_LEVEL_ALLOWED.join(', ') }) + '\n'
  );
  process.exit(1);
}
const _logLevel: LogLevel = (_rawLogLevel as LogLevel | undefined) ?? 'debug';

const rootLogger = pino(
  {
    level: _logLevel,
    // Add timestamp to every log line
    timestamp: pino.stdTimeFunctions.isoTime,
    // In production, output as NDJSON
    // In development, pino-pretty handles formatting
  },
  isDev
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname',
          messageFormat: '[{module}] {msg}',
        },
      })
    : pino.destination(2), // fd 2 = stderr
);

/**
 * Create a child logger scoped to a module.
 * The `module` binding appears in every log line.
 */
export function createLogger(module: string): pino.Logger {
  return rootLogger.child({ module });
}

export { rootLogger };
