import { LoggerService } from '../services/logger.service';
import { getSettings } from './models';

/**
 * Run all database migrations
 */
export const runMigrations = async (): Promise<void> => {
  LoggerService.debug('Running database migrations...');

  // Ensure default settings exist
  await getSettings();

  LoggerService.debug('Database migrations completed');
};
