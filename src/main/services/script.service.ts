import { createContext, runInContext } from 'node:vm';
import { LoggerService } from './logger.service';

const DEFAULT_TIMEOUT_MS = 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SandboxContext = Record<string, any>;

export class ScriptService {
  static async executeScript<T extends SandboxContext>(
    script: string,
    context: T,
    timeout: number = DEFAULT_TIMEOUT_MS
  ): Promise<T> {
    if (!script) {
      return context;
    }

    // Create a safe sandbox with only allowed globals
    const sandbox: SandboxContext = {
      ...context,
      // Safe built-ins
      JSON: JSON,
      Math: Math,
      Date: Date,
      Object: {
        keys: Object.keys,
        values: Object.values,
        entries: Object.entries,
        assign: Object.assign,
        freeze: Object.freeze,
        seal: Object.seal,
        create: Object.create,
        fromEntries: Object.fromEntries,
        hasOwn: Object.hasOwn,
      },
      Array: {
        isArray: Array.isArray,
        from: Array.from,
        of: Array.of,
      },
      // Wrapped console that prefixes output and uses LoggerService
      console: {
        log: (...args: unknown[]) => LoggerService.info('[Script]', ...args),
        warn: (...args: unknown[]) => LoggerService.warn('[Script]', ...args),
        error: (...args: unknown[]) => LoggerService.error('[Script]', ...args),
        info: (...args: unknown[]) => LoggerService.info('[Script]', ...args),
      },
      // String utilities
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURI,
      decodeURI,
      encodeURIComponent,
      decodeURIComponent,
      // Blocked - explicitly set to undefined
      process: undefined,
      require: undefined,
      module: undefined,
      exports: undefined,
      global: undefined,
      globalThis: undefined,
      Function: undefined,
      eval: undefined,
      Proxy: undefined,
      Reflect: undefined,
    };

    const vmContext = createContext(sandbox);

    try {
      runInContext(script, vmContext, {
        timeout,
        displayErrors: true,
      });

      // Copy back any modifications to the original context
      for (const key of Object.keys(context)) {
        if (key in sandbox) {
          context[key] = sandbox[key];
        }
      }

      return context;
    } catch (error) {
      LoggerService.error('Error executing script:', error);
      throw new Error(`Script execution failed: ${(error as Error).message}`);
    }
  }
}
