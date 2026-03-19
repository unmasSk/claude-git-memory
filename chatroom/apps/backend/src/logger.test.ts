/**
 * Unit tests for logger.ts — createLogger factory and default export.
 *
 * logger.ts is a thin wrapper around pino. We verify:
 *   - createLogger returns a pino child logger (has the standard log-level methods)
 *   - The child logger carries the `module` binding
 *   - Multiple calls to createLogger produce independent child loggers
 *   - The default export is the root pino logger
 *
 * We do NOT assert on formatted output strings — those depend on pino internals
 * and NODE_ENV (pretty vs NDJSON). We test the contract: callable, non-null,
 * has the expected shape.
 */
import { describe, it, expect } from 'bun:test';
import { createLogger, rootLogger } from './logger.js';

// ---------------------------------------------------------------------------
// createLogger — returns a usable child logger
// ---------------------------------------------------------------------------

describe('createLogger', () => {
  it('returns a non-null object', () => {
    const log = createLogger('test-module');
    expect(log).not.toBeNull();
    expect(typeof log).toBe('object');
  });

  it('returned logger has an info method', () => {
    const log = createLogger('test-module');
    expect(typeof log.info).toBe('function');
  });

  it('returned logger has a warn method', () => {
    const log = createLogger('test-module');
    expect(typeof log.warn).toBe('function');
  });

  it('returned logger has an error method', () => {
    const log = createLogger('test-module');
    expect(typeof log.error).toBe('function');
  });

  it('returned logger has a debug method', () => {
    const log = createLogger('test-module');
    expect(typeof log.debug).toBe('function');
  });

  it('returned logger has a trace method', () => {
    const log = createLogger('test-module');
    expect(typeof log.trace).toBe('function');
  });

  it('returned logger has a fatal method', () => {
    const log = createLogger('test-module');
    expect(typeof log.fatal).toBe('function');
  });

  it('calling log.info with a message does not throw', () => {
    const log = createLogger('test-module');
    expect(() => log.info('test info message')).not.toThrow();
  });

  it('calling log.warn with bindings and message does not throw', () => {
    const log = createLogger('test-module');
    expect(() => log.warn({ key: 'value' }, 'test warn message')).not.toThrow();
  });

  it('calling log.error with bindings does not throw', () => {
    const log = createLogger('test-module');
    expect(() => log.error({ err: new Error('test') }, 'test error')).not.toThrow();
  });

  it('calling log.debug does not throw', () => {
    const log = createLogger('test-debug');
    expect(() => log.debug({ extra: 42 }, 'debug message')).not.toThrow();
  });

  it('two loggers with different module names are independent objects', () => {
    const log1 = createLogger('module-a');
    const log2 = createLogger('module-b');
    expect(log1).not.toBe(log2);
  });

  it('module name is reflected in logger bindings', () => {
    // pino child loggers expose bindings() to inspect inherited fields
    const log = createLogger('my-module');
    const bindings = log.bindings();
    expect(bindings.module).toBe('my-module');
  });

  it('createLogger with different names produces loggers with different module bindings', () => {
    const logA = createLogger('alpha');
    const logB = createLogger('beta');
    expect(logA.bindings().module).toBe('alpha');
    expect(logB.bindings().module).toBe('beta');
  });

  it('createLogger with empty string module still returns a logger', () => {
    const log = createLogger('');
    expect(log).not.toBeNull();
    expect(typeof log.info).toBe('function');
  });

  it('createLogger with special characters in module name does not throw', () => {
    expect(() => createLogger('module-with-special_chars.123')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Default export — root pino logger
// ---------------------------------------------------------------------------

describe('rootLogger (default export)', () => {
  it('is non-null', () => {
    expect(rootLogger).not.toBeNull();
  });

  it('has info method', () => {
    expect(typeof rootLogger.info).toBe('function');
  });

  it('has warn method', () => {
    expect(typeof rootLogger.warn).toBe('function');
  });

  it('has error method', () => {
    expect(typeof rootLogger.error).toBe('function');
  });

  it('calling rootLogger.info does not throw', () => {
    expect(() => rootLogger.info({ source: 'test' }, 'root logger test')).not.toThrow();
  });

  it('rootLogger is the parent of a child logger created via createLogger', () => {
    const child = createLogger('child-test');
    // pino child loggers share the same underlying transport as their parent
    // We verify that child.level reflects the root level (not detached)
    expect(child.level).toBe(rootLogger.level);
  });
});

// ---------------------------------------------------------------------------
// Log level configuration
// ---------------------------------------------------------------------------

describe('log level configuration', () => {
  it('root logger has a defined level string', () => {
    expect(typeof rootLogger.level).toBe('string');
    expect(rootLogger.level.length).toBeGreaterThan(0);
  });

  it('root logger level is one of the pino valid levels', () => {
    const validLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];
    expect(validLevels).toContain(rootLogger.level);
  });

  it('child logger inherits level from root', () => {
    const child = createLogger('level-test');
    expect(child.level).toBe(rootLogger.level);
  });
});
