import { JSONPath } from 'jsonpath-plus';
import type { 
  Assertion, 
  AssertionResult, 
  Response, 
  TestResult
} from '../../shared/types';

export class AssertionService {
  /**
   * Run a list of assertions against a response
   */
  static async runAssertions(response: Response, assertions: Assertion[]): Promise<TestResult> {
    if (!assertions || assertions.length === 0) {
      return {
        passed: 0,
        failed: 0,
        total: 0,
        results: [],
      };
    }

    const enabledAssertions = assertions.filter(a => a.enabled);
    const results: AssertionResult[] = [];
    
    // Parse JSON body once if needed
    let jsonBody: any;
    try {
      if (response.body) {
        jsonBody = JSON.parse(response.body);
      }
    } catch (e) {
      // Body is not JSON, but that's okay unless an assertion needs it
    }

    for (const assertion of enabledAssertions) {
      results.push(this.evaluateAssertion(response, assertion, jsonBody));
    }

    const passed = results.filter(r => r.status === 'pass').length;
    
    return {
      passed,
      failed: results.length - passed,
      total: results.length,
      results,
    };
  }

  /**
   * Evaluate a single assertion
   */
  private static evaluateAssertion(response: Response, assertion: Assertion, jsonBody: any): AssertionResult {
    try {
      let actualValue: any;

      // 1. Get Actual Value
      switch (assertion.source) {
        case 'status':
          actualValue = response.statusCode;
          break;
        case 'header':
          if (!assertion.property) throw new Error('Header name is required');
          const header = response.headers.find(
            h => h.name.toLowerCase() === assertion.property!.toLowerCase()
          );
          actualValue = header ? header.value : null;
          break;
        case 'responseTime':
          actualValue = response.elapsedTime;
          break;
        case 'jsonBody':
          if (!jsonBody) throw new Error('Response body is not valid JSON');
          if (!assertion.property) throw new Error('JSON path is required');
          
          // Use jsonpath-plus to find value
          const result = JSONPath({
            path: assertion.property,
            json: jsonBody,
            wrap: false
          });
          actualValue = result;
          break;
        default:
          throw new Error(`Unknown assertion source: ${assertion.source}`);
      }

      // 2. Compare against Expected Value
      const passed = this.compareValues(actualValue, assertion.operator, assertion.value);

      return {
        assertionId: assertion.id,
        status: passed ? 'pass' : 'fail',
        actualValue,
        expectedValue: assertion.value
      };

    } catch (error: any) {
      return {
        assertionId: assertion.id,
        status: 'fail',
        error: error.message
      };
    }
  }

  /**
   * Compare values based on operator
   */
  private static compareValues(actual: any, operator: string, expected?: string): boolean {
    // Handle null/undefined checks first
    if (operator === 'exists') return actual !== undefined && actual !== null;
    if (operator === 'notExists') return actual === undefined || actual === null;
    if (operator === 'isNull') return actual === null;
    if (operator === 'isNotNull') return actual !== null;

    // Convert expected value if needed (naive implementation)
    // In a real app we might want strict types or specific "smart" casting
    let expectedVal: any = expected;

    // Try to treat expected as number if actual is number
    if (typeof actual === 'number' && expected !== undefined && !isNaN(Number(expected))) {
      expectedVal = Number(expected);
    }

    switch (operator) {
      case 'equals':
         // Loose equality to handle string/number diffs comfortably
        return actual == expectedVal; 
      case 'notEquals':
        return actual != expectedVal;
      case 'contains':
        if (typeof actual === 'string') return actual.includes(String(expectedVal));
        if (Array.isArray(actual)) return actual.includes(expectedVal);
        return false;
      case 'notContains':
        if (typeof actual === 'string') return !actual.includes(String(expectedVal));
        if (Array.isArray(actual)) return !actual.includes(expectedVal);
        return true;
      case 'greaterThan':
        return actual > expectedVal;
      case 'lessThan':
        return actual < expectedVal;
      default:
        return false;
    }
  }
}
