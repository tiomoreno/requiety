import { getSettings } from './models';

/**
 * Run all database migrations
 */
export const runMigrations = async (): Promise<void> => {
  console.log('Running database migrations...');
  
  // Ensure default settings exist
  await getSettings();
  
  console.log('Database migrations completed');
};
