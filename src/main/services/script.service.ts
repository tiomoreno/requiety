import vm from 'node:vm';

export class ScriptService {
  /**
   * Executes a script within a sandboxed environment.
   * @param script The JavaScript code to execute.
   * @param context The context object accessible to the script (e.g. { pm: ... })
   * @param timeout Timeout in milliseconds (default: 1000ms)
   * @returns The modified context.
   */
  static async executeScript(script: string, context: Record<string, any>, timeout = 1000): Promise<Record<string, any>> {
    if (!script || !script.trim()) {
      return context;
    }

    try {
      const sandbox = {
        ...context,
        console: {
          log: (...args: any[]) => console.log('[Script Log]', ...args),
          error: (...args: any[]) => console.error('[Script Error]', ...args),
          info: (...args: any[]) => console.info('[Script Info]', ...args),
          warn: (...args: any[]) => console.warn('[Script Warn]', ...args),
        },
        JSON,
        setTimeout, // Warning: async operations in VM might be tricky if process exits
        clearTimeout,
        // Block dangerous globals
        process: undefined,
        require: undefined,
      };

      vm.createContext(sandbox);
      
      const scriptToRun = new vm.Script(script);
      
      scriptToRun.runInContext(sandbox, {
        timeout,
        displayErrors: true,
      });

      return sandbox;
    } catch (error) {
      console.error('Script execution error:', error);
      throw error;
    }
  }
}
