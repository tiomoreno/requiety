import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Assertion, AssertionSource, AssertionOperator } from '../../../shared/types';
import { Button } from '../../common/Button';
import { Input } from '../../common/Input';
import { FaTrash } from 'react-icons/fa';
import './AssertionsEditor.css';

interface AssertionsEditorProps {
  assertions: Assertion[];
  onChange: (assertions: Assertion[]) => void;
}

const assertionSources: AssertionSource[] = ['status', 'header', 'jsonBody', 'responseTime'];
const assertionOperators: AssertionOperator[] = [
  'equals', 'notEquals', 'contains', 'notContains', 'greaterThan', 'lessThan',
  'exists', 'notExists', 'isNull', 'isNotNull'
];

export const AssertionsEditor: React.FC<AssertionsEditorProps> = ({ assertions, onChange }) => {
  const handleAddAssertion = () => {
    const newAssertion: Assertion = {
      id: uuidv4(),
      source: 'status',
      operator: 'equals',
      value: '200',
      enabled: true,
    };
    onChange([...assertions, newAssertion]);
  };

  const handleUpdateAssertion = (id: string, updatedAssertion: Partial<Assertion>) => {
    const updatedAssertions = assertions.map(a =>
      a.id === id ? { ...a, ...updatedAssertion } : a
    );
    onChange(updatedAssertions);
  };

  const handleDeleteAssertion = (id: string) => {
    const updatedAssertions = assertions.filter(a => a.id !== id);
    onChange(updatedAssertions);
  };

  return (
    <div className="assertions-editor">
      <div className="editor-header">
        <span>Assertions</span>
        <Button onClick={handleAddAssertion} variant="primary">
          Add Assertion
        </Button>
      </div>
      <div className="assertions-list">
        {assertions.map((assertion) => (
          <div key={assertion.id} className="assertion-row">
            <Input
              type="checkbox"
              checked={assertion.enabled}
              onChange={(e) => handleUpdateAssertion(assertion.id, { enabled: e.target.checked })}
            />
            <select
              value={assertion.source}
              onChange={(e) => handleUpdateAssertion(assertion.id, { source: e.target.value as AssertionSource })}
            >
              {assertionSources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {['header', 'jsonBody'].includes(assertion.source) && (
              <Input
                placeholder="Property (e.g. Content-Type or $.data.id)"
                value={assertion.property || ''}
                onChange={(e) => handleUpdateAssertion(assertion.id, { property: e.target.value })}
              />
            )}
            <select
              value={assertion.operator}
              onChange={(e) => handleUpdateAssertion(assertion.id, { operator: e.target.value as AssertionOperator })}
            >
              {assertionOperators.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <Input
              placeholder="Expected Value"
              value={assertion.value || ''}
              onChange={(e) => handleUpdateAssertion(assertion.id, { value: e.target.value })}
            />
            <Button onClick={() => handleDeleteAssertion(assertion.id)} variant="danger" size="sm">
              <FaTrash />
            </Button>
          </div>
        ))}
        {assertions.length === 0 && (
          <div className="empty-state">
            No assertions defined. Add one to get started.
          </div>
        )}
      </div>
    </div>
  );
};