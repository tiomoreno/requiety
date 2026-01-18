// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { ScriptService } from './script.service';

describe('ScriptService', () => {
  it('should execute valid script and modify context', async () => {
    const script = `
      pm.environment.set('token', '123');
      pm.test('Status code is 200', function() {
          return true;
      });
    `;
    
    const context = {
      pm: {
        environment: {
          set: vi.fn(),
        },
        test: vi.fn(),
      }
    };

    await ScriptService.executeScript(script, context);
    
    expect(context.pm.environment.set).toHaveBeenCalledWith('token', '123');
    expect(context.pm.test).toHaveBeenCalled();
  });

  it('should handle empty script', async () => {
      const context = { foo: 'bar' };
      const result = await ScriptService.executeScript('', context);
      expect(result).toBe(context);
  });

  it('should prevent access to process/require', async () => {
      // Trying to access process should fail or be undefined in sandbox
      const script = `
        try {
            if (process) {
                pm.leak = 'leaked';
            }
        } catch(e) {
            // expected
        }
        
        if (typeof process === 'undefined') {
             pm.safe = true;
        }
      `;
      
      const context: any = { pm: {} };
      await ScriptService.executeScript(script, context);
      expect(context.pm.safe).toBe(true);
      expect(context.pm.leak).toBeUndefined();
  });

  it('should handle syntax errors gracefully', async () => {
     const script = `var x = ;`; // Syntax error
     const context = {};
     
     await expect(ScriptService.executeScript(script, context)).rejects.toThrow();
  });
  
  // Timeout test might be flaky in CI/CD, but good for local
  it('should timeout for infinite loops', async () => {
      const script = `while(true) {}`;
      const context = {};

      // Default timeout is 1000ms
      await expect(ScriptService.executeScript(script, context, 100)).rejects.toThrow();
  });

  describe('Sandbox Security', () => {
    it('should block Function constructor', async () => {
      const script = `
        try {
          pm.result = (function(){}).constructor('return typeof process')();
        } catch(e) {
          pm.blocked = true;
          pm.error = e.message;
        }
        if (typeof Function === 'undefined') {
          pm.functionBlocked = true;
        }
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const context: any = { pm: {} };
      await ScriptService.executeScript(script, context);
      // Function should be undefined in the sandbox
      expect(context.pm.functionBlocked).toBe(true);
    });

    it('should block eval', async () => {
      const script = `
        pm.evalBlocked = typeof eval === 'undefined';
        if (typeof eval !== 'undefined') {
          try {
            pm.result = eval('1 + 1');
          } catch(e) {
            pm.blocked = true;
          }
        }
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const context: any = { pm: {} };
      await ScriptService.executeScript(script, context);
      expect(context.pm.evalBlocked).toBe(true);
    });

    it('should block globalThis and global', async () => {
      const script = `
        pm.globalThisBlocked = typeof globalThis === 'undefined';
        pm.globalBlocked = typeof global === 'undefined';
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const context: any = { pm: {} };
      await ScriptService.executeScript(script, context);
      expect(context.pm.globalThisBlocked).toBe(true);
      expect(context.pm.globalBlocked).toBe(true);
    });

    it('should block module and exports', async () => {
      const script = `
        pm.moduleBlocked = typeof module === 'undefined';
        pm.exportsBlocked = typeof exports === 'undefined';
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const context: any = { pm: {} };
      await ScriptService.executeScript(script, context);
      expect(context.pm.moduleBlocked).toBe(true);
      expect(context.pm.exportsBlocked).toBe(true);
    });

    it('should allow safe JSON operations', async () => {
      const script = `
        pm.parsed = JSON.parse('{"a": 1}');
        pm.stringified = JSON.stringify({ b: 2 });
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const context: any = { pm: {} };
      await ScriptService.executeScript(script, context);
      expect(context.pm.parsed).toEqual({ a: 1 });
      expect(context.pm.stringified).toBe('{"b":2}');
    });

    it('should allow safe console logging', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const script = `
        console.log('test message');
      `;

      const context = {};
      await ScriptService.executeScript(script, context);

      expect(logSpy).toHaveBeenCalledWith('[Script Log]', 'test message');
      logSpy.mockRestore();
    });

    it('should allow safe Math operations', async () => {
      const script = `
        pm.sqrt = Math.sqrt(16);
        pm.round = Math.round(4.5);
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const context: any = { pm: {} };
      await ScriptService.executeScript(script, context);
      expect(context.pm.sqrt).toBe(4);
      expect(context.pm.round).toBe(5);
    });

    it('should allow basic date operations', async () => {
      const script = `
        pm.dateType = typeof Date;
        pm.dateConstructable = new Date() instanceof Date;
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const context: any = { pm: {} };
      await ScriptService.executeScript(script, context);
      expect(context.pm.dateType).toBe('function');
      expect(context.pm.dateConstructable).toBe(true);
    });

    it('should provide restricted Object utilities', async () => {
      const script = `
        pm.keys = Object.keys({ a: 1, b: 2 });
        pm.values = Object.values({ a: 1, b: 2 });
        pm.entries = Object.entries({ a: 1 });
        pm.assigned = Object.assign({}, { x: 1 });
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const context: any = { pm: {} };
      await ScriptService.executeScript(script, context);
      expect(context.pm.keys).toEqual(['a', 'b']);
      expect(context.pm.values).toEqual([1, 2]);
      expect(context.pm.entries).toEqual([['a', 1]]);
      expect(context.pm.assigned).toEqual({ x: 1 });
    });

    it('should provide restricted Array utilities', async () => {
      const script = `
        pm.isArray = Array.isArray([1, 2, 3]);
        pm.from = Array.from('abc');
        pm.of = Array.of(1, 2, 3);
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const context: any = { pm: {} };
      await ScriptService.executeScript(script, context);
      expect(context.pm.isArray).toBe(true);
      expect(context.pm.from).toEqual(['a', 'b', 'c']);
      expect(context.pm.of).toEqual([1, 2, 3]);
    });
  });
});
