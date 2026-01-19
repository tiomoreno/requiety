import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

// For Electron apps, we use synchronous logging to avoid worker thread issues
// with bundled applications. Pino's transport system uses workers which don't
// work correctly when the app is bundled with Vite/Webpack.
const destination = pino.destination({ sync: true });

export const logger = pino(
  {
    level: isDev ? 'debug' : 'info',
    base: undefined, // Don't add pid/hostname to logs
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  destination
);

// Helper for consistency
export class LoggerService {
  static info(message: string, ...args: unknown[]) {
    logger.info(message, ...args);
  }

  static error(message: string, ...args: unknown[]) {
    logger.error(message, ...args);
  }

  static warn(message: string, ...args: unknown[]) {
    logger.warn(message, ...args);
  }

  static debug(message: string, ...args: unknown[]) {
    logger.debug(message, ...args);
  }
}
