import express from 'express';
import { Server } from 'http';
import { getMockRoutesByWorkspace } from '../database/models';
import { HttpMethod } from '@shared/types';
import { LoggerService } from './logger.service';

interface MockLog {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
}

class MockServerService {
  private static instance: MockServerService;
  private server: Server | null = null;
  private app: express.Express | null = null;
  private logs: MockLog[] = [];
  private port: number = 3030; // Default port

  private constructor() {}

  public static getInstance(): MockServerService {
    if (!MockServerService.instance) {
      MockServerService.instance = new MockServerService();
    }
    return MockServerService.instance;
  }

  public getStatus() {
    return {
      isRunning: !!this.server,
      port: this.port,
    };
  }

  public getLogs(): MockLog[] {
    return this.logs;
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public async start(workspaceId: string, port: number = 3030): Promise<void> {
    if (this.server) {
      await this.stop();
    }

    this.port = port;
    this.app = express();
    this.app.use(express.json());
    this.app.use(express.text());
    this.app.use(express.urlencoded({ extended: true }));

    // Logger middleware
    this.app.use((req, res, next) => {
      const log: MockLog = {
        id: `log_${Date.now()}`,
        timestamp: Date.now(),
        method: req.method,
        path: req.path,
        headers: req.headers,
      };
      this.logs.unshift(log); // Add to the beginning
      if (this.logs.length > 100) {
        // Keep last 100 logs
        this.logs.pop();
      }
      next();
    });

    const routes = await getMockRoutesByWorkspace(workspaceId);

    for (const route of routes) {
      if (route.enabled) {
        const method = route.method.toLowerCase() as keyof express.Application;
        if (this.app[method]) {
          this.app[method](route.path, (req, res) => {
            try {
              // Try to parse as JSON, otherwise send as text
              const body = JSON.parse(route.body);
              res.status(route.statusCode).json(body);
            } catch (e) {
              res.status(route.statusCode).send(route.body);
            }
          });
        }
      }
    }

    // Fallback for any unmatched routes
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Mock route not found',
        path: req.path,
        method: req.method,
      });
    });

    return new Promise((resolve, reject) => {
      try {
        this.server = this.app!.listen(this.port, () => {
          LoggerService.info(`Mock server started on port ${this.port}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          this.app = null;
          LoggerService.info('Mock server stopped.');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export const mockService = MockServerService.getInstance();
