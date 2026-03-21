/**
 * Minimal frontend logger wrapper.
 * Centralises console calls so ESLint no-console is satisfied and future
 * silencing (e.g. test environments) only needs one change here.
 */
const logger = {
  // eslint-disable-next-line no-console
  warn: (...args: unknown[]) => console.warn(...args),
  // eslint-disable-next-line no-console
  error: (...args: unknown[]) => console.error(...args),
  // eslint-disable-next-line no-console
  info: (...args: unknown[]) => console.info(...args),
};

export default logger;
