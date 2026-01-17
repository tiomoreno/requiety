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
});
