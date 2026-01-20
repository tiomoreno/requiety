import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Get the application data directory path
 */
export const getAppDataPath = (): string => {
  return app.getPath('userData');
};

/**
 * Get the responses directory path
 */
export const getResponsesPath = (): string => {
  return path.join(getAppDataPath(), 'data', 'responses');
};

/**
 * Get the backups directory path
 */
export const getBackupsPath = (): string => {
  return path.join(getAppDataPath(), 'data', 'backups');
};

/**
 * Initialize application directories
 */
export const initializeDirectories = async (): Promise<void> => {
  const directories = [path.join(getAppDataPath(), 'data'), getResponsesPath(), getBackupsPath()];

  for (const dir of directories) {
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
  }
};

/**
 * Save response body to file
 */
export const saveResponseBody = async (responseId: string, body: string): Promise<string> => {
  const filePath = path.join(getResponsesPath(), `${responseId}.txt`);
  await fs.writeFile(filePath, body, 'utf-8');
  return filePath;
};

/**
 * Read response body from file
 */
export const readResponseBody = async (filePath: string): Promise<string> => {
  return await fs.readFile(filePath, 'utf-8');
};

/**
 * Delete response body file
 */
export const deleteResponseBody = async (filePath: string): Promise<void> => {
  if (existsSync(filePath)) {
    await fs.unlink(filePath);
  }
};

/**
 * Delete all response bodies for a request
 */
export const deleteRequestResponses = async (responsePaths: string[]): Promise<void> => {
  await Promise.all(responsePaths.map((filePath) => deleteResponseBody(filePath)));
};
