/**
 * Simple logger for the renderer process.
 * Wraps console methods for consistency and potential future extension
 * (e.g., sending logs to main process via IPC).
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug('[Requiety]', ...args);
    }
  },

  info: (...args: unknown[]) => {
    console.info('[Requiety]', ...args);
  },

  warn: (...args: unknown[]) => {
    console.warn('[Requiety]', ...args);
  },

  error: (...args: unknown[]) => {
    console.error('[Requiety]', ...args);
  },
};

export default logger;
