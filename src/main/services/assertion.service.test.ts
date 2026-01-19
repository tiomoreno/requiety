import { describe, it, expect } from 'vitest';
import { runAssertions } from './assertion.service';
import { Response, Assertion } from '@shared/types';

describe('AssertionService', () => {
  const mockResponse: Response = {
    _id: 'res_1',
    type: 'Response',
    requestId: 'req_1',
    created: Date.now(),
    modified: Date.now(),
    statusCode: 200,
    statusMessage: 'OK',
    headers: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'X-Custom-Header', value: '123' },
    ],
    elapsedTime: 150,
    body: JSON.stringify({
      user: {
        id: 1,
        name: 'John Doe',
        roles: ['admin', 'user'],
      },
      status: 'active',
    }),
    bodyPath: '',
  };

  describe('runAssertions', () => {
    it('should return empty results if no assertions provided', () => {
      const result = runAssertions([], mockResponse, mockResponse.body || '');
      expect(result.total).toBe(0);
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should ignore disabled assertions', () => {
      const assertions: Assertion[] = [
        {
          id: '1',
          source: 'status',
          operator: 'equals',
          value: '200',
          enabled: false,
        },
      ];
      const result = runAssertions(assertions, mockResponse, mockResponse.body || '');
      expect(result.total).toBe(0);
    });

    describe('Status Code Assertions', () => {
      it('should pass checks for correct status code', () => {
        const assertions: Assertion[] = [
          { id: '1', source: 'status', operator: 'equals', value: '200', enabled: true },
          { id: '2', source: 'status', operator: 'lessThan', value: '300', enabled: true },
        ];
        const result = runAssertions(assertions, mockResponse, mockResponse.body || '');
        expect(result.passed).toBe(2);
        expect(result.failed).toBe(0);
      });

      it('should fail checks for incorrect status code', () => {
        const assertions: Assertion[] = [
          { id: '1', source: 'status', operator: 'equals', value: '404', enabled: true },
        ];
        const result = runAssertions(assertions, mockResponse, mockResponse.body || '');
        expect(result.passed).toBe(0);
        expect(result.failed).toBe(1);
        expect(result.results[0].status).toBe('fail');
        expect(result.results[0].actualValue).toBe(200);
      });
    });

    describe('Header Assertions', () => {
      it('should verify header existence and value', () => {
        const assertions: Assertion[] = [
          {
            id: '1',
            source: 'header',
            property: 'Content-Type',
            operator: 'contains',
            value: 'json',
            enabled: true,
          },
          {
            id: '2',
            source: 'header',
            property: 'X-Custom-Header',
            operator: 'equals',
            value: '123',
            enabled: true,
          },
        ];
        const result = runAssertions(assertions, mockResponse, mockResponse.body || '');
        expect(result.passed).toBe(2);
      });

      it('should handle missing headers gracefully', () => {
        const assertions: Assertion[] = [
          {
            id: '1',
            source: 'header',
            property: 'X-Non-Existent',
            operator: 'exists',
            enabled: true,
          },
        ];
        const result = runAssertions(assertions, mockResponse, mockResponse.body || '');
        expect(result.failed).toBe(1);
        expect(result.results[0].actualValue).toBeUndefined();
      });
    });

    describe('Response Time Assertions', () => {
      it('should verify response time', () => {
        const assertions: Assertion[] = [
          { id: '1', source: 'responseTime', operator: 'lessThan', value: '200', enabled: true },
        ];
        const result = runAssertions(assertions, mockResponse, mockResponse.body || '');
        expect(result.passed).toBe(1);
      });
    });

    describe('JSON Body Assertions', () => {
      it('should verify nested json properties', () => {
        const assertions: Assertion[] = [
          {
            id: '1',
            source: 'jsonBody',
            property: '$.user.name',
            operator: 'equals',
            value: 'John Doe',
            enabled: true,
          },
          {
            id: '2',
            source: 'jsonBody',
            property: '$.user.roles[0]',
            operator: 'equals',
            value: 'admin',
            enabled: true,
          },
        ];
        const result = runAssertions(assertions, mockResponse, mockResponse.body || '');
        expect(result.passed).toBe(2);
      });

      it('should handle non-json bodies gracefully', () => {
        const textResponse: Response = { ...mockResponse, body: 'Not JSON' };
        const assertions: Assertion[] = [
          { id: '1', source: 'jsonBody', property: '$.foo', operator: 'exists', enabled: true },
        ];
        const result = runAssertions(assertions, textResponse, textResponse.body || '');
        expect(result.failed).toBe(1);
        // It catches JSON parse error or logic error and returns fail
        expect(result.results[0].status).toBe('fail');
      });

      it('should support array existence checks via jsonpath', () => {
        const assertions: Assertion[] = [
          {
            id: '1',
            source: 'jsonBody',
            property: '$.user.roles',
            operator: 'exists',
            enabled: true,
          },
        ];
        const result = runAssertions(assertions, mockResponse, mockResponse.body || '');
        expect(result.passed).toBe(1);
        // jsonpath-plus usually returns an array of matches or value.
        // Our implementation assigns result directly to actualValue.
        // Assertions verify existance based on != null.
      });
    });
  });
});
