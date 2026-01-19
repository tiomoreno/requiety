import React from 'react';
import type { TestResult, Assertion } from '@shared/types';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import './TestResultsPanel.css';

interface TestResultsPanelProps {
  testResult: TestResult;
  assertions: Assertion[];
}

export const TestResultsPanel: React.FC<TestResultsPanelProps> = ({ testResult, assertions }) => {
  if (!testResult) {
    return <div className="test-results-panel empty">No tests were run for this request.</div>;
  }

  const { passed, failed, total, results } = testResult;

  const getAssertionText = (assertionId: string) => {
    const assertion = assertions.find((a) => a.id === assertionId);
    if (!assertion) return 'Unknown Assertion';
    return `${assertion.source} ${assertion.property || ''} ${assertion.operator} ${assertion.value || ''}`;
  };

  return (
    <div className="test-results-panel">
      <div className="summary">
        <span className={`summary-item pass ${passed > 0 ? 'active' : ''}`}>
          <FaCheckCircle /> {passed} Passed
        </span>
        <span className={`summary-item fail ${failed > 0 ? 'active' : ''}`}>
          <FaTimesCircle /> {failed} Failed
        </span>
        <span className="summary-item total">Total: {total}</span>
      </div>
      <div className="results-list">
        {results.map((result) => (
          <div key={result.assertionId} className={`result-item ${result.status}`}>
            <div className="status-icon">
              {result.status === 'pass' ? <FaCheckCircle /> : <FaTimesCircle />}
            </div>
            <div className="details">
              <span className="assertion-description">{getAssertionText(result.assertionId)}</span>
              <span className="message">
                {result.status === 'fail'
                  ? `Expected ${JSON.stringify(result.expectedValue)}, but got ${JSON.stringify(result.actualValue)}`
                  : `Received ${JSON.stringify(result.actualValue)}`}
              </span>
              {result.error && <span className="error">Error: {result.error}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
