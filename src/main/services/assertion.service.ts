import { JSONPath } from 'jsonpath-plus';
import type { Assertion, AssertionResult, TestResult, Response, JSONValue } from '@shared/types';

const evaluateAssertion = (
  response: {
    statusCode: number;
    headers: { name: string; value: string }[];
    body: JSONValue | undefined; // Parsed JSON body
    elapsedTime: number;
  },
  assertion: Assertion
): AssertionResult => {
  const result: Partial<AssertionResult> = {
    assertionId: assertion.id,
    status: 'fail',
  };

  try {
    let actualValue: JSONValue | undefined;

    switch (assertion.source) {
      case 'status':
        actualValue = response.statusCode;
        result.actualValue = actualValue;
        result.expectedValue = Number(assertion.value);
        break;
      case 'header': {
        const header = response.headers.find(
          (h) => h.name.toLowerCase() === assertion.property?.toLowerCase()
        );
        actualValue = header?.value;
        result.actualValue = actualValue;
        result.expectedValue = assertion.value;
        break;
      }
      case 'jsonBody': {
        if (!assertion.property) {
          throw new Error('JSONPath property is required for jsonBody assertions.');
        }
        // JSONPath library might return any, we assume it matches our JSONValue structure
        const matches = JSONPath({ path: assertion.property, json: response.body as object });
        actualValue = matches.length > 0 ? matches[0] : undefined;
        result.actualValue = actualValue;
        result.expectedValue = assertion.value;
        break;
      }
      case 'responseTime':
        actualValue = response.elapsedTime;
        result.actualValue = actualValue;
        result.expectedValue = Number(assertion.value);
        break;
      default:
        throw new Error(`Unsupported assertion source: ${assertion.source}`);
    }

    switch (assertion.operator) {
      case 'equals':
        // eslint-disable-next-line eqeqeq
        if (actualValue == result.expectedValue) result.status = 'pass';
        break;
      case 'notEquals':
        // eslint-disable-next-line eqeqeq
        if (actualValue != result.expectedValue) result.status = 'pass';
        break;
      case 'contains':
        if (typeof actualValue === 'string' && typeof assertion.value === 'string') {
          if (actualValue.includes(assertion.value)) result.status = 'pass';
        }
        break;
      case 'notContains':
        if (typeof actualValue === 'string' && typeof assertion.value === 'string') {
          if (!actualValue.includes(assertion.value)) result.status = 'pass';
        }
        break;
      case 'greaterThan':
        if (Number(actualValue) > Number(assertion.value)) result.status = 'pass';
        break;
      case 'lessThan':
        if (Number(actualValue) < Number(assertion.value)) result.status = 'pass';
        break;
      case 'exists':
        if (actualValue !== undefined) result.status = 'pass';
        break;
      case 'notExists':
        if (actualValue === undefined) result.status = 'pass';
        break;
      case 'isNull':
        if (actualValue === null) result.status = 'pass';
        break;
      case 'isNotNull':
        if (actualValue !== null) result.status = 'pass';
        break;
      default:
        throw new Error(`Unsupported operator: ${assertion.operator}`);
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result as AssertionResult;
};

export const runAssertions = (
  assertions: Assertion[],
  response: Response,
  responseBody: string
): TestResult => {
  let parsedBody: JSONValue | undefined;
  try {
    parsedBody = JSON.parse(responseBody);
  } catch (e) {
    parsedBody = undefined;
  }

  const responseData = {
    statusCode: response.statusCode,
    headers: response.headers,
    body: parsedBody,
    elapsedTime: response.elapsedTime,
  };

  const enabledAssertions = assertions.filter((a) => a.enabled);

  const results: AssertionResult[] = enabledAssertions.map((assertion) =>
    evaluateAssertion(responseData, assertion)
  );

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.length - passed;

  return {
    passed,
    failed,
    total: results.length,
    results,
  };
};
